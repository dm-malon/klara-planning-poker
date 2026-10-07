"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateRoomId, parseRoomInput } from "@/lib/roomId";
import { realtimeMode } from "@/lib/realtime";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { Wordmark } from "./Wordmark";

const FAN: {
  label: string;
  rotate: number;
  x: number;
  y: number;
  back?: boolean;
}[] = [
  { label: "3", rotate: -12, x: -126, y: 10 },
  { label: "5", rotate: -4, x: -42, y: 0 },
  { label: "8", rotate: 4, x: 42, y: 0, back: true },
  { label: "13", rotate: 12, x: 126, y: 10 },
];

const SEATS = [
  { name: "Olena K", icon: "🦊", left: "50%", top: "6%" },
  { name: "Max", icon: "🤖", left: "4%", top: "50%" },
  { name: "Taras B", icon: null, left: "96%", top: "50%" },
  { name: "Iryna", icon: "🦄", left: "50%", top: "94%" },
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
      setError(
        "That doesn't look like a room code. Try something like brave-otter-42.",
      );
      return;
    }
    router.push(`/room/${id}`);
  };

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Wordmark />
        <ThemeToggle />
      </header>

      <section className="grid flex-1 items-center gap-12 pb-16 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.05,
              type: "spring",
              stiffness: 120,
              damping: 18,
            }}
          >
            <Wordmark size="xl" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 max-w-md text-lg text-muted"
          >
            Sabrina told us 13 times that our planning poker app had no licence.
            So this one&apos;s for you, Sabrina — we just want to protect your
            health. 💜
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-start"
          >
            <button
              onClick={create}
              className="group accent-gradient inline-flex h-14 items-center justify-center gap-3 rounded-full px-8 font-display text-lg font-semibold text-accent-ink shadow-[0_12px_30px_-12px_var(--accent)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              Create room
              <span
                aria-hidden
                className="transition group-hover:translate-x-1"
              >
                →
              </span>
            </button>

            {joining ? (
              <form onSubmit={join} className="flex flex-col gap-1.5">
                <div className="flex h-14 overflow-hidden rounded-full border border-line-strong bg-surface shadow-soft focus-within:border-accent">
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
                  <p
                    id="room-code-error"
                    className="max-w-xs text-sm text-high"
                  >
                    {error}
                  </p>
                )}
              </form>
            ) : (
              <button
                onClick={() => setJoining(true)}
                className="inline-flex h-14 items-center justify-center rounded-full border border-line-strong bg-surface px-8 font-display text-lg font-semibold shadow-soft transition hover:border-text"
              >
                Join room
              </button>
            )}
          </motion.div>

          {realtimeMode === "local" && (
            <p className="mt-6 max-w-md rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
              <strong className="text-text">Local demo mode.</strong> Supabase
              keys aren&apos;t set, so rooms only sync between tabs of this
              browser. See the README to go live.
            </p>
          )}
        </div>

        <div
          className="relative mx-auto hidden aspect-[1.55/1] w-full max-w-[560px] lg:block"
          aria-hidden
        >
          <div className="table-surface absolute inset-x-[10%] inset-y-[17%] rounded-full" />

          {SEATS.map((seat, i) => (
            <motion.div
              key={seat.name}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.5 + i * 0.08,
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: seat.left, top: seat.top }}
            >
              <Avatar name={seat.name} icon={seat.icon} size="lg" />
            </motion.div>
          ))}

          <div className="absolute inset-0 grid place-items-center">
            <div className="relative h-36 w-[6.5rem]">
              {FAN.map((c, i) => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 60, rotate: 0, x: 0 }}
                  animate={{ opacity: 1, y: c.y, rotate: c.rotate, x: c.x }}
                  whileHover={{ y: c.y - 16 }}
                  transition={{
                    delay: 0.2 + i * 0.08,
                    type: "spring",
                    stiffness: 160,
                    damping: 18,
                  }}
                  className={`gloss absolute inset-0 rounded-2xl shadow-[0_18px_36px_-14px_rgba(12,12,20,0.35)] ${
                    c.back ? "card-back" : "card-face"
                  }`}
                >
                  {!c.back && (
                    <>
                      <span className="absolute top-2 left-2.5 font-display text-sm font-bold">
                        {c.label}
                      </span>
                      <span className="absolute inset-0 grid place-items-center font-display text-5xl font-bold">
                        {c.label}
                      </span>
                      <span className="absolute right-2.5 bottom-2 rotate-180 font-display text-sm font-bold">
                        {c.label}
                      </span>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
