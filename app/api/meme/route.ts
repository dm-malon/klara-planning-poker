import type { NextRequest } from "next/server";

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  images: { downsized_medium?: GiphyImage; fixed_height: GiphyImage; original: GiphyImage };
}

export async function GET(req: NextRequest) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return Response.json({ error: "GIPHY_API_KEY not configured" }, { status: 503 });

  const q = req.nextUrl.searchParams.get("q")?.slice(0, 50).trim();
  if (!q) return Response.json({ error: "missing q" }, { status: 400 });
  const exclude = new Set((req.nextUrl.searchParams.get("exclude") ?? "").split(",").filter(Boolean));

  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.search = new URLSearchParams({
    api_key: key,
    q,
    limit: "25",
    rating: "pg-13",
    lang: "en",
  }).toString();

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return Response.json({ error: `giphy ${res.status}` }, { status: 502 });
    const { data } = (await res.json()) as { data: GiphyGif[] };
    const fresh = data.filter((g) => !exclude.has(g.id));
    const pool = fresh.length ? fresh : data;
    if (!pool.length) return Response.json({ error: "no results" }, { status: 404 });

    const gif = pool[Math.floor(Math.random() * pool.length)];
    const img = gif.images.downsized_medium ?? gif.images.fixed_height ?? gif.images.original;
    return Response.json(
      {
        id: gif.id,
        url: img.url,
        width: Number(img.width),
        height: Number(img.height),
        title: gif.title,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "giphy unreachable" }, { status: 502 });
  }
}
