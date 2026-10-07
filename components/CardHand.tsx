"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import type { Card } from "@/lib/decks";

/** Shortcut shown on each card: 1–9, then 0, then ? / C for the specials. */
export function shortcutFor(card: Card, index: number): string {
  if (card.value === "?") return "?";
  if (card.value === "coffee") return "C";
  if (index < 9) return String(index + 1);
  if (index === 9) return "0";
  return "";
}

export function CardHand({
  cards,
  selected,
  disabled,
  disabledReason,
  onSelect,
}: {
  cards: Card[];
  selected: string | null;
  disabled: boolean;
  disabledReason?: string;
  onSelect: (value: string | null) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = cards.findIndex((c) => c.value === selected);
  const focusIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = (i + 1) % cards.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i - 1 + cards.length) % cards.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = cards.length - 1;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
    }
  };

  return (
    <div>
      {disabled && disabledReason && (
        <p className="px-4 pt-3 text-center text-xs font-semibold text-muted">
          {disabledReason}
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Your estimate"
        aria-disabled={disabled}
        className="scrollbar-none flex snap-x gap-2 overflow-x-auto px-4 pt-7 pb-4 sm:justify-center sm:gap-3 sm:overflow-visible"
      >
        {cards.map((card, i) => {
          const isSelected = card.value === selected;
          const hint = shortcutFor(card, i);
          return (
            <motion.button
              key={card.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${card.label === "☕" ? "Coffee break" : card.label}${hint ? `, shortcut ${hint}` : ""}`}
              tabIndex={i === focusIndex ? 0 : -1}
              disabled={disabled}
              onKeyDown={(e) => onKeyDown(e, i)}
              onClick={() => onSelect(isSelected ? null : card.value)}
              animate={{
                y: isSelected ? (disabled ? -10 : -22) : 0,
                rotate: isSelected && !disabled ? -2 : 0,
              }}
              whileHover={disabled ? undefined : { y: isSelected ? -26 : -10 }}
              whileTap={disabled ? undefined : { scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className={`gloss relative h-24 w-16 shrink-0 snap-center rounded-2xl font-display font-bold disabled:cursor-not-allowed disabled:opacity-40 sm:h-28 sm:w-[4.75rem] ${
                isSelected
                  ? "accent-gradient text-white shadow-[0_14px_28px_-10px_var(--accent)]"
                  : "card-face hover:border-accent/50"
              }`}
            >
              <span className="absolute top-1.5 left-2 text-xs leading-none">
                {card.label}
              </span>
              <span
                className={`absolute inset-0 grid place-items-center ${
                  card.label.length > 2
                    ? "text-xl sm:text-2xl"
                    : "text-2xl sm:text-3xl"
                }`}
              >
                {card.label}
              </span>
              {hint && (
                <span
                  aria-hidden
                  className={`absolute right-1.5 bottom-1.5 hidden rounded px-1 font-mono text-[10px] leading-4 font-medium sm:block ${
                    isSelected
                      ? "bg-white/20 text-white/80"
                      : "bg-surface-raised text-faint"
                  }`}
                >
                  {hint}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
