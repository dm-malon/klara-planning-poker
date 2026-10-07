/**
 * Daily keep-alive, called by Vercel Cron (see vercel.json).
 *
 * Supabase pauses free projects after ~7 days without *database* activity, and
 * this app otherwise only uses Realtime — so we run one trivial query a day via
 * the `public.ping()` function (SQL in README → "Keep Supabase awake").
 */
export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that env var is set.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/ping`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    const body = await res.text();
    return Response.json(
      { ok: res.ok, status: res.status, response: body.slice(0, 200) },
      { status: res.ok ? 200 : 502 },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "fetch failed" },
      { status: 502 },
    );
  }
}
