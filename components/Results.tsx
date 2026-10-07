"use client";

import { motion } from "framer-motion";
import { DECKS, findCard } from "@/lib/decks";
import { OUTCOME_LABEL } from "@/lib/memes";
import type { RoomState } from "@/lib/realtime";
import { formatNumber, type RoundResult } from "@/lib/stats";
import { Avatar } from "./Avatar";

const OUTCOME_EMOJI = {
  consensus: "🎯",
  near: "👌",
  disagreement: "🔥",
  unknown: "🤷",
  coffee: "☕",
  huge: "😱",
  tiny: "🍰",
  mixed: "🤔",
  empty: "🦗",
} as const;

export function Results({ state, result }: { state: RoomState; result: RoundResult }) {
  const deck = DECKS[state.deck];
  const names = state.voterNames ?? {};
  const votes = state.votes ?? {};
  const unit = deck.id === "hourly" ? "h" : "";
  const maxCount = Math.max(1, ...result.distribution.map((d) => d.count));
  const fmt = (n: number | null) => (n === null ? "—" : `${formatNumber(n)}${unit}`);

  const outlierLine = (ids: string[]) =>
    ids.map((id) => names[id] ?? "Someone").join(", ");

  return (
    <motion.section
      aria-label="Round results"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 24 }}
      className="rounded-3xl border border-line bg-surface p-5 backdrop-blur"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          <span aria-hidden className="mr-2">
            {OUTCOME_EMOJI[result.outcome]}
          </span>
          {OUTCOME_LABEL[result.outcome]}
        </h2>
        <span className="text-xs text-muted">
          {result.count} vote{result.count === 1 ? "" : "s"}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {deck.id === "story" ? (
          <Stat label="Suggested" value={findCard("story", result.suggested)?.label ?? "—"} accent />
        ) : (
          <Stat
            label="Average"
            value={fmt(result.average)}
            sub={result.days !== null ? `≈ ${formatNumber(Math.round(result.days * 10) / 10)} days` : undefined}
            accent
          />
        )}
        {deck.id === "story" && <Stat label="Average" value={fmt(result.average)} />}
        <Stat label="Median" value={fmt(result.median)} />
        <Stat
          label="Min / Max"
          value={result.min === null ? "—" : `${fmt(result.min)} – ${fmt(result.max)}`}
        />
        {deck.id === "hourly" && (
          <Stat label="Days (8h)" value={result.days === null ? "—" : formatNumber(result.days)} />
        )}
      </dl>
      {result.numericCount < result.count && (
        <p className="mt-2 text-xs text-muted">? and ☕ are left out of the numbers.</p>
      )}

      {result.distribution.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
            Distribution
          </h3>
          <ul className="space-y-2">
            {result.distribution.map((d, i) => {
              const who = Object.entries(votes).filter(([, v]) => v === d.value).map(([id]) => id);
              return (
                <li key={d.value} className="flex items-center gap-3">
                  <span className="card-face relative grid h-9 w-7 shrink-0 place-items-center rounded-md font-display text-sm font-extrabold">
                    {d.label}
                  </span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-line">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-lg bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.count / maxCount) * 100}%` }}
                      transition={{ delay: 0.8 + i * 0.06, type: "spring", stiffness: 120, damping: 20 }}
                    />
                    <div className="relative flex h-full items-center gap-0.5 pl-1.5">
                      {who.slice(0, 8).map((id) => (
                        <span key={id} title={names[id]}>
                          <Avatar name={names[id] ?? "?"} size="sm" className="!size-5 !text-[8px]" />
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="w-6 text-right font-mono text-sm font-semibold tabular-nums">
                    {d.count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {result.lowIds.length > 0 && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Outlier tone="low" who={outlierLine(result.lowIds)} value={fmt(result.min)} />
          <Outlier tone="high" who={outlierLine(result.highIds)} value={fmt(result.max)} />
        </div>
      )}
    </motion.section>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2.5 ${
        accent ? "border-accent/40 bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <dt className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</dt>
      <dd className={`font-display text-2xl font-extrabold tabular-nums ${accent ? "text-accent" : ""}`}>
        {value}
      </dd>
      {sub && <dd className="text-xs font-semibold text-muted">{sub}</dd>}
    </div>
  );
}

function Outlier({ tone, who, value }: { tone: "low" | "high"; who: string; value: string }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2.5 text-sm ${
        tone === "low" ? "border-low/40 bg-low/10" : "border-high/40 bg-high/10"
      }`}
    >
      <p className={`text-[11px] font-bold tracking-wider uppercase ${tone === "low" ? "text-low" : "text-high"}`}>
        {tone === "low" ? "↓ Lowest" : "↑ Highest"} · {value}
      </p>
      <p className="mt-0.5 font-semibold">{who}</p>
      <p className="text-xs text-muted">Tell us what you&apos;re seeing 👀</p>
    </div>
  );
}
