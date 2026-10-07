"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateRoomId, parseRoomInput } from "@/lib/roomId";
import { realtimeMode } from "@/lib/realtime";
import { ThemeToggle } from "./ThemeToggle";
import { Suits, Wordmark } from "./Wordmark";

const FAN = [
  { label: "3", rotate: -18, x: -96, y: 22 },
  { label: "5", rotate: -6, x: -34, y: 4 },
  { label: "8", rotate: 6, x: 34, y: 4 },
  { label: "☕", rotate: 18, x: 96, y: 22 },
];

export function Landing() {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const create = () => router.push(`/room/${generateRoomId()}`);
  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseRoomInput(code);
    if (!id) {
      setError("That doesn't look like a room code. Try something like brave-otter-42.");
      return;
    }
    router.push(`/room/${id}`);
  };

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Suits className="text-lg text-muted" />
        <ThemeToggle />
      </header>

      <section className="grid flex-1 items-center gap-12 pb-16 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold tracking-widest text-muted uppercase"
          >
            <span className="size-1.5 rounded-full bg-good" /> Real-time estimation · with memes
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 120, damping: 18 }}
          >
            <Wordmark size="xl" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-md text-lg text-muted"
          >
            Pick a card, flip together, argue about the outliers — and get a meme for every
            reveal. No sign-up.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-start"
          >
            <button
              onClick={create}
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-accent px-7 font-display text-lg font-bold text-accent-ink shadow-[0_12px_30px_-10px_var(--accent)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              Create room
              <span aria-hidden className="transition group-hover:translate-x-1">
                →
              </span>
            </button>

            {joining ? (
              <form onSubmit={join} className="flex flex-col gap-1.5">
                <div className="flex h-14 overflow-hidden rounded-2xl border border-line-strong bg-surface focus-within:border-accent">
                  <label htmlFor="room-code" className="sr-only">
                    Room code or invite link
                  </label>
                  <input
                    id="room-code"
                    autoFocus
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setError("");
                    }}
                    placeholder="brave-otter-42"
                    className="w-full min-w-0 bg-transparent px-4 font-mono text-base outline-none placeholder:text-faint sm:w-56"
                    aria-invalid={!!error}
                    aria-describedby={error ? "room-code-error" : undefined}
                  />
                  <button
                    type="submit"
                    className="shrink-0 px-5 font-display font-bold text-text transition hover:bg-surface-raised"
                  >
                    Join
                  </button>
                </div>
                {error && (
                  <p id="room-code-error" className="max-w-xs text-sm text-high">
                    {error}
                  </p>
                )}
              </form>
            ) : (
              <button
                onClick={() => setJoining(true)}
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-line-strong bg-surface px-7 font-display text-lg font-bold transition hover:bg-surface-raised"
              >
                Join room
              </button>
            )}
          </motion.div>

          {realtimeMode === "local" && (
            <p className="mt-6 max-w-md rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
              <strong className="text-text">Local demo mode.</strong> Supabase keys aren&apos;t
              set, so rooms only sync between tabs of this browser. See the README to go live.
            </p>
          )}
        </div>

        <div className="relative hidden h-[420px] lg:block" aria-hidden>
          <div className="felt absolute inset-x-6 top-16 bottom-6 rounded-[50%]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-44 w-32">
              {FAN.map((c, i) => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 80, rotate: 0, x: 0 }}
                  animate={{ opacity: 1, y: c.y - 30, rotate: c.rotate, x: c.x }}
                  whileHover={{ y: c.y - 54 }}
                  transition={{ delay: 0.25 + i * 0.08, type: "spring", stiffness: 140, damping: 16 }}
                  className="card-face gloss absolute inset-0 rounded-2xl"
                >
                  <span className="absolute top-2 left-3 font-display text-lg font-bold">
                    {c.label}
                  </span>
                  <span className="absolute inset-0 grid place-items-center font-display text-6xl font-extrabold">
                    {c.label}
                  </span>
                  <span className="absolute right-3 bottom-2 rotate-180 font-display text-lg font-bold">
                    {c.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
