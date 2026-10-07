import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Table not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-10 h-32 w-56" aria-hidden>
        <div className="card-face absolute top-2 left-6 h-28 w-20 -rotate-12 rounded-2xl" />
        <div className="card-back absolute top-0 left-1/2 h-28 w-20 -translate-x-1/2 rounded-2xl" />
        <div className="card-face absolute top-2 right-6 grid h-28 w-20 rotate-12 place-items-center rounded-2xl font-display text-4xl font-bold">
          ?
        </div>
      </div>
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        This table doesn&apos;t exist
      </h1>
      <p className="mt-4 text-lg text-muted">
        The link might be mistyped, or the page has folded. Grab a new table and
        deal again.
      </p>
      <Link
        href="/"
        className="accent-gradient mt-8 inline-flex h-12 items-center gap-2 rounded-full px-7 font-display font-semibold text-white shadow-[0_12px_30px_-12px_var(--accent)] transition hover:-translate-y-0.5"
      >
        <span aria-hidden>←</span> Back to KLARA
      </Link>
    </main>
  );
}
