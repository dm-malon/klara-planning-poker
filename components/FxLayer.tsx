"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SPLATS, type Fx } from "@/lib/fx";
import { toast } from "@/lib/toast";

interface Point {
  x: number;
  y: number;
}

type Item =
  | {
      type: "flight";
      key: string;
      emoji: string;
      from: Point;
      to: Point;
      target: string;
      poke: boolean;
    }
  | {
      type: "particle";
      key: string;
      emoji: string;
      at: Point;
      dx: number;
      dy: number;
    }
  | { type: "float"; key: string; emoji: string; at: Point; drift: number };

const MAX_ITEMS = 60;

/** Avatars carry data-seat="<participant id>"; several may exist (desktop table + mobile list). */
function seatElement(id: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(
    `[data-seat="${CSS.escape(id)}"]`,
  );
  for (const el of all) if (el.getClientRects().length > 0) return el;
  return null;
}

function centerOf(el: HTMLElement | null): Point | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function shake(el: HTMLElement | null, strong = false) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return;
  const a = strong ? 9 : 5;
  el.animate(
    [
      { transform: "translate(0,0) rotate(0)" },
      { transform: `translate(${-a}px,0) rotate(-8deg)` },
      { transform: `translate(${a}px,0) rotate(8deg)` },
      { transform: `translate(${-a / 2}px,0) rotate(-4deg)` },
      { transform: `translate(${a / 2}px,0) rotate(4deg)` },
      { transform: "translate(0,0) rotate(0)" },
    ],
    { duration: strong ? 650 : 450, easing: "ease-out" },
  );
}

let seq = 0;
const nextKey = () => `fx${++seq}`;

export function FxLayer({
  subscribe,
  myId,
  names,
}: {
  subscribe: (listener: (fx: Fx) => void) => () => void;
  myId: string;
  names: Record<string, string>;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const namesRef = useRef(names);
  useEffect(() => {
    namesRef.current = names;
  }, [names]);

  const add = (...next: Item[]) =>
    setItems((cur) => [...cur, ...next].slice(-MAX_ITEMS));
  const remove = (key: string) =>
    setItems((cur) => cur.filter((i) => i.key !== key));

  useEffect(
    () =>
      subscribe((fx) => {
        const fromEl = seatElement(fx.from);
        // Your own seat may be off-screen (e.g. spectating on mobile) — launch from the card dock.
        const from = centerOf(fromEl) ?? {
          x: window.innerWidth / 2,
          y: window.innerHeight - 80,
        };

        if (fx.kind === "react") {
          add({
            type: "float",
            key: nextKey(),
            emoji: fx.emoji,
            at: from,
            drift: (Math.random() - 0.5) * 40,
          });
          return;
        }

        const to = centerOf(seatElement(fx.to));
        if (fx.kind === "poke" && fx.to === myId) {
          toast(
            `${namesRef.current[fx.from] ?? "Someone"} is poking you`,
            "👉",
          );
        }
        if (!to) return;
        add({
          type: "flight",
          key: nextKey(),
          emoji: fx.kind === "poke" ? "👉" : fx.emoji,
          from,
          to,
          target: fx.to,
          poke: fx.kind === "poke",
        });
      }),
    [subscribe, myId],
  );

  const impact = (item: Extract<Item, { type: "flight" }>) => {
    remove(item.key);
    shake(seatElement(item.target), item.poke);
    if (item.poke) return;
    const splats = SPLATS[item.emoji] ?? ["✨"];
    add(
      ...Array.from({ length: 5 }, (_, i) => {
        const angle = (i / 5) * Math.PI * 2 + Math.random();
        const dist = 30 + Math.random() * 30;
        return {
          type: "particle" as const,
          key: nextKey(),
          emoji: splats[i % splats.length],
          at: item.to,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
        };
      }),
    );
  };

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      <AnimatePresence>
        {items.map((item) => {
          const base =
            "absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 leading-none select-none";
          if (item.type === "flight") {
            const peak =
              Math.min(item.from.y, item.to.y) -
              90 -
              Math.abs(item.to.x - item.from.x) * 0.15;
            const angle =
              (Math.atan2(item.to.y - item.from.y, item.to.x - item.from.x) *
                180) /
              Math.PI;
            const isPlane = item.emoji === "✈️";
            return (
              <motion.span
                key={item.key}
                className={`${base} text-3xl drop-shadow-md`}
                initial={{
                  x: item.from.x,
                  y: item.from.y,
                  scale: 0.6,
                  rotate: 0,
                }}
                animate={{
                  x: [item.from.x, (item.from.x + item.to.x) / 2, item.to.x],
                  y: [
                    item.from.y,
                    item.poke ? (item.from.y + item.to.y) / 2 : peak,
                    item.to.y,
                  ],
                  scale: [0.6, 1.35, 1],
                  rotate: isPlane
                    ? [angle - 30, angle - 10, angle + 10]
                    : item.poke
                      ? 0
                      : [0, 220, 400],
                }}
                transition={{
                  duration: item.poke ? 0.45 : 0.8,
                  ease: "easeInOut",
                }}
                onAnimationComplete={() => impact(item)}
              >
                {item.emoji}
              </motion.span>
            );
          }
          if (item.type === "particle") {
            return (
              <motion.span
                key={item.key}
                className={`${base} text-lg`}
                initial={{ x: item.at.x, y: item.at.y, scale: 1.2, opacity: 1 }}
                animate={{
                  x: item.at.x + item.dx,
                  y: item.at.y + item.dy,
                  scale: 0.6,
                  opacity: 0,
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                onAnimationComplete={() => remove(item.key)}
              >
                {item.emoji}
              </motion.span>
            );
          }
          return (
            <motion.span
              key={item.key}
              className={`${base} text-3xl`}
              initial={{
                x: item.at.x,
                y: item.at.y - 20,
                scale: 0.5,
                opacity: 0,
              }}
              animate={{
                x: item.at.x + item.drift,
                y: item.at.y - 120,
                scale: [0.5, 1.4, 1.1],
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              onAnimationComplete={() => remove(item.key)}
            >
              {item.emoji}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
