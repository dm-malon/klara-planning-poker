"use client";

import { AnimatePresence, motion } from "framer-motion";
import { dismissToast, useToasts } from "@/lib/toast";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 sm:top-[4.75rem]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: -12,
              scale: 0.95,
              transition: { duration: 0.18 },
            }}
            onClick={() => dismissToast(t.id)}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-text py-2.5 pr-5 pl-4 text-sm font-semibold text-surface shadow-[0_12px_32px_-10px_rgba(12,12,20,0.45)]"
          >
            {t.icon && <span aria-hidden>{t.icon}</span>}
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
