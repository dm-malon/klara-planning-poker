"use client";

import { motion } from "framer-motion";

/** Full-page notice when the realtime server can't be reached at all. */
export function ServerDown() {
  return (
    <div className="grid flex-1 place-items-center">
      <motion.div
        role="alert"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex max-w-md flex-col items-center rounded-3xl border border-line bg-surface p-8 text-center shadow-soft"
      >
        <span aria-hidden className="text-5xl">
          😴
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
          The poker server is unavailable
        </h2>
        <p className="mt-2 text-muted">
          We can&apos;t reach the server right now. It may be asleep or down.
          Please contact the admin.
        </p>
        <p className="mt-2 text-sm text-faint">
          We keep trying in the background. This page reconnects by itself once
          the server is back.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 h-11 rounded-full border border-line-strong bg-surface px-6 font-display font-semibold shadow-soft transition hover:border-text"
        >
          Try again
        </button>
      </motion.div>
    </div>
  );
}

/** Slim banner when the connection drops in the middle of a session. */
export function ConnectionLost() {
  return (
    <p
      role="alert"
      className="flex items-center justify-center gap-2 rounded-xl border border-high/30 bg-high/8 px-4 py-2.5 text-center text-sm"
    >
      <span aria-hidden>⚠️</span>
      <span>
        <strong>Connection lost.</strong> Trying to reconnect… If it
        doesn&apos;t come back, the server may be down. Please contact the
        admin.
      </span>
    </p>
  );
}
