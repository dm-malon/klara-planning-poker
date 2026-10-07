import { avatarColor, initials } from "@/lib/avatar";

const SIZES = {
  sm: "size-7 text-[11px]",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

export function Avatar({
  name,
  size = "md",
  ring,
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZES;
  /** Optional highlight ring color (CSS color). */
  ring?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-display font-bold text-white shadow-md select-none ${SIZES[size]} ${className}`}
      style={{
        background: `linear-gradient(145deg, ${avatarColor(name)}, color-mix(in oklab, ${avatarColor(name)} 70%, black))`,
        boxShadow: ring ? `0 0 0 2px var(--bg), 0 0 0 4px ${ring}` : undefined,
      }}
    >
      {initials(name)}
    </span>
  );
}
