"use client";

import { AnimatePresence, motion } from "framer-motion";
import { dismissToast, useToasts } from "@/lib/toast";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 sm:top-auto sm:bottom-6 sm:left-6 sm:right-auto sm:items-start"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
            onClick={() => dismissToast(t.id)}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-line bg-surface-raised/95 py-2 pr-4 pl-3 text-sm font-medium text-text shadow-lg backdrop-blur"
          >
            {t.icon && <span aria-hidden>{t.icon}</span>}
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
