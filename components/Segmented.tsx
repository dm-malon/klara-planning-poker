"use client";

import { motion } from "framer-motion";
import { useId } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  labelledBy,
  wide,
  title,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel?: string;
  labelledBy?: string;
  wide?: boolean;
  title?: string;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      title={title}
      className={`relative inline-flex rounded-full border border-line bg-surface p-1 ${
        wide ? "w-full" : ""
      } ${disabled ? "opacity-50" : ""}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(o.value)}
            className={`relative z-0 flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed ${
              wide ? "flex-1" : ""
            } ${active ? "text-accent-ink" : "text-muted hover:text-text"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
              />
            )}
            {o.icon && <span aria-hidden>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
