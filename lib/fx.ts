/** One-off fun effects between people. Broadcast only — never part of RoomState. */

export const THROWABLES = [
  { emoji: "🍅", label: "Tomato" },
  { emoji: "✈️", label: "Paper plane" },
  { emoji: "🍪", label: "Cookie" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🥚", label: "Egg" },
  { emoji: "🎯", label: "Dart" },
] as const;

export const REACTIONS = ["👍", "😂", "😱", "🤯", "🎉", "🙈"] as const;

/** What flies off on impact — a little splat per throwable. */
export const SPLATS: Record<string, string[]> = {
  "🍅": ["💥", "🔴", "🔴"],
  "✈️": ["💨"],
  "🍪": ["✨", "🟤", "🟤"],
  "❤️": ["💖", "💕", "💗"],
  "🥚": ["🍳", "💛"],
  "🎯": ["💫"],
};

export type Fx =
  | { kind: "throw"; id: string; from: string; to: string; emoji: string }
  | { kind: "poke"; id: string; from: string; to: string }
  | { kind: "react"; id: string; from: string; emoji: string };

const isId = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 64;
const throwable = new Set<string>(THROWABLES.map((t) => t.emoji));
const reaction = new Set<string>(REACTIONS);

/** Effects arrive from other clients — accept only well-formed ones from our catalogs. */
export function parseFx(raw: unknown): Fx | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (!isId(f.id) || !isId(f.from)) return null;
  if (f.kind === "throw" && isId(f.to) && throwable.has(f.emoji as string))
    return {
      kind: "throw",
      id: f.id,
      from: f.from,
      to: f.to,
      emoji: f.emoji as string,
    };
  if (f.kind === "poke" && isId(f.to))
    return { kind: "poke", id: f.id, from: f.from, to: f.to };
  if (f.kind === "react" && reaction.has(f.emoji as string))
    return { kind: "react", id: f.id, from: f.from, emoji: f.emoji as string };
  return null;
}

/** Sliding-window limiter so nobody can carpet-bomb the room. */
export function createRateLimiter(max: number, windowMs: number) {
  let stamps: number[] = [];
  return () => {
    const now = Date.now();
    stamps = stamps.filter((t) => now - t < windowMs);
    if (stamps.length >= max) return false;
    stamps.push(now);
    return true;
  };
}
