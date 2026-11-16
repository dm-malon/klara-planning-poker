"use client";

import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeckId } from "./decks";
import { createRateLimiter, parseFx, type Fx } from "./fx";
import type { Identity, Role } from "./identity";
import { chooseMeme, type Meme } from "./memes";
import { computeResult, type Outcome, type VoteMap } from "./stats";
import { toast } from "./toast";

/* ------------------------------------------------------------------ types */

export interface Participant {
  id: string;
  name: string;
  role: Role;
  /** Emoji avatar; null (or missing, from older clients) means initials. */
  icon?: string | null;
  /** Used for host election: longest-connected voter wins. */
  joinedAt: number;
  vote: string | null;
  /** Round the vote belongs to — votes from older rounds are ignored. */
  voteRound: string | null;
  /** When the vote was cast; the newest vote seen wins. Votes travel by the
   *  `vote` broadcast, not presence (presence is heavily rate-limited). */
  voteAt?: number;
}

/** A vote as carried by the `vote` broadcast (presence alone lags by seconds). */
interface Ballot {
  vote: string | null;
  voteRound: string | null;
  voteAt: number;
}

export interface HistoryEntry {
  roundId: string;
  deck: DeckId;
  voteCount: number;
  average: number | null;
  suggested: string | null;
  days: number | null;
  outcome: Outcome;
  at: number;
}

/** Room state is owned by the host and broadcast to everyone; no database. */
export interface RoomState {
  version: number;
  updatedAt: number;
  hostId: string;
  /**
   * The room's "home" host: set on creation and on hand-over, untouched by
   * election. When they come back (e.g. after a refresh) they get the crown back.
   * Missing on states from older clients.
   */
  ownerId?: string;
  roundId: string;
  deck: DeckId;
  revealed: boolean;
  autoReveal: boolean;
  memesOn: boolean;
  /** Snapshot of votes taken at reveal so leavers don't change the result. */
  votes: VoteMap | null;
  voterNames: Record<string, string> | null;
  meme: Meme | null;
  history: HistoryEntry[];
  shownGifIds: string[];
}

export type ConnStatus = "connecting" | "online" | "error";

/* -------------------------------------------------------------- transport */

interface TransportHandlers {
  onSync(list: Participant[]): void;
  onMessage(event: string, payload: unknown): void;
  onStatus(status: ConnStatus): void;
}

interface Transport {
  track(p: Participant): void;
  send(event: string, payload: unknown): void;
  close(): void;
}

const EVENTS = ["state", "request-state", "vote", "fx"] as const;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** "local" = no Supabase keys: rooms sync only between tabs of one browser. */
export const realtimeMode: "supabase" | "local" =
  SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "local";

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  supabase ??= createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return supabase;
}

function createSupabaseTransport(
  roomId: string,
  myId: string,
  h: TransportHandlers,
): Transport {
  const client = getSupabase();
  let ch: RealtimeChannel | null = null;
  let subscribed = false;
  let closed = false;
  let retry = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  // Supabase closes a channel outright after ~5 presence updates in a short
  // window ("Client presence rate limit exceeded"). So presence carries only
  // who's here (votes go by broadcast), unchanged records aren't re-sent, and
  // updates spend from a small budget that refills slowly.
  let pending: Participant | null = null;
  let sentKey = "";
  let tokens = TRACK_BURST;
  let lastRefill = Date.now();
  let trackTimer: ReturnType<typeof setTimeout> | null = null;

  const flushTrack = () => {
    trackTimer = null;
    if (!subscribed || !ch || !pending) return;
    const key = JSON.stringify(pending);
    if (key === sentKey) return;
    const now = Date.now();
    const refill = Math.floor((now - lastRefill) / TRACK_REFILL_MS);
    if (refill > 0) {
      tokens = Math.min(TRACK_BURST, tokens + refill);
      lastRefill += refill * TRACK_REFILL_MS;
    }
    if (tokens < 1) {
      trackTimer = setTimeout(
        flushTrack,
        lastRefill + TRACK_REFILL_MS - now + 50,
      );
      return;
    }
    tokens -= 1;
    sentKey = key;
    void ch.track(pending);
  };
  const scheduleTrack = () => {
    if (!trackTimer) trackTimer = setTimeout(flushTrack, 150);
  };

  const connect = () => {
    const channel = client.channel(`klara-poker:${roomId}`, {
      config: { presence: { key: myId }, broadcast: { self: false } },
    });
    ch = channel;
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Participant>();
      // A client id can have several metas (two tabs); the latest one wins.
      h.onSync(Object.values(state).map((metas) => metas[metas.length - 1]));
    });
    for (const event of EVENTS) {
      channel.on("broadcast", { event }, ({ payload }) =>
        h.onMessage(event, payload),
      );
    }
    channel.subscribe((status) => {
      if (closed || ch !== channel) return;
      if (status === "SUBSCRIBED") {
        subscribed = true;
        retry = 0;
        sentKey = "";
        h.onStatus("online");
        scheduleTrack();
        return;
      }
      // Errors, timeouts and server-side closes all mean the same: rejoin.
      // (A silently closed channel used to leave the tab frozen but "online".)
      subscribed = false;
      ch = null;
      h.onStatus(
        status === "CHANNEL_ERROR" || status === "TIMED_OUT"
          ? "error"
          : "connecting",
      );
      void client.removeChannel(channel);
      if (!retryTimer) {
        const wait = Math.min(1000 * 2 ** retry, 15000);
        retry += 1;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!closed) connect();
        }, wait);
      }
    });
  };
  connect();

  return {
    track(p) {
      pending = p;
      if (subscribed) scheduleTrack();
    },
    send(event, payload) {
      if (subscribed && ch)
        void ch.send({ type: "broadcast", event, payload });
    },
    close() {
      closed = true;
      subscribed = false;
      if (trackTimer) clearTimeout(trackTimer);
      if (retryTimer) clearTimeout(retryTimer);
      if (ch) void client.removeChannel(ch);
      ch = null;
    },
  };
}

type LocalMsg =
  | { t: "presence"; p: Participant; hello?: boolean }
  | { t: "bye"; id: string }
  | { t: "msg"; event: string; payload: unknown };

/** BroadcastChannel stand-in for Supabase, emulating presence with heartbeats. */
function createLocalTransport(
  roomId: string,
  myId: string,
  h: TransportHandlers,
): Transport {
  const bc = new BroadcastChannel(`klara-poker:${roomId}`);
  const peers = new Map<string, { p: Participant; seen: number }>();
  let me: Participant | null = null;
  let lastKey = "";

  const sync = () => {
    const list = [...peers.values()]
      .map((x) => x.p)
      .filter((p) => p.id !== myId);
    if (me) list.push(me);
    const key = JSON.stringify(
      [...list].sort((a, b) => a.id.localeCompare(b.id)),
    );
    if (key === lastKey) return;
    lastKey = key;
    h.onSync(list);
  };
  const post = (m: LocalMsg) => bc.postMessage(m);

  bc.onmessage = (e: MessageEvent<LocalMsg>) => {
    const m = e.data;
    if (m.t === "presence") {
      peers.set(m.p.id, { p: m.p, seen: Date.now() });
      if (m.hello && me) post({ t: "presence", p: me });
      sync();
    } else if (m.t === "bye") {
      peers.delete(m.id);
      sync();
    } else if (m.t === "msg") {
      h.onMessage(m.event, m.payload);
    }
  };

  const beat = setInterval(() => {
    if (me) post({ t: "presence", p: me });
    const now = Date.now();
    for (const [id, x] of peers) if (now - x.seen > 5000) peers.delete(id);
    sync();
  }, 1500);

  const bye = () => post({ t: "bye", id: myId });
  window.addEventListener("pagehide", bye);
  setTimeout(() => h.onStatus("online"), 0);

  return {
    track(p) {
      const first = !me;
      me = p;
      post({ t: "presence", p, hello: first });
      sync();
    },
    send(event, payload) {
      post({ t: "msg", event, payload });
    },
    close() {
      clearInterval(beat);
      window.removeEventListener("pagehide", bye);
      bye();
      bc.close();
    },
  };
}

/* ---------------------------------------------------------------- helpers */

function newRoundId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Total order over competing states so every client converges on the same one. */
function isNewer(a: RoomState, b: RoomState | null): boolean {
  if (!b) return true;
  if (a.version !== b.version) return a.version > b.version;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt;
  return a.hostId < b.hostId;
}

export function electHost(participants: Participant[]): string | null {
  const byAge = (a: Participant, b: Participant) =>
    a.joinedAt - b.joinedAt || a.id.localeCompare(b.id);
  const voters = participants.filter((p) => p.role === "voter").sort(byAge);
  if (voters.length) return voters[0].id;
  return [...participants].sort(byAge)[0]?.id ?? null;
}

function freshRound(): Partial<RoomState> {
  return {
    roundId: newRoundId(),
    revealed: false,
    votes: null,
    voterNames: null,
    meme: null,
  };
}

function initialState(hostId: string): RoomState {
  return {
    version: 0,
    updatedAt: Date.now(),
    hostId,
    ownerId: hostId,
    roundId: newRoundId(),
    deck: "story",
    revealed: false,
    autoReveal: false,
    memesOn: true,
    votes: null,
    voterNames: null,
    meme: null,
    history: [],
    shownGifIds: [],
  };
}

function sessionNumber(key: string, fallback: () => number): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = Number(sessionStorage.getItem(key));
    if (v) return v;
    const n = fallback();
    sessionStorage.setItem(key, String(n));
    return n;
  } catch {
    return fallback();
  }
}

const NO_BALLOT: Ballot = { vote: null, voteRound: null, voteAt: 0 };

function readVote(roomId: string): Ballot {
  if (typeof window === "undefined") return NO_BALLOT;
  try {
    const raw = sessionStorage.getItem(`klara.vote.${roomId}`);
    if (raw) return { ...NO_BALLOT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return NO_BALLOT;
}

function writeVote(roomId: string, ballot: Ballot) {
  try {
    sessionStorage.setItem(`klara.vote.${roomId}`, JSON.stringify(ballot));
  } catch {
    /* ignore */
  }
}

function parseVote(payload: unknown): (Ballot & { id: string }) | null {
  const v = payload as Partial<Ballot & { id: string }> | null;
  if (!v || typeof v.id !== "string" || typeof v.voteAt !== "number")
    return null;
  const str = (x: unknown) => (typeof x === "string" ? x.slice(0, 32) : null);
  return {
    id: v.id,
    vote: str(v.vote),
    voteRound: str(v.voteRound),
    voteAt: v.voteAt,
  };
}

/** My presence record without the ballot: votes travel by broadcast only. */
function presenceOf(me: Participant): Participant {
  return { ...me, vote: null, voteRound: null, voteAt: 0 };
}

/**
 * Presence with the freshest known votes on top: my own record is always
 * authoritative, and a broadcast vote beats a presence vote that's older.
 */
function mergeVotes(
  list: Participant[],
  overlay: Map<string, Ballot>,
  me: Participant | null,
): Participant[] {
  const merged = list.map((p) => {
    if (me && p.id === me.id) return { ...p, ...me };
    const b = overlay.get(p.id);
    if (!b || b.voteAt <= (p.voteAt ?? 0)) return p;
    return { ...p, ...b, vote: p.role === "voter" ? b.vote : null };
  });
  // My own presence echo can lag behind joining; show me right away.
  if (me && !merged.some((p) => p.id === me.id)) merged.push(me);
  return merged;
}

/** Long enough to cover a refresh: page load, reconnect, and presence lag. */
const HOST_GRACE_MS = 8000;
/** Presence update budget: a few at once, then one per refill period. */
const TRACK_BURST = 3;
const TRACK_REFILL_MS = 8000;
const CONNECT_TIMEOUT_MS = 12000;
const LEAVE_TOAST_DELAY_MS = 2500;

/* ------------------------------------------------------------------- hook */

export function useRoom(roomId: string, identity: Identity | null) {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [presence, setPresence] = useState<Participant[]>([]);
  const [overlay, setOverlay] = useState<Map<string, Ballot>>(
    () => new Map(),
  );
  const [state, setState] = useState<RoomState | null>(null);
  const [ballot, setBallot] = useState(() => readVote(roomId));
  const [joinedAt] = useState(() =>
    sessionNumber(`klara.joined.${roomId}`, () => Date.now()),
  );

  const transport = useRef<Transport | null>(null);
  const fxListeners = useRef(new Set<(fx: Fx) => void>());
  const [fxLimiter] = useState(() => createRateLimiter(8, 4000));
  const stateRef = useRef<RoomState | null>(null);
  /** Raw presence list; use `merged()` when votes matter. */
  const participantsRef = useRef<Participant[]>([]);
  const overlayRef = useRef(new Map<string, Ballot>());
  const meRef = useRef<Participant | null>(null);

  const myId = identity?.id ?? null;
  const connected = Boolean(identity?.name);

  // My presence record; spectators never carry a vote.
  const me = useMemo<Participant | null>(
    () =>
      identity?.name
        ? {
            id: identity.id,
            name: identity.name,
            role: identity.role,
            icon: identity.icon,
            joinedAt,
            vote: identity.role === "voter" ? ballot.vote : null,
            voteRound: ballot.voteRound,
            voteAt: ballot.voteAt,
          }
        : null,
    [identity, joinedAt, ballot],
  );

  const participants = useMemo(
    () => mergeVotes(presence, overlay, me),
    [presence, overlay, me],
  );
  const merged = useCallback(
    () =>
      mergeVotes(participantsRef.current, overlayRef.current, meRef.current),
    [],
  );

  const applyState = useCallback((incoming: RoomState) => {
    if (!isNewer(incoming, stateRef.current)) return;
    stateRef.current = incoming;
    setState(incoming);
  }, []);

  /** Host-only write: bump version, apply locally, broadcast. */
  const commit = useCallback((update: (s: RoomState) => Partial<RoomState>) => {
    const cur = stateRef.current;
    if (!cur) return;
    const next: RoomState = {
      ...cur,
      ...update(cur),
      version: cur.version + 1,
      updatedAt: Date.now(),
    };
    stateRef.current = next;
    setState(next);
    transport.current?.send("state", next);
  }, []);

  // Connect to the room channel.
  useEffect(() => {
    if (!connected || !myId) return;
    const leaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
    let known = new Map<string, string>();
    const quietUntil = Date.now() + 2000;

    // A paused or unreachable server often just hangs, so a slow connect counts as an error.
    // The transport keeps retrying; reaching "online" later clears it.
    let online = false;
    let bootTimers: ReturnType<typeof setTimeout>[] = [];
    const slowTimer = setTimeout(() => {
      if (!online) setStatus("error");
    }, CONNECT_TIMEOUT_MS);

    const handlers: TransportHandlers = {
      onStatus(s) {
        online = s === "online";
        setStatus(s);
        if (s !== "online") return;
        t.send("request-state", { from: myId });
        sendMyVote();
        // Only once connected: if nobody answers with state, this is a fresh room.
        // (Before, an unreachable server made us invent an empty offline room.)
        if (!bootTimers.length) {
          bootTimers = [
            setTimeout(() => bootstrap(false), 1500),
            setTimeout(() => bootstrap(true), 4500),
          ];
        }
      },
      onSync(list) {
        const ids = new Map(list.map((p) => [p.id, p.name]));
        const fresh = list.filter((p) => !known.has(p.id) && p.id !== myId);
        const gone = [...known].filter(([id]) => !ids.has(id) && id !== myId);
        const quiet = Date.now() < quietUntil;

        for (const p of fresh) {
          const pendingLeave = leaveTimers.get(p.id);
          if (pendingLeave) {
            // Quick reconnect (refresh) — not worth a pair of toasts.
            clearTimeout(pendingLeave);
            leaveTimers.delete(p.id);
          } else if (!quiet) {
            toast(`${p.name} joined`, "👋");
          }
        }
        for (const [id, name] of gone) {
          leaveTimers.set(
            id,
            setTimeout(() => {
              leaveTimers.delete(id);
              toast(`${name} left`, "🚪");
            }, LEAVE_TOAST_DELAY_MS),
          );
        }
        known = ids;

        participantsRef.current = list;
        setPresence(list);

        // Late joiners get the full current state from the host, and my vote from me.
        const s = stateRef.current;
        if (fresh.length && s && s.hostId === myId) t.send("state", s);
        if (fresh.length) sendMyVote();
      },
      onMessage(event, payload) {
        if (event === "fx") {
          const fx = parseFx(payload);
          if (fx) fxListeners.current.forEach((l) => l(fx));
        } else if (event === "vote") {
          const v = parseVote(payload);
          if (!v || v.id === myId) return;
          const prev = overlayRef.current.get(v.id);
          if (prev && prev.voteAt >= v.voteAt) return;
          const next = new Map(overlayRef.current);
          next.set(v.id, {
            vote: v.vote,
            voteRound: v.voteRound,
            voteAt: v.voteAt,
          });
          overlayRef.current = next;
          setOverlay(next);
        } else if (event === "state") {
          applyState(payload as RoomState);
        } else if (event === "request-state") {
          // Someone (re)joined: let them know my vote without waiting for presence.
          sendMyVote();
          const s = stateRef.current;
          if (!s) return;
          const from = (payload as { from?: unknown } | null)?.from;
          const hostHere = participantsRef.current.some(
            (p) => p.id === s.hostId,
          );
          // The host itself asking (it refreshed and lost its state) counts as
          // "no host": presence may still list its old connection.
          if (s.hostId === myId) t.send("state", s);
          else if (!hostHere || from === s.hostId)
            setTimeout(
              () => t.send("state", stateRef.current),
              Math.random() * 400,
            );
        }
      },
    };

    const t =
      realtimeMode === "supabase"
        ? createSupabaseTransport(roomId, myId, handlers)
        : createLocalTransport(roomId, myId, handlers);
    transport.current = t;
    if (meRef.current) t.track(presenceOf(meRef.current));

    // Votes go by broadcast only: presence is rate-limited and lags by seconds.
    function sendMyVote() {
      const m = meRef.current;
      if (m?.role === "voter" && m.voteAt)
        t.send("vote", {
          id: m.id,
          vote: m.vote,
          voteRound: m.voteRound,
          voteAt: m.voteAt,
        });
    }

    // Nobody answered with state → this is a fresh room; whoever is first becomes host.
    const bootstrap = (force: boolean) => {
      if (stateRef.current) return;
      const others = participantsRef.current.filter((p) => p.id !== myId);
      if (!force && others.length) return;
      applyState(initialState(myId));
    };

    return () => {
      clearTimeout(slowTimer);
      bootTimers.forEach(clearTimeout);
      leaveTimers.forEach(clearTimeout);
      t.close();
      transport.current = null;
      participantsRef.current = [];
      overlayRef.current = new Map();
      setPresence([]);
      setOverlay(new Map());
      setStatus("connecting");
    };
  }, [connected, myId, roomId, applyState]);

  // Publish presence whenever my record changes. Votes stay out of presence
  // (they go by broadcast), so voting never spends the presence rate limit.
  useEffect(() => {
    meRef.current = me;
    if (me) transport.current?.track(presenceOf(me));
  }, [me]);

  useEffect(() => writeVote(roomId, ballot), [roomId, ballot]);

  // Host left: after a grace period (refreshes), the longest-connected voter takes over.
  const hostPresent = !!state && presence.some((p) => p.id === state.hostId);
  useEffect(() => {
    if (!state || hostPresent || presence.length === 0) return;
    const timer = setTimeout(() => {
      const s = stateRef.current;
      const list = participantsRef.current;
      if (!s || list.some((p) => p.id === s.hostId)) return;
      if (electHost(list) === myId) commit(() => ({ hostId: myId! }));
    }, HOST_GRACE_MS);
    return () => clearTimeout(timer);
  }, [hostPresent, presence, state, myId, commit]);

  // The home host is back (refresh, reconnect): an elected stand-in hands the crown back.
  const ownerId = state?.ownerId;
  const ownerBack =
    !!state &&
    !!ownerId &&
    state.hostId === myId &&
    ownerId !== myId &&
    presence.some((p) => p.id === ownerId);
  useEffect(() => {
    if (!ownerBack || !ownerId) return;
    const timer = setTimeout(() => {
      const s = stateRef.current;
      if (
        s?.hostId === myId &&
        s.ownerId === ownerId &&
        participantsRef.current.some((p) => p.id === ownerId)
      )
        commit(() => ({ hostId: ownerId }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [ownerBack, ownerId, myId, commit]);

  const isHost = !!state && state.hostId === myId;

  /* -------------------------------------------------------------- actions */

  const currentVotes = useCallback((): {
    votes: VoteMap;
    names: Record<string, string>;
  } => {
    const s = stateRef.current!;
    const votes: VoteMap = {};
    const names: Record<string, string> = {};
    for (const p of merged()) {
      if (p.role === "voter" && p.vote && p.voteRound === s.roundId) {
        votes[p.id] = p.vote;
        names[p.id] = p.name;
      }
    }
    return { votes, names };
  }, [merged]);

  const reveal = useCallback(async () => {
    const s = stateRef.current;
    if (!s || s.revealed || s.hostId !== myId) return;
    const { votes, names } = currentVotes();
    const result = computeResult(s.deck, votes);
    const entry: HistoryEntry = {
      roundId: s.roundId,
      deck: s.deck,
      voteCount: result.count,
      average: result.average,
      suggested: result.suggested,
      days: result.days,
      outcome: result.outcome,
      at: Date.now(),
    };
    commit((cur) => ({
      revealed: true,
      votes,
      voterNames: names,
      meme: null,
      history: [entry, ...cur.history].slice(0, 50),
    }));

    if (!s.memesOn || result.count === 0) return;
    const meme = await chooseMeme(result.outcome, s.roundId, s.shownGifIds);
    const now = stateRef.current;
    if (
      !now ||
      now.roundId !== s.roundId ||
      !now.revealed ||
      now.hostId !== myId
    )
      return;
    commit((cur) => ({
      meme,
      shownGifIds:
        meme.kind === "gif"
          ? [...cur.shownGifIds, meme.id].slice(-200)
          : cur.shownGifIds,
    }));
  }, [commit, currentVotes, myId]);

  const newRound = useCallback(() => {
    commit(() => freshRound());
  }, [commit]);

  const setDeck = useCallback(
    (deck: DeckId) =>
      commit((s) => (s.deck === deck ? {} : { ...freshRound(), deck })),
    [commit],
  );

  const setAutoReveal = useCallback(
    (on: boolean) => commit(() => ({ autoReveal: on })),
    [commit],
  );
  const setMemesOn = useCallback(
    (on: boolean) => commit(() => ({ memesOn: on })),
    [commit],
  );
  const handOver = useCallback(
    (id: string) => commit(() => ({ hostId: id, ownerId: id })),
    [commit],
  );

  /** Fire a fun effect at the room; rate-limited, and echoed locally (broadcast skips self). */
  const sendFx = useCallback(
    (fx: DistributiveOmit<Fx, "id" | "from">): boolean => {
      if (!myId || !fxLimiter()) return false;
      const full = {
        ...fx,
        id: Math.random().toString(36).slice(2, 10),
        from: myId,
      } as Fx;
      transport.current?.send("fx", full);
      fxListeners.current.forEach((l) => l(full));
      return true;
    },
    [myId, fxLimiter],
  );

  const subscribeFx = useCallback((listener: (fx: Fx) => void) => {
    const set = fxListeners.current;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }, []);

  /** Set my ballot and broadcast it right away (presence follows, slower). */
  const cast = useCallback(
    (vote: string | null, voteRound: string | null) => {
      const next: Ballot = { vote, voteRound, voteAt: Date.now() };
      setBallot(next);
      if (myId) transport.current?.send("vote", { id: myId, ...next });
    },
    [myId],
  );

  const vote = useCallback(
    (value: string | null) => {
      const s = stateRef.current;
      if (!s || s.revealed || identity?.role !== "voter") return;
      cast(value, value ? s.roundId : null);
    },
    [identity?.role, cast],
  );

  /** Switching to spectator takes your card off the table for good. */
  const withdraw = useCallback(() => cast(null, null), [cast]);

  /* --------------------------------------------------------- derived data */

  const voters = useMemo(
    () =>
      participants
        .filter((p) => p.role === "voter")
        .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id)),
    [participants],
  );
  const spectators = useMemo(
    () =>
      participants
        .filter((p) => p.role === "spectator")
        .sort((a, b) => a.joinedAt - b.joinedAt),
    [participants],
  );
  const hasVoted = useCallback(
    (p: Participant) => !!state && p.voteRound === state.roundId && !!p.vote,
    [state],
  );
  const votedCount = voters.filter(hasVoted).length;

  // Auto-reveal once every voter has picked a card.
  useEffect(() => {
    if (!isHost || !state?.autoReveal || state.revealed) return;
    if (voters.length === 0 || votedCount < voters.length) return;
    const timer = setTimeout(() => void reveal(), 800);
    return () => clearTimeout(timer);
  }, [
    isHost,
    state?.autoReveal,
    state?.revealed,
    voters.length,
    votedCount,
    reveal,
  ]);

  const myVote = me && state && me.voteRound === state.roundId ? me.vote : null;

  return {
    status,
    state,
    me,
    myVote,
    isHost,
    participants,
    voters,
    spectators,
    votedCount,
    hasVoted,
    actions: {
      vote,
      withdraw,
      reveal,
      newRound,
      setDeck,
      setAutoReveal,
      setMemesOn,
      handOver,
      sendFx,
    },
    subscribeFx,
  };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type RoomApi = ReturnType<typeof useRoom>;
