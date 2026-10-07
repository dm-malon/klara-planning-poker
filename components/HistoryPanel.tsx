"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { DECKS, findCard } from "@/lib/decks";
import { OUTCOME_LABEL } from "@/lib/memes";
import type { HistoryEntry } from "@/lib/realtime";
import { formatNumber } from "@/lib/stats";

function resultText(h: HistoryEntry): string {
  if (h.average === null) return "no numbers";
  if (h.deck === "story") return `${findCard("story", h.suggested)?.label ?? "—"} SP`;
  return `${formatNumber(h.average)}h ≈ ${formatNumber(Math.round((h.days ?? 0) * 10) / 10)}d`;
}

export function HistoryPanel({
  open,
  history,
  onClose,
}: {
  open: boolean;
  history: HistoryEntry[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            aria-label="Round history"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(340px,88vw)] flex-col border-r border-line bg-surface-strong shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-extrabold">Round history</h2>
              <button
                onClick={onClose}
                aria-label="Close history"
                className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-raised hover:text-text"
              >
                ✕
              </button>
            </div>
            <ol className="flex-1 space-y-2 overflow-y-auto p-4">
              {history.length === 0 && (
                <li className="rounded-2xl border border-dashed border-line-strong p-4 text-sm text-muted">
                  Nothing yet. Reveal a round and it lands here.
                </li>
              )}
              {history.map((h, i) => (
                <li key={h.roundId} className="rounded-2xl border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold">
                      Round <span className="font-mono">#{history.length - i}</span>
                    </p>
                    <span className="shrink-0 font-display text-lg leading-none font-extrabold text-accent">
                      {resultText(h)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {DECKS[h.deck].name} · {h.voteCount} vote{h.voteCount === 1 ? "" : "s"} ·{" "}
                    {OUTCOME_LABEL[h.outcome]} ·{" "}
                    {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ol>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
