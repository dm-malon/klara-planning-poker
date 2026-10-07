"use client";

import { useRef } from "react";
import { AVATAR_ICONS, initials } from "@/lib/avatar";

const COLUMNS = 9;

/** Grid of avatar choices: initials first, then the emoji catalog. Arrow keys move, Enter/Space picks. */
export function IconPicker({
  name,
  value,
  onChange,
  labelledBy,
}: {
  name: string;
  value: string | null;
  onChange: (icon: string | null) => void;
  labelledBy?: string;
}) {
  const options: (string | null)[] = [null, ...AVATAR_ICONS];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(0, options.indexOf(value));

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: COLUMNS,
      ArrowUp: -COLUMNS,
    };
    const step = moves[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = Math.min(options.length - 1, Math.max(0, i + step));
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-9 gap-1 rounded-2xl bg-surface-raised p-1.5"
    >
      {options.map((opt, i) => {
        const active = opt === value;
        return (
          <button
            key={opt ?? "initials"}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt ?? `Initials (${initials(name)})`}
            tabIndex={i === selectedIndex ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(opt)}
            className={`grid aspect-square place-items-center rounded-xl transition ${
              active
                ? "bg-surface shadow-soft ring-2 ring-accent"
                : "hover:scale-110 hover:bg-surface"
            }`}
          >
            {opt ? (
              <span className="text-xl leading-none">{opt}</span>
            ) : (
              <span className="font-display text-[11px] font-bold text-muted">
                {initials(name)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
