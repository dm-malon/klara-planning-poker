"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DECKS, findCard } from "@/lib/decks";
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

/**
 * Point on a superellipse (|x|^n + |y|^n = 1) — hugs the stadium-shaped table
 * better than a plain ellipse, so seats spread along the long edges.
 */
function seatPoint(angle: number, rx: number, ry: number, n = 3.2) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    left: 50 + rx * Math.sign(c) * Math.abs(c) ** (2 / n),
    top: 50 + ry * Math.sign(s) * Math.abs(s) ** (2 / n),
  };
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
  const seated =
    meIndex > 0
      ? [...voters.slice(meIndex), ...voters.slice(0, meIndex)]
      : voters;
  const seats = seated.map((p) => seatInfo(p, state, result, hasVoted));
  const hostName = [...voters, ...spectators].find(
    (p) => p.id === state.hostId,
  )?.name;

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
      {/* Desktop / tablet: wide table with seats around it */}
      <div className="relative mx-auto hidden aspect-[2.25/1] w-full max-w-[1240px] md:block">
        <div className="table-surface absolute inset-x-[7%] inset-y-[17%] rounded-full" />
        <div className="absolute inset-x-[25%] inset-y-[32%] grid place-items-center">
          {center}
        </div>

        <AnimatePresence>
          {seats.map((s, i) => {
            const angle =
              Math.PI / 2 + (i * 2 * Math.PI) / Math.max(seats.length, 1);
            const card = seatPoint(angle, 34, 21);
            const person = seatPoint(angle, 47.5, 44);
            return (
              <motion.div
                key={s.p.id}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="pointer-events-none absolute inset-0"
              >
                <motion.div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  initial={false}
                  animate={{ left: `${card.left}%`, top: `${card.top}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                >
                  <SeatCard
                    voted={s.voted}
                    revealed={state.revealed}
                    label={s.label}
                    tone={s.tone}
                    delay={i * 0.06}
                  />
                </motion.div>
                <motion.div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  initial={false}
                  animate={{ left: `${person.left}%`, top: `${person.top}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 26 }}
                >
                  <SeatPerson
                    info={s}
                    isMe={s.p.id === myId}
                    isHost={s.p.id === state.hostId}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Mobile: compact table summary + participant list */}
      <div className="md:hidden">
        <div className="table-surface relative mx-auto grid min-h-48 place-items-center rounded-[2.5rem] px-6 py-8">
          {center}
        </div>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
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
                  {s.p.id === myId && (
                    <span className="font-normal text-muted"> (you)</span>
                  )}
                  {s.p.id === state.hostId && <HostBadge className="ml-2" />}
                </span>
                <ToneBadge tone={s.tone} />
                <SeatCard
                  voted={s.voted}
                  revealed={state.revealed}
                  label={s.label}
                  tone={s.tone}
                  size="mini"
                />
              </motion.li>
            ))}
          </AnimatePresence>
          {seats.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">
              No voters at the table yet.
            </li>
          )}
        </ul>
      </div>

      <SpectatorRow spectators={spectators} myId={myId} hostId={state.hostId} />
    </section>
  );
}

function HostBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-accent px-1.5 py-px align-middle text-[9px] font-bold tracking-wider text-accent-ink uppercase ${className}`}
    >
      Host
    </span>
  );
}

function SeatPerson({
  info,
  isMe,
  isHost,
}: {
  info: SeatInfo;
  isMe: boolean;
  isHost: boolean;
}) {
  const ring =
    info.tone === "low"
      ? "var(--low)"
      : info.tone === "high"
        ? "var(--high)"
        : isMe
          ? "var(--accent)"
          : undefined;
  return (
    <div className="flex w-32 flex-col items-center gap-1.5 text-center">
      <div className="relative">
        <Avatar name={info.p.name} size="lg" ring={ring} />
        {isHost && (
          <HostBadge className="absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
        )}
      </div>
      <span className="max-w-full truncate text-sm font-semibold">
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
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
        tone === "low" ? "bg-low/12 text-low" : "bg-high/12 text-high"
      }`}
    >
      {tone === "low" ? "lowest" : "highest"}
    </span>
  );
}

function SpectatorRow({
  spectators,
  myId,
  hostId,
}: {
  spectators: Participant[];
  myId: string;
  hostId: string;
}) {
  if (!spectators.length) return null;
  return (
    <div
      className="mt-2 flex flex-wrap items-center justify-center gap-2"
      aria-label="Spectators"
    >
      <span className="mr-1 text-xs font-semibold tracking-widest text-muted uppercase">
        Watching
      </span>
      <AnimatePresence initial={false}>
        {spectators.map((s) => (
          <motion.span
            key={s.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-xs font-semibold shadow-soft"
          >
            <Avatar name={s.name} size="sm" />
            <span aria-hidden className="text-muted">
              👁
            </span>
            {s.name}
            {s.id === myId && (
              <span className="font-normal text-muted">(you)</span>
            )}
            {s.id === hostId && <HostBadge />}
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
  const deck = DECKS[state.deck];
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {state.revealed && result ? (
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">
            {deck.id === "story" ? "Suggested" : "Average"}
          </span>
          <motion.span
            key={state.roundId}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 14,
              delay: 0.5,
            }}
            className="text-gradient font-display text-6xl leading-none font-bold tracking-tight lg:text-7xl"
          >
            {deck.id === "story"
              ? (findCard("story", result.suggested)?.label ?? "—")
              : result.average !== null
                ? `${formatNumber(result.average)}h`
                : "—"}
          </motion.span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="font-display text-5xl leading-none font-bold tracking-tight lg:text-6xl">
            {votedCount}
            <span className="text-faint">/{total}</span>
          </p>
          <span className="text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">
            voted
          </span>
          <div
            className="h-1 w-32 overflow-hidden rounded-full bg-surface-raised"
            aria-hidden
          >
            <motion.div
              className="accent-gradient h-full rounded-full"
              animate={{ width: `${total ? (votedCount / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
            />
          </div>
        </div>
      )}

      {isHost ? (
        state.revealed ? (
          <button
            onClick={onNewRound}
            className="h-11 rounded-full border border-line-strong bg-surface px-6 font-display font-semibold shadow-soft transition hover:-translate-y-0.5 hover:border-text"
          >
            New round{" "}
            <kbd className="ml-1 font-mono text-[10px] text-faint">N</kbd>
          </button>
        ) : (
          <button
            onClick={onReveal}
            disabled={votedCount === 0}
            className="accent-gradient h-11 rounded-full px-7 font-display font-semibold text-accent-ink shadow-[0_10px_24px_-10px_var(--accent)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
          >
            Reveal cards{" "}
            <kbd className="ml-1 font-mono text-[10px] opacity-70">R</kbd>
          </button>
        )
      ) : (
        <p className="text-xs text-muted">
          {state.revealed
            ? "Waiting for the next round…"
            : `${hostName ?? "The host"} will reveal`}
        </p>
      )}
    </div>
  );
}
