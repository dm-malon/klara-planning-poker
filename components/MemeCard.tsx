"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { OUTCOME_LABEL, type Meme } from "@/lib/memes";

const SHRINK_AFTER_MS = 15000;

/** Shows the round's meme big, then tucks it into a corner. Keyed per meme by the parent. */
export function MemeCard({
  meme,
  pending,
}: {
  meme: Meme | null;
  pending: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  // Hovering the meme pauses the shrink timer (it restarts when the pointer leaves).
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!meme || !expanded || hovered) return;
    const t = setTimeout(() => setExpanded(false), SHRINK_AFTER_MS);
    return () => clearTimeout(t);
  }, [meme, expanded, hovered]);

  useEffect(() => {
    if (!expanded || !meme) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, meme]);

  const show = !dismissed && (meme || pending);

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          key="meme"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          layout
          aria-label="Round meme"
          initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: expanded ? -1.5 : 0 }}
          exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className={`fixed z-40 overflow-hidden rounded-3xl border border-line-strong bg-surface-strong shadow-2xl ${
            expanded
              ? "inset-x-4 top-20 sm:inset-x-auto sm:top-24 sm:right-6 sm:w-[380px]"
              : "right-3 bottom-40 w-36 sm:right-6 sm:bottom-44 sm:w-44"
          }`}
        >
          <motion.div
            layout="position"
            className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2"
          >
            <span
              className={`truncate font-display font-bold ${expanded ? "text-base" : "text-xs"}`}
            >
              {meme ? OUTCOME_LABEL[meme.outcome] : "Finding a meme…"}
            </span>
            <span className="flex shrink-0 gap-1">
              {meme && (
                <button
                  onClick={() => setExpanded((e) => !e)}
                  aria-label={expanded ? "Minimize meme" : "Expand meme"}
                  className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-raised hover:text-text"
                >
                  {expanded ? "↘" : "↖"}
                </button>
              )}
              <button
                onClick={() => setDismissed(true)}
                aria-label="Dismiss meme"
                className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-raised hover:text-text"
              >
                ✕
              </button>
            </span>
          </motion.div>

          <motion.div layout="position">
            {!meme ? (
              <div className="mx-3 mb-3 grid aspect-video animate-pulse place-items-center rounded-2xl bg-surface-raised text-3xl">
                🎲
              </div>
            ) : meme.kind === "gif" ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="block w-full cursor-zoom-in px-3"
                aria-label="Expand meme"
                disabled={expanded}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote GIFs, no optimisation wanted */}
                <img
                  src={meme.url}
                  alt={meme.title || meme.query}
                  width={meme.width}
                  height={meme.height}
                  className="max-h-[50vh] w-full rounded-2xl bg-surface-raised object-cover"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                disabled={expanded}
                className="mx-3 mb-0 grid w-[calc(100%-1.5rem)] place-items-center gap-2 rounded-2xl accent-gradient px-4 py-6 text-center text-white"
              >
                <span
                  className={expanded ? "text-7xl" : "text-4xl"}
                  aria-hidden
                >
                  {meme.emoji}
                </span>
                {expanded && (
                  <span className="font-display text-xl font-bold">
                    {meme.caption}
                  </span>
                )}
              </button>
            )}
            <p
              className={`px-3 pt-1.5 pb-2.5 text-[10px] text-faint ${expanded ? "" : "hidden"}`}
            >
              {meme?.kind === "gif" ? (
                <>“{meme.query}” · Powered by GIPHY</>
              ) : meme ? (
                <>Meme machine offline — emoji edition</>
              ) : null}
            </p>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
