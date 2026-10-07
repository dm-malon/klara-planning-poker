import { isAvatarIcon } from "./avatar";

export type Role = "voter" | "spectator";

export interface Identity {
  id: string;
  name: string;
  role: Role;
  /** Emoji avatar, or null for initials. */
  icon: string | null;
}

const KEY_ID = "klara.clientId";
const KEY_NAME = "klara.name";
const KEY_ROLE = "klara.role";
const KEY_ICON = "klara.icon";

type Store = "local" | "session";

function storage(store: Store): Storage | null {
  try {
    return store === "local" ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

function safeGet(key: string, store: Store = "local"): string | null {
  try {
    return storage(store)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string, store: Store = "local") {
  try {
    storage(store)?.setItem(key, value);
  } catch {
    /* private mode — identity just won't survive a refresh */
  }
}

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Stable identity; name is empty until the user picks one.
 * `perTab` (local demo mode) keys identity to the tab so several tabs act as
 * different people; the last used name is still offered as a suggestion.
 */
export function loadIdentity(perTab = false): {
  identity: Identity;
  suggestedName: string;
} {
  const store: Store = perTab ? "session" : "local";
  let id = safeGet(KEY_ID, store);
  if (!id) {
    id = randomId();
    safeSet(KEY_ID, id, store);
  }
  const role = safeGet(KEY_ROLE, store) === "spectator" ? "spectator" : "voter";
  const name = safeGet(KEY_NAME, store) ?? "";
  const savedIcon = safeGet(KEY_ICON, store);
  const icon = isAvatarIcon(savedIcon) ? savedIcon : null;
  return {
    identity: { id, name, role, icon },
    suggestedName: name || (safeGet(KEY_NAME) ?? ""),
  };
}

export function saveIdentity(identity: Identity, perTab = false) {
  const store: Store = perTab ? "session" : "local";
  safeSet(KEY_NAME, identity.name, store);
  safeSet(KEY_ROLE, identity.role, store);
  safeSet(KEY_ICON, identity.icon ?? "", store);
  if (perTab) safeSet(KEY_NAME, identity.name);
}

export const NAME_MAX = 24;

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}
