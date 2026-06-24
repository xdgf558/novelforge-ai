type ScrollStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function safeReadScroll(
  storage: ScrollStorage | null | undefined,
  storageKey: string,
) {
  try {
    return storage?.getItem(storageKey) ?? null;
  } catch {
    return null;
  }
}

export function safeWriteScroll(
  storage: ScrollStorage | null | undefined,
  storageKey: string,
  position: {
    left: number;
    top: number;
  },
) {
  try {
    storage?.setItem(storageKey, JSON.stringify(position));
  } catch {
    // Storage can be blocked in hardened WebViews/private modes. Never block submit.
  }
}

export function safeRemoveScroll(
  storage: ScrollStorage | null | undefined,
  storageKey: string,
) {
  try {
    storage?.removeItem(storageKey);
  } catch {
    // Restore is best-effort; storage cleanup failures should not break rendering.
  }
}
