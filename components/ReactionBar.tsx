"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { REACTIONS } from "@/lib/fx";

/** Collapsed to one small button; expands on hover / focus (tap on touch screens). */
export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Touch screens have no hover: a tap opens it, a tap elsewhere closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div
      ref={root}
      role="toolbar"
      aria-label="Reactions"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onKeyUp={(e) => e.key === "Tab" && setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      className="fixed bottom-[11.5rem] left-3 z-20 flex items-center rounded-full border border-line bg-surface/90 p-1 shadow-soft backdrop-blur sm:bottom-[12.5rem] sm:left-5"
    >
      <button
        type="button"
        aria-label="Reactions"
        aria-expanded={open}
        onPointerDown={(e) => {
          // Mouse users open it by hovering; touch/pen users tap to toggle.
          if (e.pointerType !== "mouse") setOpen((o) => !o);
        }}
        onClick={(e) => {
          // detail === 0 means the click came from the keyboard (Enter / Space).
          if (e.detail === 0) setOpen((o) => !o);
        }}
        className={`grid size-8 place-items-center rounded-full text-base transition ${
          open ? "bg-surface-raised" : "opacity-80 hover:opacity-100"
        }`}
      >
        <span aria-hidden>😊</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="reactions"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className="flex overflow-hidden"
          >
            <span
              aria-hidden
              className="mx-1 my-1.5 w-px self-stretch bg-line"
            />
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                aria-label={`React ${emoji}`}
                className="grid size-8 shrink-0 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-surface-raised active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
