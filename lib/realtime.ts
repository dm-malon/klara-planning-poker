"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeckId } from "./decks";
import type { Identity, Role } from "./identity";
import { chooseMeme, type Meme } from "./memes";
import { computeResult, type Outcome, type VoteMap } from "./stats";
import { toast } from "./toast";

/* ------------------------------------------------------------------ types */

export interface Participant {
  id: string;
  name: string;
  role: Role;
  /** Used for host election: longest-connected voter wins. */
  joinedAt: number;
  vote: string | null;
  /** Round the vote belongs to — votes from older rounds are ignored. */
  voteRound: string | null;
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

const EVENTS = ["state", "request-state"] as const;

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
  const ch = client.channel(`klara-poker:${roomId}`, {
    config: { presence: { key: myId }, broadcast: { self: false } },
  });
  let subscribed = false;
  let pending: Participant | null = null;

  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState<Participant>();
    // A client id can have several metas (two tabs); the latest one wins.
    h.onSync(Object.values(state).map((metas) => metas[metas.length - 1]));
  });
  for (const event of EVENTS) {
    ch.on("broadcast", { event }, ({ payload }) => h.onMessage(event, payload));
  }
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      subscribed = true;
      h.onStatus("online");
      if (pending) void ch.track(pending);
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      h.onStatus("error");
    }
  });

  return {
    track(p) {
      pending = p;
      if (subscribed) void ch.track(p);
    },
    send(event, payload) {
      if (subscribed) void ch.send({ type: "broadcast", event, payload });
    },
    close() {
      subscribed = false;
      void client.removeChannel(ch);
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

function readVote(roomId: string): {
  vote: string | null;
  voteRound: string | null;
} {
  if (typeof window === "undefined") return { vote: null, voteRound: null };
  try {
    const raw = sessionStorage.getItem(`klara.vote.${roomId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { vote: null, voteRound: null };
}

function writeVote(
  roomId: string,
  vote: string | null,
  voteRound: string | null,
) {
  try {
    sessionStorage.setItem(
      `klara.vote.${roomId}`,
      JSON.stringify({ vote, voteRound }),
    );
  } catch {
    /* ignore */
  }
}

const HOST_GRACE_MS = 3500;
const LEAVE_TOAST_DELAY_MS = 2500;

/* ------------------------------------------------------------------- hook */

export function useRoom(roomId: string, identity: Identity | null) {
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [state, setState] = useState<RoomState | null>(null);
  const [ballot, setBallot] = useState(() => readVote(roomId));
  const [joinedAt] = useState(() =>
    sessionNumber(`klara.joined.${roomId}`, () => Date.now()),
  );

  const transport = useRef<Transport | null>(null);
  const stateRef = useRef<RoomState | null>(null);
  const participantsRef = useRef<Participant[]>([]);
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
            joinedAt,
            vote: identity.role === "voter" ? ballot.vote : null,
            voteRound: ballot.voteRound,
          }
        : null,
    [identity, joinedAt, ballot],
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

    const handlers: TransportHandlers = {
      onStatus(s) {
        setStatus(s);
        if (s === "online") t.send("request-state", { from: myId });
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
        setParticipants(list);

        // Late joiners get the full current state from the host.
        const s = stateRef.current;
        if (fresh.length && s && s.hostId === myId) t.send("state", s);
      },
      onMessage(event, payload) {
        if (event === "state") {
          applyState(payload as RoomState);
        } else if (event === "request-state") {
          const s = stateRef.current;
          if (!s) return;
          const hostHere = participantsRef.current.some(
            (p) => p.id === s.hostId,
          );
          if (s.hostId === myId) t.send("state", s);
          else if (!hostHere)
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
    if (meRef.current) t.track(meRef.current);

    // Nobody answered with state → this is a fresh room; whoever is first becomes host.
    const bootstrap = (force: boolean) => {
      if (stateRef.current) return;
      const others = participantsRef.current.filter((p) => p.id !== myId);
      if (!force && others.length) return;
      applyState(initialState(myId));
    };
    const b1 = setTimeout(() => bootstrap(false), 1500);
    const b2 = setTimeout(() => bootstrap(true), 4500);

    return () => {
      clearTimeout(b1);
      clearTimeout(b2);
      leaveTimers.forEach(clearTimeout);
      t.close();
      transport.current = null;
      participantsRef.current = [];
      setParticipants([]);
      setStatus("connecting");
    };
  }, [connected, myId, roomId, applyState]);

  // Publish presence whenever my record changes.
  useEffect(() => {
    meRef.current = me;
    if (me) transport.current?.track(me);
  }, [me]);

  useEffect(
    () => writeVote(roomId, ballot.vote, ballot.voteRound),
    [roomId, ballot],
  );

  // Host left: after a grace period (refreshes), the longest-connected voter takes over.
  const hostPresent =
    !!state && participants.some((p) => p.id === state.hostId);
  useEffect(() => {
    if (!state || hostPresent || participants.length === 0) return;
    const timer = setTimeout(() => {
      const s = stateRef.current;
      const list = participantsRef.current;
      if (!s || list.some((p) => p.id === s.hostId)) return;
      if (electHost(list) === myId) commit(() => ({ hostId: myId! }));
    }, HOST_GRACE_MS);
    return () => clearTimeout(timer);
  }, [hostPresent, participants, state, myId, commit]);

  const isHost = !!state && state.hostId === myId;

  /* -------------------------------------------------------------- actions */

  const currentVotes = useCallback((): {
    votes: VoteMap;
    names: Record<string, string>;
  } => {
    const s = stateRef.current!;
    const votes: VoteMap = {};
    const names: Record<string, string> = {};
    for (const p of participantsRef.current) {
      if (p.role === "voter" && p.vote && p.voteRound === s.roundId) {
        votes[p.id] = p.vote;
        names[p.id] = p.name;
      }
    }
    return { votes, names };
  }, []);

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
    (id: string) => commit(() => ({ hostId: id })),
    [commit],
  );

  const vote = useCallback(
    (value: string | null) => {
      const s = stateRef.current;
      if (!s || s.revealed || identity?.role !== "voter") return;
      setBallot({ vote: value, voteRound: value ? s.roundId : null });
    },
    [identity?.role],
  );

  /** Switching to spectator takes your card off the table for good. */
  const withdraw = useCallback(
    () => setBallot({ vote: null, voteRound: null }),
    [],
  );

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
    },
  };
}

export type RoomApi = ReturnType<typeof useRoom>;
