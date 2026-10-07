"use client";

import { DECKS, type DeckId } from "@/lib/decks";
import type { Participant, RoomState } from "@/lib/realtime";
import { Segmented } from "./Segmented";

export function HostPanel({
  state,
  participants,
  myId,
  deckLocked,
  onDeck,
  onAutoReveal,
  onMemes,
  onHandOver,
}: {
  state: RoomState;
  participants: Participant[];
  myId: string;
  deckLocked: boolean;
  onDeck: (deck: DeckId) => void;
  onAutoReveal: (on: boolean) => void;
  onMemes: (on: boolean) => void;
  onHandOver: (id: string) => void;
}) {
  const others = participants.filter((p) => p.id !== myId);

  return (
    <section
      aria-label="Host controls"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3"
    >
      <span className="hidden items-center gap-1.5 text-xs font-bold tracking-widest text-accent uppercase sm:inline-flex">
        <span aria-hidden>👑</span> Host
      </span>
      <span className="hidden flex-1 sm:block" />

      <Segmented
        ariaLabel="Estimation deck"
        value={state.deck}
        disabled={deckLocked}
        title={
          deckLocked
            ? "Votes are in — reveal or start a new round to change the deck"
            : undefined
        }
        onChange={onDeck}
        options={(Object.keys(DECKS) as DeckId[]).map((id) => ({
          value: id,
          label: DECKS[id].name,
        }))}
      />

      <Switch
        label="Auto-reveal"
        checked={state.autoReveal}
        onChange={onAutoReveal}
      />
      <Switch label="Memes" checked={state.memesOn} onChange={onMemes} />

      {others.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="whitespace-nowrap">Hand over</span>
          <select
            value=""
            onChange={(e) => e.target.value && onHandOver(e.target.value)}
            className="h-9 rounded-xl border border-line-strong bg-surface-strong px-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Choose…</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.role === "spectator" ? " (spectator)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-sm font-semibold"
    >
      <span
        className={`relative h-6 w-10 rounded-full border transition-colors ${
          checked
            ? "border-accent bg-accent"
            : "border-line-strong bg-surface-raised"
        }`}
      >
        <span
          className={`absolute top-0.5 size-[18px] rounded-full shadow transition-all ${
            checked ? "left-[19px] bg-accent-ink" : "left-0.5 bg-muted"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
