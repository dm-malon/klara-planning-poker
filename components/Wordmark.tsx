export function Wordmark({ size = "sm" }: { size?: "sm" | "xl" }) {
  if (size === "xl") {
    return (
      <h1 className="font-display leading-[0.85] font-extrabold tracking-[-0.04em]">
        <span className="block text-[clamp(3.5rem,13vw,9.5rem)] text-text">KLARA</span>
        <span className="wordmark-gradient block text-[clamp(1.6rem,6vw,4.4rem)] tracking-[-0.02em]">
          PLANNING POKER
        </span>
      </h1>
    );
  }
  return (
    <span className="font-display text-base leading-none font-extrabold tracking-tight whitespace-nowrap sm:text-lg">
      KLARA <span className="text-accent">PLANNING POKER</span>
    </span>
  );
}

export function Suits({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex gap-1.5 ${className}`}>
      <span>♠</span>
      <span className="text-high">♥</span>
      <span className="text-high">♦</span>
      <span>♣</span>
    </span>
  );
}
