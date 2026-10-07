"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NAME_MAX, cleanName, type Role } from "@/lib/identity";
import { Avatar } from "./Avatar";
import { RoleSwitch } from "./RoleSwitch";

export function JoinModal({
  mode,
  roomId,
  initialName,
  initialRole,
  onSubmit,
  onClose,
}: {
  mode: "join" | "edit";
  roomId: string;
  initialName: string;
  initialRole: Role;
  onSubmit: (name: string, role: Role) => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<Role>(initialRole);
  const clean = cleanName(name);
  const valid = clean.length >= 1;

  useEffect(() => {
    if (mode !== "edit" || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={mode === "edit" ? onClose : undefined}
    >
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        initial={{ y: 30, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(clean, role);
        }}
        className="w-full max-w-sm rounded-3xl border border-line bg-surface-strong p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center gap-3">
          <Avatar name={clean || "?"} size="lg" />
          <div className="min-w-0">
            <h2 id="join-title" className="font-display text-2xl font-extrabold tracking-tight">
              {mode === "join" ? "Take a seat" : "Your profile"}
            </h2>
            <p className="truncate font-mono text-xs text-muted">{roomId}</p>
          </div>
        </div>

        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
          Name
        </label>
        <input
          id="name"
          autoFocus
          autoComplete="nickname"
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Olena"
          className="h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-base outline-none placeholder:text-faint focus:border-accent"
        />
        <p className="mt-1 text-right font-mono text-[11px] text-faint">
          {clean.length}/{NAME_MAX}
        </p>

        <p className="mb-1.5 text-sm font-semibold" id="role-label">
          Join as
        </p>
        <RoleSwitch value={role} onChange={setRole} labelledBy="role-label" wide />
        <p className="mt-2 text-xs text-muted">
          {role === "voter"
            ? "You'll get a hand of cards and vote each round."
            : "You'll watch the table without voting — great for POs and guests."}
        </p>

        <div className="mt-6 flex gap-2">
          {mode === "edit" && (
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-xl border border-line-strong font-semibold transition hover:bg-surface-raised"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!valid}
            className="h-12 flex-[2] rounded-xl bg-accent font-display text-lg font-bold text-accent-ink transition hover:brightness-105 disabled:opacity-40"
          >
            {mode === "join" ? "Join table" : "Save"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
