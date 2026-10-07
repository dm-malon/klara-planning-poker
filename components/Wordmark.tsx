export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`accent-gradient relative inline-grid shrink-0 place-items-center rounded-[28%] font-display font-bold text-white shadow-[0_6px_16px_-6px_var(--accent)] ${className}`}
    >
      <span className="absolute inset-[18%] rotate-[8deg] rounded-[22%] border-[1.5px] border-white/50" />
      <span className="relative text-[0.55em] leading-none">K</span>
    </span>
  );
}

export function Wordmark({ size = "sm" }: { size?: "sm" | "xl" }) {
  if (size === "xl") {
    return (
      <h1 className="font-display leading-[0.9] font-bold tracking-[-0.045em]">
        <span className="block text-[clamp(3.5rem,12vw,8.5rem)] text-text">
          KLARA
        </span>
        <span className="text-gradient block text-[clamp(1.75rem,5.6vw,4rem)] tracking-[-0.03em]">
          PLANNING POKER
        </span>
      </h1>
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="size-8 text-2xl" />
      <span className="font-display text-[15px] leading-none font-bold tracking-tight whitespace-nowrap sm:text-base">
        KLARA <span className="font-medium text-muted">Planning Poker</span>
      </span>
    </span>
  );
}
