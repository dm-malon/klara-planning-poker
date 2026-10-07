"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("klara.theme", next);
        } catch {
          /* ignore */
        }
      }}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`grid size-9 place-items-center rounded-full border border-line bg-surface text-lg transition hover:border-line-strong hover:bg-surface-raised ${className}`}
    >
      <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
    </button>
  );
}
