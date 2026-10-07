import { avatarColor, initials, isAvatarIcon } from "@/lib/avatar";

const SIZES = {
  sm: { box: "size-7 text-[11px]", emoji: "text-base" },
  md: { box: "size-10 text-sm", emoji: "text-xl" },
  lg: { box: "size-12 text-base", emoji: "text-2xl" },
};

export function Avatar({
  name,
  icon,
  size = "md",
  ring,
  className = "",
}: {
  name: string;
  /** Emoji avatar; anything outside the catalog falls back to initials. */
  icon?: string | null;
  size?: keyof typeof SIZES;
  /** Optional highlight ring color (CSS color). */
  ring?: string;
  className?: string;
}) {
  const color = avatarColor(name);
  const emoji = isAvatarIcon(icon) ? icon : null;
  const s = SIZES[size];

  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-display font-bold shadow-md select-none ${s.box} ${
        emoji ? "" : "text-white"
      } ${className}`}
      style={{
        background: emoji
          ? `color-mix(in oklab, ${color} 22%, var(--surface))`
          : `linear-gradient(145deg, ${color}, color-mix(in oklab, ${color} 70%, black))`,
        boxShadow: ring
          ? `0 0 0 2px var(--bg), 0 0 0 4px ${ring}`
          : emoji
            ? `inset 0 0 0 1px color-mix(in oklab, ${color} 35%, transparent)`
            : undefined,
      }}
    >
      {emoji ? (
        <span className={`leading-none ${s.emoji}`}>{emoji}</span>
      ) : (
        initials(name)
      )}
    </span>
  );
}
