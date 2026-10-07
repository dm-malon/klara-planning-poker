@AGENTS.md

# KLARA PLANNING POKER

Real-time planning poker. Next.js 16 (App Router, `cacheComponents` on) + React 19 + TypeScript +
Tailwind v4, Supabase Realtime, GIPHY, Framer Motion, canvas-confetti. Deployed on Vercel.

## Commands

- `npm run dev`: dev server (works with no env vars, using local demo mode)
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint, including React Compiler rules (`react-hooks/*`). Must pass.
- `npx tsc --noEmit`: type-check only

There's no test suite yet. Check behaviour by opening one room in several tabs.

## Architecture

- **No database, no server state.** Each room is a Realtime channel `klara-poker:<roomId>`.
  - Presence carries each `Participant` (`id, name, icon, role, joinedAt, vote, voteRound`).
    `icon` must be one of `AVATAR_ICONS` in `lib/avatar.ts`; anything else renders as initials.
  - Broadcast carries the host-owned `RoomState`. Its events are `state` and `request-state`.
  - The `fx` broadcast event carries one-off fun effects (throw / poke / react, `lib/fx.ts`). These
    never touch `RoomState`. Receivers validate them with `parseFx()`, senders are rate-limited, and
    `FxLayer` finds avatars on screen through their `data-seat` attribute.
- **The host is the only writer of `RoomState`.** Every write goes through `commit()` in
  `lib/realtime.ts`, which bumps `version` and broadcasts. Clients resolve competing states with
  `isNewer()`. Non-hosts only change their own presence.
- **Votes count only when `voteRound === state.roundId`.** A new round means a new `roundId`, so
  nobody has to clear their vote. At reveal the host snapshots the votes into `state.votes`.
- **Host election**: if `hostId` is missing from presence for longer than `HOST_GRACE_MS`, the
  client that `electHost()` picks (longest-connected voter) takes over.
- **Transport**: Supabase when the `NEXT_PUBLIC_SUPABASE_*` env vars are set. Otherwise a
  `BroadcastChannel` stand-in (`realtimeMode === "local"`) where identity is per tab
  (sessionStorage), so several tabs act as different people.
- **Memes**: the host picks the outcome query (`lib/memes.ts`) and calls `/api/meme`, which keeps
  `GIPHY_API_KEY` on the server. The host then broadcasts the chosen meme inside `RoomState`. If
  that fails, an emoji fallback card is shown.

## Layout

- `lib/realtime.ts`: transports and the `useRoom` hook (state, presence, actions)
- `lib/stats.ts`: `computeResult()` and outcome classification (rule order matters)
- `lib/decks.ts`: deck definitions (`value` goes over the wire, `label` is displayed)
- `lib/memes.ts`, `app/api/meme/route.ts`: meme pools, fallback cards and the GIPHY proxy
- `lib/identity.ts`: client id, name and role in browser storage
- `components/Room.tsx`: page orchestrator, keyboard shortcuts, confetti
- `components/*`: UI pieces (`PokerTable`, `CardHand`, `Results`, `MemeCard`, `HostPanel`, …)
- `app/room/[roomId]/page.tsx`: params are read inside `<Suspense>`, which `cacheComponents` requires

## Conventions

- Style with the theme tokens in `app/globals.css` (`bg-surface`, `text-muted`, `text-accent`, …),
  not raw colors. Dark is the default theme; light is set with `[data-theme="light"]` on `<html>`.
- Don't call `setState` synchronously in effects, and don't read or write refs during render. The
  React Compiler lint rejects both, so derive values with `useMemo` instead.
- Wrap every browser-storage access in try/catch, and guard it for SSR (`typeof window`).
- Keep things accessible: proper roles/aria on interactive elements and visible focus. Every card
  must stay keyboard-selectable.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GIPHY_API_KEY`. See `.env.example`.
