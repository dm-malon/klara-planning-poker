import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  message: string;
  icon?: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, icon?: string, ttl = 3200) {
  const t = { id: nextId++, message, icon };
  toasts = [...toasts.slice(-3), t];
  emit();
  setTimeout(() => dismissToast(t.id), ttl);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const EMPTY: Toast[] = [];

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
}
