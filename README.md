# KLARA PLANNING POKER

Real-time planning poker with a meme for every reveal. Next.js (App Router) + TypeScript + Tailwind,
Supabase Realtime (Presence + Broadcast, **no database tables**), GIPHY, Framer Motion, canvas-confetti.

## Features

- Create / join rooms with readable ids (`brave-otter-42`), copy invite link
- Name + role (Voter / Spectator) modal, remembered in `localStorage`; editable any time
- Story points (0, ½, 1, 2, 3, 5, 8, 13, 21, ?, ☕) or Hourly (1h … 40h, ?, ☕) decks
- Host controls: deck, reveal, new round, auto-reveal, memes on/off, hand over host
- 3D card flip, average / median / min–max / distribution, suggested Fibonacci card or "≈ X days",
  lowest/highest outliers highlighted, round history drawer
- Outcome-based GIPHY meme chosen by the host and broadcast so everyone sees the same one;
  confetti on consensus; emoji fallback when GIPHY is unavailable
- Dark/light theme, responsive (participant list + scrollable card sheet on mobile), keyboard play

### Keyboard

| Key | Action |
|---|---|
| `1`–`9`, `0` | Pick the Nth card (hint shown on each card) |
| `?` / `C` | Pick ? / ☕ |
| `Esc` | Un-select your card |
| Arrows + `Enter`/`Space` | Move through the hand and pick |
| `R` / `N` | Host: reveal / new round |

## How it works

There's no server state. Each room is a Supabase Realtime channel `klara-poker:<roomId>`:

- **Presence**: each client tracks `{ id, name, role, joinedAt, vote, voteRound }`. The client id is
  kept in `localStorage`, so a refresh doesn't create a duplicate participant.
- **Broadcast**: the host owns a versioned `RoomState` (deck, revealed, vote snapshot, meme,
  history…) and broadcasts it on every change and whenever someone joins. New clients also send
  `request-state` when they connect.
- **Host election**: if the host leaves for more than about 3.5s, every client works out the same
  successor (the longest-connected voter), and that client takes over. Hosts can also hand over manually.
- An empty room simply disappears.

Without Supabase keys the app runs in **local demo mode** using `BroadcastChannel`. Rooms then sync
only between tabs of one browser, and each tab acts as a separate person, which is handy for development.

Code map: `lib/realtime.ts` (transport + `useRoom` hook), `lib/stats.ts` (results & outcome rules),
`lib/memes.ts` (query pools, fallback cards), `app/api/meme/route.ts` (server-side GIPHY proxy),
`components/` (UI).

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in keys (optional — see below)
npm run dev                  # http://localhost:3000
```

### Supabase keys (free tier)

1. Sign up at <https://supabase.com> → **New project** (any name/region; save the DB password, it's not used).
2. **Project Settings → API**: copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and the
   **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. That's it. Realtime Broadcast and Presence work on public channels without tables or migrations.

### GIPHY key (free)

1. Go to <https://developers.giphy.com> → **Create an App** → choose **API**.
2. Copy the API key → `GIPHY_API_KEY`. It's only read by `app/api/meme/route.ts` and never
   reaches the browser. Searches use `rating=pg-13`, and a random pick comes from the top 25 results,
   skipping GIFs already shown in the session.

## Deploy to Vercel

1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. On <https://vercel.com/new>, **Import** the repo. The framework preset is detected as Next.js; keep the defaults.
3. Under **Environment Variables** add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   and `GIPHY_API_KEY` (Production + Preview).
4. Click **Deploy**. Share `https://<your-app>.vercel.app/room/<room-id>` links with the team.

If you change env vars later, **redeploy**. `NEXT_PUBLIC_*` values are inlined at build time.

The CLI works too: `npm i -g vercel && vercel`, then `vercel env add …` for each variable and `vercel --prod`.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run lint`
