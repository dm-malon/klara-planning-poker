import type { Outcome } from "./stats";

export interface GifMeme {
  kind: "gif";
  id: string;
  url: string;
  width: number;
  height: number;
  title: string;
}

export interface FallbackMeme {
  kind: "fallback";
  emoji: string;
  caption: string;
}

export type Meme = (GifMeme | FallbackMeme) & {
  outcome: Outcome;
  query: string;
  roundId: string;
};

export const MEME_QUERIES: Record<Outcome, string[]> = {
  consensus: ["nailed it", "perfect", "high five", "mind blown"],
  near: ["close enough", "thumbs up", "good job"],
  disagreement: ["confused", "chaos", "this is fine", "wait what"],
  unknown: ["no idea", "shrug", "confused math"],
  coffee: ["coffee break", "need coffee"],
  huge: ["that's a lot", "scared", "nope"],
  tiny: ["easy peasy", "too easy"],
  mixed: ["hmm", "thinking", "let me think"],
  empty: ["crickets", "anyone"],
};

const FALLBACKS: Record<Outcome, { emoji: string; captions: string[] }> = {
  consensus: {
    emoji: "🎯",
    captions: ["Hive mind activated.", "Same brain, different bodies.", "Nailed it. Ship it."],
  },
  near: { emoji: "👌", captions: ["Close enough for government work.", "Basically twins."] },
  disagreement: {
    emoji: "🔥",
    captions: ["This is fine.", "Did we read the same ticket?", "Somebody explain yourself."],
  },
  unknown: { emoji: "🤷", captions: ["Nobody knows. Nobody ever knew.", "Ask the PO, maybe?"] },
  coffee: { emoji: "☕", captions: ["Caffeine required before estimating.", "Break time, apparently."] },
  huge: { emoji: "😱", captions: ["That's not a ticket, that's an epic.", "Split it. Please."] },
  tiny: { emoji: "🍰", captions: ["Easy peasy lemon squeezy.", "Done before standup."] },
  mixed: { emoji: "🤔", captions: ["Hmm. Let's talk.", "Interesting spread…"] },
  empty: { emoji: "🦗", captions: ["*crickets*", "Anyone? Anyone?"] },
};

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function fallbackMeme(outcome: Outcome, roundId: string, query = ""): Meme {
  const f = FALLBACKS[outcome];
  return { kind: "fallback", emoji: f.emoji, caption: pick(f.captions), outcome, query, roundId };
}

/**
 * Host-side: choose a query for the outcome, ask our API route for a GIF
 * (skipping ones already shown this session), fall back to an emoji card.
 */
export async function chooseMeme(
  outcome: Outcome,
  roundId: string,
  shownIds: string[],
): Promise<Meme> {
  const query = pick(MEME_QUERIES[outcome]);
  try {
    const params = new URLSearchParams({ q: query, exclude: shownIds.slice(-100).join(",") });
    const res = await fetch(`/api/meme?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`meme api ${res.status}`);
    const gif = (await res.json()) as Omit<GifMeme, "kind">;
    return { kind: "gif", ...gif, outcome, query, roundId };
  } catch {
    return fallbackMeme(outcome, roundId, query);
  }
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  consensus: "Full consensus",
  near: "Near consensus",
  disagreement: "Big disagreement",
  unknown: "Nobody knows",
  coffee: "Coffee break",
  huge: "Huge estimate",
  tiny: "Tiny estimate",
  mixed: "Mixed opinions",
  empty: "No votes",
};
