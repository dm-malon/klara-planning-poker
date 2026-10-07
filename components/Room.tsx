"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DECKS } from "@/lib/decks";
import {
  loadIdentity,
  saveIdentity,
  type Identity,
  type Role,
} from "@/lib/identity";
import { realtimeMode, useRoom } from "@/lib/realtime";
import { computeResult } from "@/lib/stats";
import { toast } from "@/lib/toast";
import { CardHand, shortcutFor } from "./CardHand";
import { HistoryPanel } from "./HistoryPanel";
import { HostPanel } from "./HostPanel";
import { JoinModal } from "./JoinModal";
import { MemeCard } from "./MemeCard";
import { PokerTable } from "./PokerTable";
import { Results } from "./Results";
import { RoomHeader } from "./RoomHeader";

const perTab = realtimeMode === "local";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
  );
}

export function Room({ roomId }: { roomId: string }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [suggestedName, setSuggestedName] = useState("");
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Identity lives in browser storage, so it can only be read after mount.
  useEffect(() => {
    const loaded = loadIdentity(perTab);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage
    setIdentity(loaded.identity);
    setSuggestedName(loaded.suggestedName);
  }, []);

  const updateIdentity = useCallback((patch: Partial<Identity>) => {
    setIdentity((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      saveIdentity(next, perTab);
      return next;
    });
  }, []);

  const room = useRoom(roomId, identity);
  const { state, me, myVote, isHost, actions } = room;

  const result = useMemo(
    () =>
      state?.revealed && state.votes
        ? computeResult(state.deck, state.votes)
        : null,
    [state],
  );

  // Confetti on consensus — once per round, and only for fresh reveals.
  const confettiRound = useRef<string | null>(null);
  useEffect(() => {
    if (!state || !result || result.outcome !== "consensus") return;
    if (confettiRound.current === state.roundId) return;
    confettiRound.current = state.roundId;
    const revealedAt =
      state.history[0]?.roundId === state.roundId ? state.history[0].at : 0;
    if (Date.now() - revealedAt > 15000) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#4f46ff", "#8b5cf6", "#0ea5e9", "#10b981", "#f43f5e"];
    const t = setTimeout(() => {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 }, colors });
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors,
      });
    }, 700);
    return () => clearTimeout(t);
  }, [state, result]);

  // Announce host changes.
  const prevHost = useRef<string | null>(null);
  useEffect(() => {
    if (!state || !identity) return;
    const prev = prevHost.current;
    prevHost.current = state.hostId;
    if (!prev || prev === state.hostId) return;
    if (state.hostId === identity.id) toast("You're the host now", "👑");
    else {
      const name = room.participants.find((p) => p.id === state.hostId)?.name;
      if (name) toast(`${name} is now the host`, "👑");
    }
  }, [state, identity, room.participants]);

  const deck = state ? DECKS[state.deck] : null;
  const isVoter = identity?.role === "voter";
  const canVote = !!state && isVoter && !state.revealed;
  const deckLocked = !!state && !state.revealed && room.votedCount > 0;

  // Keyboard: 1–9/0 pick a card, ? and C the specials, Esc clears; host: R reveal, N new round.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        isTyping(e.target) ||
        !state ||
        !deck
      )
        return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (isHost && key === "r" && !state.revealed && room.votedCount > 0) {
        void actions.reveal();
        return;
      }
      if (isHost && key === "n" && state.revealed) {
        actions.newRound();
        return;
      }
      if (!canVote) return;
      if (key === "escape") {
        actions.vote(null);
        return;
      }
      const card = deck.cards.find(
        (c, i) => shortcutFor(c, i).toLowerCase() === key,
      );
      if (card) {
        e.preventDefault();
        actions.vote(myVote === card.value ? null : card.value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, deck, isHost, canVote, myVote, actions, room.votedCount]);

  const needsName = !!identity && !identity.name;

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader
        roomId={roomId}
        state={state}
        status={room.status}
        name={identity?.name ?? ""}
        icon={identity?.icon ?? null}
        role={identity?.role ?? "voter"}
        historyCount={state?.history.length ?? 0}
        onRole={(role: Role) => {
          if (role === "spectator") actions.withdraw();
          updateIdentity({ role });
          toast(
            role === "spectator"
              ? "You're spectating now"
              : "You're voting now",
            role === "spectator" ? "👁" : "🃏",
          );
        }}
        onEditProfile={() => setEditing(true)}
        onHistory={() => setHistoryOpen((o) => !o)}
      />

      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 px-4 pt-5 pb-48 sm:px-6">
        {realtimeMode === "local" && (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-2 text-center text-xs text-muted">
            <strong className="text-text">Local demo mode</strong> — no Supabase
            keys, so this room only syncs between tabs in this browser. Open the
            invite link in another tab to play.
          </p>
        )}

        {state && identity && me ? (
          <>
            {isHost && (
              <HostPanel
                state={state}
                participants={room.participants}
                myId={identity.id}
                deckLocked={deckLocked}
                onDeck={actions.setDeck}
                onAutoReveal={actions.setAutoReveal}
                onMemes={actions.setMemesOn}
                onHandOver={actions.handOver}
              />
            )}

            <div className="flex flex-1 flex-col gap-6">
              <motion.div
                layout="position"
                className="flex flex-col justify-center md:pt-2"
              >
                <PokerTable
                  state={state}
                  voters={room.voters}
                  spectators={room.spectators}
                  myId={identity.id}
                  hasVoted={room.hasVoted}
                  votedCount={room.votedCount}
                  result={result}
                  isHost={isHost}
                  onReveal={() => void actions.reveal()}
                  onNewRound={actions.newRound}
                />
              </motion.div>
              <AnimatePresence>
                {result && (
                  <Results
                    key={state.roundId}
                    state={state}
                    result={result}
                    icons={Object.fromEntries(
                      room.participants.map((p) => [p.id, p.icon]),
                    )}
                  />
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          !needsName && (
            <div className="grid flex-1 place-items-center">
              <div className="flex flex-col items-center gap-4 text-muted">
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="card-back block h-14 w-10 rounded-lg"
                      animate={{
                        y: [0, -12, 0],
                        rotate: [0, i % 2 ? 6 : -6, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
                <p className="font-display font-bold">
                  {room.status === "error"
                    ? "Can't reach the table. Retrying…"
                    : "Shuffling the deck…"}
                </p>
              </div>
            </div>
          )
        )}
      </main>

      {/* Bottom sheet: the hand of cards */}
      {state && deck && identity?.name && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 shadow-[0_-10px_30px_-20px_rgba(12,12,20,0.25)] backdrop-blur-md">
          <div className="mx-auto max-w-5xl">
            {isVoter ? (
              <CardHand
                key={state.deck}
                cards={deck.cards}
                selected={myVote}
                disabled={!canVote}
                disabledReason={
                  state.revealed
                    ? "Cards are revealed — waiting for a new round"
                    : undefined
                }
                onSelect={actions.vote}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-sm text-muted sm:flex-row">
                <span aria-hidden className="text-lg">
                  👁
                </span>
                You&apos;re spectating — no cards for you.
                <button
                  onClick={() => updateIdentity({ role: "voter" })}
                  className="font-semibold text-accent underline-offset-4 hover:underline"
                >
                  Switch to voter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {state?.revealed &&
        (state.memesOn || state.meme) &&
        result &&
        result.count > 0 && (
          <MemeCard
            key={state.roundId}
            meme={state.meme}
            pending={state.memesOn && !state.meme}
          />
        )}

      <HistoryPanel
        open={historyOpen}
        history={state?.history ?? []}
        onClose={() => setHistoryOpen(false)}
      />

      <AnimatePresence>
        {identity && (needsName || editing) && (
          <JoinModal
            key={needsName ? "join" : "edit"}
            mode={needsName ? "join" : "edit"}
            roomId={roomId}
            initialName={identity.name || suggestedName}
            initialRole={identity.role}
            initialIcon={identity.icon}
            onSubmit={(name, role, icon) => {
              updateIdentity({ name, role, icon });
              setEditing(false);
            }}
            onClose={() => setEditing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
