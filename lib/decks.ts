export type DeckId = "story" | "hourly";

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

export interface Deck {
  id: DeckId;
  name: string;
  short: string;
  unit: string;
  cards: Card[];
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
    cards: [
      ...[1, 2, 4, 6, 8, 12, 16, 24, 40].map((n) => ({
        value: String(n),
        label: `${n}h`,
        numeric: n,
      })),
      ...special,
    ],
  },
};

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
