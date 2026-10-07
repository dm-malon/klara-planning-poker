"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DECKS, findCard, type DeckId } from "@/lib/decks";
import type { Participant, RoomState } from "@/lib/realtime";
import { formatNumber, type RoundResult } from "@/lib/stats";
import { Avatar } from "./Avatar";
import { SeatCard } from "./PlayingCard";

interface SeatInfo {
  p: Participant;
  voted: boolean;
  label: string | null;
  tone?: "low" | "high";
}

function seatInfo(
  p: Participant,
  state: RoomState,
  result: RoundResult | null,
  hasVoted: (p: Participant) => boolean,
): SeatInfo {
  const value = state.revealed ? state.votes?.[p.id] : undefined;
  const label = value ? (findCard(state.deck, value)?.label ?? value) : null;
  const tone = result?.lowIds.includes(p.id)
    ? "low"
    : result?.highIds.includes(p.id)
      ? "high"
      : undefined;
  return { p, voted: state.revealed ? !!value : hasVoted(p), label, tone };
}

export function PokerTable({
  state,
  voters,
  spectators,
  myId,
  hasVoted,
  votedCount,
  result,
  isHost,
  onReveal,
  onNewRound,
}: {
  state: RoomState;
  voters: Participant[];
  spectators: Participant[];
  myId: string;
  hasVoted: (p: Participant) => boolean;
  votedCount: number;
  result: RoundResult | null;
  isHost: boolean;
  onReveal: () => void;
  onNewRound: () => void;
}) {
  // Rotate seating so you always sit at the bottom of the table.
  const meIndex = voters.findIndex((v) => v.id === myId);
  const seated = meIndex > 0 ? [...voters.slice(meIndex), ...voters.slice(0, meIndex)] : voters;
  const seats = seated.map((p) => seatInfo(p, state, result, hasVoted));
  const hostName = [...voters, ...spectators].find((p) => p.id === state.hostId)?.name;

  const center = (
    <TableCenter
      state={state}
      votedCount={votedCount}
      total={voters.length}
      result={result}
      isHost={isHost}
      hostName={hostName}
      onReveal={onReveal}
      onNewRound={onNewRound}
    />
  );

  return (
    <section aria-label="Poker table" className="w-full">
      {/* Desktop / tablet: oval table with seats around it */}
      <div className="relative mx-auto hidden aspect-[2.05/1] w-full max-w-[960px] md:block">
        <div className="felt absolute inset-x-[9%] inset-y-[15%] rounded-[50%]" />
        <div className="absolute inset-x-[22%] inset-y-[30%] grid place-items-center">{center}</div>

        <AnimatePresence>
          {seats.map((s, i) => {
            const angle = Math.PI / 2 + (i * 2 * Math.PI) / Math.max(seats.length, 1);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return (
              <motion.div
                key={s.p.id}
                layout
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="pointer-events-none absolute inset-0"
              >
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${50 + cos * 30.5}%`, top: `${50 + sin * 24}%` }}
                >
                  <SeatCard
                    voted={s.voted}
                    revealed={state.revealed}
                    label={s.label}
                    tone={s.tone}
                    delay={i * 0.06}
                  />
                </div>
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${50 + cos * 46}%`, top: `${50 + sin * 44}%` }}
                >
                  <SeatPerson info={s} isMe={s.p.id === myId} isHost={s.p.id === state.hostId} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {voters.length === 0 && (
          <p className="absolute inset-x-0 bottom-0 text-center text-sm text-muted">
            No voters at the table yet.
          </p>
        )}
      </div>

      {/* Mobile: compact table summary + participant list */}
      <div className="md:hidden">
        <div className="felt relative mx-auto grid min-h-44 place-items-center rounded-[2.5rem] px-6 py-8">
          <div className="relative z-10">{center}</div>
        </div>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          <AnimatePresence initial={false}>
            {seats.map((s) => (
              <motion.li
                key={s.p.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <Avatar name={s.p.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {s.p.name}
                  {s.p.id === myId && <span className="font-normal text-muted"> (you)</span>}
                  {s.p.id === state.hostId && (
                    <span className="ml-1.5" title="Host" aria-label="host">
                      👑
                    </span>
                  )}
                </span>
                <ToneBadge tone={s.tone} />
                <div className="relative">
                  <SeatCard voted={s.voted} revealed={state.revealed} label={s.label} tone={s.tone} size="mini" />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {seats.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">No voters at the table yet.</li>
          )}
        </ul>
      </div>

      <SpectatorRow spectators={spectators} myId={myId} hostId={state.hostId} />
    </section>
  );
}

function SeatPerson({ info, isMe, isHost }: { info: SeatInfo; isMe: boolean; isHost: boolean }) {
  const ring = info.tone === "low" ? "var(--low)" : info.tone === "high" ? "var(--high)" : isMe ? "var(--accent)" : undefined;
  return (
    <div className="flex w-28 flex-col items-center gap-1 text-center">
      <div className="relative">
        <Avatar name={info.p.name} ring={ring} />
        {isHost && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm" title="Host" aria-label="host">
            👑
          </span>
        )}
      </div>
      <span className="max-w-full truncate text-xs font-semibold">
        {info.p.name}
        {isMe && <span className="font-normal text-muted"> (you)</span>}
      </span>
      <ToneBadge tone={info.tone} />
    </div>
  );
}

function ToneBadge({ tone }: { tone?: "low" | "high" }) {
  if (!tone) return null;
  return (
    <span
      className={`rounded-full px-1.5 py-px text-[10px] font-bold tracking-wide uppercase ${
        tone === "low" ? "bg-low/15 text-low" : "bg-high/15 text-high"
      }`}
    >
      {tone === "low" ? "lowest" : "highest"}
    </span>
  );
}

function SpectatorRow({ spectators, myId, hostId }: { spectators: Participant[]; myId: string; hostId: string }) {
  if (!spectators.length) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Spectators">
      <span className="text-xs font-semibold tracking-widest text-muted uppercase">Watching</span>
      <AnimatePresence initial={false}>
        {spectators.map((s) => (
          <motion.span
            key={s.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-xs font-semibold"
          >
            <Avatar name={s.name} size="sm" />
            <span aria-hidden>👁</span>
            {s.name}
            {s.id === myId && <span className="font-normal text-muted">(you)</span>}
            {s.id === hostId && <span aria-label="host">👑</span>}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function TableCenter({
  state,
  votedCount,
  total,
  result,
  isHost,
  hostName,
  onReveal,
  onNewRound,
}: {
  state: RoomState;
  votedCount: number;
  total: number;
  result: RoundResult | null;
  isHost: boolean;
  hostName?: string;
  onReveal: () => void;
  onNewRound: () => void;
}) {
  const deck = DECKS[state.deck as DeckId];
  return (
    <div className="flex flex-col items-center gap-2 text-center text-white">
      {state.revealed && result ? (
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase">
            {deck.id === "story" ? "Suggested" : "Average"}
          </span>
          <motion.span
            key={state.roundId}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.5 }}
            className="font-display text-5xl leading-none font-extrabold drop-shadow-lg"
          >
            {deck.id === "story"
              ? (findCard("story", result.suggested)?.label ?? "—")
              : result.average !== null
                ? `${formatNumber(result.average)}h`
                : "—"}
          </motion.span>
        </div>
      ) : (
        <p className="font-display text-3xl font-extrabold">
          {votedCount}
          <span className="text-white/50">/{total}</span>
          <span className="ml-2 align-middle text-xs font-semibold tracking-widest text-white/60 uppercase">
            voted
          </span>
        </p>
      )}

      {isHost ? (
        state.revealed ? (
          <button
            onClick={onNewRound}
            className="mt-1 h-10 rounded-full bg-white px-5 font-display font-bold text-[#0b1730] shadow-lg transition hover:-translate-y-0.5"
          >
            New round <kbd className="ml-1 font-mono text-[10px] opacity-50">N</kbd>
          </button>
        ) : (
          <button
            onClick={onReveal}
            disabled={votedCount === 0}
            className="mt-1 h-10 rounded-full bg-accent px-6 font-display font-bold text-accent-ink shadow-[0_10px_24px_-8px_var(--accent)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            Reveal cards <kbd className="ml-1 font-mono text-[10px] opacity-60">R</kbd>
          </button>
        )
      ) : (
        <p className="text-xs text-white/60">
          {state.revealed ? "Waiting for the next round…" : `${hostName ?? "The host"} will reveal`}
        </p>
      )}
    </div>
  );
}
