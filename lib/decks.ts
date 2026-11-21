export type DeckId = "story" | "hourly" | "tshirt";

export const QUESTION = "?";
export const COFFEE = "coffee";

export interface Card {
  /** Wire value stored in presence / state. */
  value: string;
  /** What is printed on the card face. */
  label: string;
  /** Numeric value, or null for ? and ☕. */
  numeric: number | null;
}

/**
 * How a deck's numbers read: story points are plain numbers, hours carry an
 * "h" and convert to days, sizes are ordinal (1–6) and always shown as a size.
 */
export type Scale = "points" | "hours" | "sizes";

export interface Deck {
  id: DeckId;
  name: string;
  short: string;
  unit: string;
  icon: string;
  scale: Scale;
  cards: Card[];
  /** Outcome thresholds (numeric): a max this big is "huge", all at most this is "tiny". */
  hugeAt: number;
  tinyAt: number;
}

const special: Card[] = [
  { value: QUESTION, label: "?", numeric: null },
  { value: COFFEE, label: "☕", numeric: null },
];

export const DECKS: Record<DeckId, Deck> = {
  story: {
    id: "story",
    name: "Story points",
    short: "SP",
    unit: "SP",
    icon: "🃏",
    scale: "points",
    hugeAt: 21,
    tinyAt: 1,
    cards: [
      { value: "0", label: "0", numeric: 0 },
      { value: "0.5", label: "½", numeric: 0.5 },
      ...[1, 2, 3, 5, 8, 13, 21].map((n) => ({
        value: String(n),
        label: String(n),
        numeric: n,
      })),
      ...special,
    ],
  },
  hourly: {
    id: "hourly",
    name: "Hourly",
    short: "Hours",
    unit: "h",
    icon: "⏱",
    scale: "hours",
    hugeAt: 40,
    tinyAt: 2,
    cards: [
      ...[1, 2, 4, 6, 8, 12, 16, 24, 40].map((n) => ({
        value: String(n),
        label: `${n}h`,
        numeric: n,
      })),
      ...special,
    ],
  },
  tshirt: {
    id: "tshirt",
    name: "T-shirt",
    short: "Size",
    unit: "",
    icon: "👕",
    scale: "sizes",
    hugeAt: 6,
    tinyAt: 1,
    cards: [
      // Ordinal values: the maths (spread, median, outliers) works on steps.
      ...["XS", "S", "M", "L", "XL", "XL+"].map((size, i) => ({
        value: size,
        label: size,
        numeric: i + 1,
      })),
      ...special,
    ],
  },
};

const HOURS_PER_DAY = 8;

/** Whether results lead with a suggested card (vs. an hourly average). */
export function suggestsCard(deckId: DeckId): boolean {
  return DECKS[deckId].scale !== "hours";
}

/** A number from the results (average, median, min…) as this deck shows it. */
export function formatValue(deckId: DeckId, n: number | null): string {
  if (n === null) return "—";
  const deck = DECKS[deckId];
  if (deck.scale === "sizes") {
    // Ordinal: show the nearest size (ties round up, like suggestions).
    const cards = numericCards(deckId);
    const i = Math.min(cards.length, Math.max(1, Math.floor(n + 0.5))) - 1;
    return cards[i].label;
  }
  const s = n === 0.5 ? "½" : Number.isInteger(n) ? String(n) : n.toFixed(1);
  return deck.scale === "hours" ? `${s}h` : s;
}

/** One-line result: "5 SP", "M", or "12h ≈ 1.5d". Null when there's nothing numeric. */
export function resultSummary(
  deckId: DeckId,
  suggested: string | null,
  average: number | null,
): string | null {
  if (average === null) return null;
  const deck = DECKS[deckId];
  if (deck.scale === "hours") {
    const days = Math.round((average / HOURS_PER_DAY) * 10) / 10;
    return `${formatValue(deckId, average)} ≈ ${formatValue("story", days)}d`;
  }
  const label = findCard(deckId, suggested)?.label;
  if (!label) return null;
  return deck.scale === "points" ? `${label} SP` : label;
}

export function findCard(
  deckId: DeckId,
  value: string | null | undefined,
): Card | undefined {
  if (value == null) return undefined;
  return DECKS[deckId].cards.find((c) => c.value === value);
}

export function numericCards(deckId: DeckId): Card[] {
  return DECKS[deckId].cards.filter((c) => c.numeric !== null);
}
