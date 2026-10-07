import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "KLARA Planning Poker — real-time planning poker for agile teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#4f46ff";
const ACCENT_2 = "#8b5cf6";
const INK = "#0c0c14";

const CARDS = [
  { label: "3", rotate: -12, x: -138, y: 18 },
  { label: "5", rotate: -4, x: -46, y: 0 },
  { label: "", rotate: 4, x: 46, y: 0 },
  { label: "13", rotate: 12, x: 138, y: 18 },
];

/** Space Grotesk Bold from Google Fonts (TTF); falls back to the default font offline. */
async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700",
      )
    ).text();
    const url = css.match(
      /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/,
    )?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [icon, font] = await Promise.all([
    readFile(join(process.cwd(), "app/icon.svg"), "base64"),
    loadDisplayFont(),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 80px",
        background: "#f6f6f8",
        fontFamily: font ? "Space Grotesk" : undefined,
        backgroundImage:
          "radial-gradient(rgba(15,15,30,0.08) 2px, transparent 2px)",
        backgroundSize: "36px 36px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <img
          src={`data:image/svg+xml;base64,${icon}`}
          width={96}
          height={96}
          alt=""
        />
        <div
          style={{
            marginTop: 36,
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: -6,
            lineHeight: 0.9,
            color: INK,
          }}
        >
          KLARA
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
            color: ACCENT,
          }}
        >
          PLANNING POKER
        </div>
        <div style={{ marginTop: 22, fontSize: 30, color: "#62627a" }}>
          Pick a card, flip together. No sign-up.
        </div>
      </div>

      {/* Table with a fan of cards */}
      <div
        style={{
          width: 500,
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRadius: 150,
          background: "#ffffff",
          border: "2px solid #e9e9ef",
          boxShadow: "0 40px 80px -30px rgba(30,30,80,0.35)",
        }}
      >
        {CARDS.map((c) => (
          <div
            key={c.label || "back"}
            style={{
              position: "absolute",
              width: 104,
              height: 146,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 700,
              color: INK,
              transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rotate}deg)`,
              background: c.label
                ? "#ffffff"
                : `linear-gradient(150deg, ${ACCENT}, ${ACCENT_2})`,
              border: c.label ? "2px solid #e3e3ea" : "none",
              boxShadow: "0 18px 30px -14px rgba(12,12,20,0.35)",
            }}
          >
            {c.label}
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: font
        ? [{ name: "Space Grotesk", data: font, weight: 700, style: "normal" }]
        : [],
    },
  );
}
