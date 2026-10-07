"use client";

import { REACTIONS } from "@/lib/fx";

export function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <div
      role="toolbar"
      aria-label="Reactions"
      className="fixed bottom-[11.5rem] left-3 z-20 flex gap-0.5 rounded-full border border-line bg-surface/90 p-1 shadow-soft backdrop-blur sm:left-5 sm:bottom-[12.5rem]"
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          aria-label={`React ${emoji}`}
          className="grid size-9 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-surface-raised active:scale-90"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
