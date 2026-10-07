"use client";

import Link from "next/link";
import { DECKS } from "@/lib/decks";
import type { Role } from "@/lib/identity";
import type { ConnStatus, RoomState } from "@/lib/realtime";
import { toast } from "@/lib/toast";
import { Avatar } from "./Avatar";
import { RoleSwitch } from "./RoleSwitch";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

const STATUS: Record<ConnStatus, { color: string; label: string }> = {
  connecting: { color: "bg-accent animate-pulse", label: "Connecting…" },
  online: { color: "bg-good", label: "Live" },
  error: { color: "bg-high", label: "Connection problem" },
};

export function RoomHeader({
  roomId,
  state,
  status,
  name,
  icon,
  role,
  historyCount,
  onRole,
  onEditProfile,
  onHistory,
}: {
  roomId: string;
  state: RoomState | null;
  status: ConnStatus;
  name: string;
  icon: string | null;
  role: Role;
  historyCount: number;
  onRole: (role: Role) => void;
  onEditProfile: () => void;
  onHistory: () => void;
}) {
  const copyLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied", "🔗");
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  };
  const st = STATUS[status];
  const deck = state ? DECKS[state.deck] : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="mr-auto rounded-md sm:mr-0"
          aria-label="KLARA PLANNING POKER home"
        >
          <Wordmark />
        </Link>

        <div className="order-last flex w-full items-center gap-2 sm:order-none sm:mr-auto sm:w-auto">
          <span
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface pr-1 pl-3 font-mono text-xs"
            title={st.label}
          >
            <span className={`size-2 rounded-full ${st.color}`} aria-hidden />
            <span className="sr-only">{st.label}. Room</span>
            <span className="max-w-[9rem] truncate">{roomId}</span>
            <button
              onClick={copyLink}
              className="h-7 rounded-full bg-text px-3 font-sans text-xs font-semibold text-surface transition hover:opacity-85"
            >
              Copy invite link
            </button>
          </span>
          {deck && (
            <span
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-semibold text-accent"
              aria-label={`Estimation mode: ${deck.name}`}
            >
              <span aria-hidden>{deck.id === "story" ? "🃏" : "⏱"}</span>
              {deck.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <RoleSwitch value={role} onChange={onRole} />
          </div>
          <button
            onClick={onHistory}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold transition hover:bg-surface-raised"
            aria-label={`Round history, ${historyCount} rounds`}
          >
            <span aria-hidden>🕘</span>
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
                {historyCount}
              </span>
            )}
          </button>
          <ThemeToggle />
          <button
            onClick={onEditProfile}
            aria-label={`Edit profile (${name})`}
            title="Edit name, avatar & role"
            className="rounded-full transition hover:scale-105"
          >
            <Avatar
              name={name || "?"}
              icon={icon}
              size="md"
              className="!size-9"
            />
          </button>
        </div>

        <div className="w-full sm:hidden">
          <RoleSwitch value={role} onChange={onRole} wide />
        </div>
      </div>
    </header>
  );
}
