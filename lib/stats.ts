import { COFFEE, DECKS, DeckId, QUESTION, findCard, numericCards } from "./decks";

export type Outcome =
  | "consensus"
  | "near"
  | "disagreement"
  | "unknown"
  | "coffee"
  | "huge"
  | "tiny"
  | "mixed"
  | "empty";

export interface RoundResult {
  count: number;
  numericCount: number;
  average: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  /** Card-step distance between min and max numeric votes. */
  spread: number;
  /** Story points: nearest deck card to the average. */
  suggested: string | null;
  /** Hourly: average expressed in 8h days. */
  days: number | null;
  distribution: { value: string; label: string; count: number }[];
  lowIds: string[];
  highIds: string[];
  outcome: Outcome;
}

export type VoteMap = Record<string, string>;

const HOURS_PER_DAY = 8;

export function computeResult(deckId: DeckId, votes: VoteMap): RoundResult {
  const deck = DECKS[deckId];
  const entries = Object.entries(votes);
  const numCards = numericCards(deckId);
  const stepOf = (v: string) => numCards.findIndex((c) => c.value === v);

  const numeric = entries
    .map(([id, v]) => ({ id, v, n: findCard(deckId, v)?.numeric ?? null }))
    .filter((e): e is { id: string; v: string; n: number } => e.n !== null);

  const nums = numeric.map((e) => e.n).sort((a, b) => a - b);
  const average = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
  const median = nums.length
    ? nums.length % 2
      ? nums[(nums.length - 1) / 2]
      : (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
    : null;
  const min = nums.length ? nums[0] : null;
  const max = nums.length ? nums[nums.length - 1] : null;

  const steps = numeric.map((e) => stepOf(e.v));
  const spread = steps.length ? Math.max(...steps) - Math.min(...steps) : 0;

  let suggested: string | null = null;
  if (deckId === "story" && average !== null) {
    let best = numCards[0];
    for (const c of numCards) {
      const d = Math.abs(c.numeric! - average);
      const bestD = Math.abs(best.numeric! - average);
      // Ties round up: under-estimating hurts more than over-estimating.
      if (d < bestD || (d === bestD && c.numeric! > best.numeric!)) best = c;
    }
    suggested = best.value;
  }

  const days = deckId === "hourly" && average !== null ? average / HOURS_PER_DAY : null;

  const distribution = deck.cards
    .map((c) => ({
      value: c.value,
      label: c.label,
      count: entries.filter(([, v]) => v === c.value).length,
    }))
    .filter((d) => d.count > 0);

  const lowIds = spread > 0 ? numeric.filter((e) => e.n === min).map((e) => e.id) : [];
  const highIds = spread > 0 ? numeric.filter((e) => e.n === max).map((e) => e.id) : [];

  return {
    count: entries.length,
    numericCount: nums.length,
    average,
    median,
    min,
    max,
    spread,
    suggested,
    days,
    distribution,
    lowIds,
    highIds,
    outcome: classify(deckId, entries.map(([, v]) => v), nums, spread),
  };
}

/** Priority order matters: the first matching rule decides the meme. */
function classify(deckId: DeckId, values: string[], nums: number[], spread: number): Outcome {
  if (values.length === 0) return "empty";
  if (values.every((v) => v === QUESTION)) return "unknown";
  if (values.some((v) => v === COFFEE)) return "coffee";
  if (nums.length === 0) return "unknown";
  if (spread === 0) return "consensus";
  const max = nums[nums.length - 1];
  if (deckId === "story" ? max >= 21 : max >= 40) return "huge";
  if (nums.every((n) => (deckId === "story" ? n <= 1 : n <= 2))) return "tiny";
  if (spread >= 3) return "disagreement";
  if (spread <= 1) return "near";
  return "mixed";
}

export function formatNumber(n: number | null, digits = 1): string {
  if (n === null) return "—";
  if (n === 0.5) return "½";
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}
