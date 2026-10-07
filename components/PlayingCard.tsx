"use client";

import { motion, useReducedMotion } from "framer-motion";

const SIZE = {
  seat: { box: "h-[4.25rem] w-12", corner: "text-[10px]", center: "text-xl" },
  mini: { box: "h-11 w-8", corner: "hidden", center: "text-sm" },
};

/** Front of a card: big label in the middle, small labels in opposite corners. */
export function CardFace({
  label,
  size,
  tone,
}: {
  label: string;
  size: keyof typeof SIZE;
  tone?: "low" | "high";
}) {
  const s = SIZE[size];
  return (
    <div
      className={`card-face absolute inset-0 rounded-[10px] font-display font-extrabold ${
        tone === "low" ? "ring-[3px] ring-low" : tone === "high" ? "ring-[3px] ring-high" : ""
      }`}
    >
      <span className={`absolute top-1 left-1.5 leading-none ${s.corner}`}>{label}</span>
      <span className={`absolute inset-0 grid place-items-center ${s.center}`}>{label}</span>
      <span className={`absolute right-1.5 bottom-1 rotate-180 leading-none ${s.corner}`}>
        {label}
      </span>
    </div>
  );
}

/**
 * A seat card at the table: empty slot → face-down → flips face-up on reveal.
 */
export function SeatCard({
  voted,
  revealed,
  label,
  tone,
  size = "seat",
  delay = 0,
}: {
  voted: boolean;
  revealed: boolean;
  label: string | null;
  tone?: "low" | "high";
  size?: keyof typeof SIZE;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const box = SIZE[size].box;

  if (!voted && !(revealed && label)) {
    return (
      <div
        className={`${box} rounded-[10px] border-2 border-dashed border-white/25 bg-black/10`}
        aria-hidden
      />
    );
  }

  const faceUp = revealed && !!label;
  return (
    <motion.div
      className={`flip-scene ${box}`}
      initial={{ y: -14, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
    >
      <motion.div
        className="preserve-3d relative h-full w-full"
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.6, delay: faceUp ? delay : 0, ease: [0.3, 0.7, 0.2, 1] }
        }
      >
        <div className="card-back backface-hidden absolute inset-0 rounded-[10px]" />
        <div className="backface-hidden absolute inset-0 [transform:rotateY(180deg)]">
          <CardFace label={label ?? ""} size={size} tone={tone} />
        </div>
      </motion.div>
    </motion.div>
  );
}
