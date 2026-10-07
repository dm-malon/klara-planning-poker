"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { THROWABLES } from "@/lib/fx";

export interface PersonActions {
  onThrow: (to: string, emoji: string) => void;
  onPoke: (to: string) => void;
}

/**
 * Wraps someone's avatar: click it to throw things at them or poke them.
 * Your own avatar is rendered without a menu.
 */
export function PersonMenu({
  id,
  name,
  isMe,
  actions,
  placement = "below",
  children,
}: {
  id: string;
  name: string;
  isMe: boolean;
  actions?: PersonActions;
  placement?: "below" | "above";
  children: React.ReactNode;
}) {
  // Anchor point of the open menu (viewport coords), or null when closed.
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  const toggle = () => {
    if (open || !trigger.current) return setAnchor(null);
    const r = trigger.current.getBoundingClientRect();
    setAnchor({
      x: r.left + r.width / 2,
      y: placement === "below" ? r.bottom : r.top,
    });
  };

  // Rendered in a portal, so close on outside clicks, Escape, scroll and resize.
  useEffect(() => {
    if (!open) return;
    const close = () => setAnchor(null);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !trigger.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (isMe || !actions) {
    return (
      <div data-seat={id} className="relative inline-flex">
        {children}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto relative inline-flex">
      <button
        ref={trigger}
        type="button"
        data-seat={id}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Interact with ${name}`}
        title={`Throw something at ${name}`}
        className="relative inline-flex rounded-full transition hover:scale-105 active:scale-95"
      >
        {children}
      </button>

      {anchor &&
        createPortal(
          <motion.div
            ref={menu}
            role="menu"
            aria-label={`Interact with ${name}`}
            initial={{
              opacity: 0,
              scale: 0.9,
              y: placement === "below" ? -4 : 4,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            style={{
              left: Math.min(Math.max(anchor.x, 150), window.innerWidth - 150),
              top: anchor.y,
            }}
            className={`fixed z-[70] w-max -translate-x-1/2 rounded-2xl border border-line bg-surface p-2 shadow-soft ${
              placement === "below" ? "mt-2" : "-translate-y-full -mt-2"
            }`}
          >
            <p className="px-1 pb-1.5 text-[11px] font-semibold text-muted">
              Throw at {name}
            </p>
            <div className="flex gap-1">
              {THROWABLES.map((t) => (
                <button
                  key={t.emoji}
                  type="button"
                  role="menuitem"
                  aria-label={`Throw ${t.label.toLowerCase()}`}
                  title={t.label}
                  onClick={() => actions.onThrow(id, t.emoji)}
                  className="grid size-9 place-items-center rounded-xl text-xl transition hover:scale-115 hover:bg-surface-raised active:scale-90"
                >
                  {t.emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                actions.onPoke(id);
                setAnchor(null);
              }}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-raised py-1.5 text-xs font-semibold transition hover:bg-accent-soft hover:text-accent"
            >
              <span aria-hidden>👉</span> Poke {name}
            </button>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}
