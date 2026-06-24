type ScrollStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type ScrollPosition = {
  left: number;
  top: number;
};

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
  position: ScrollPosition,
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

export function restorePreservedScroll({
  requestAnimationFrame,
  scrollTo,
  storage,
  storageKey,
}: {
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  scrollTo: (left: number, top: number) => void;
  storage: ScrollStorage | null | undefined;
  storageKey: string;
}) {
  const saved = safeReadScroll(storage, storageKey);

  if (!saved) {
    return false;
  }

  safeRemoveScroll(storage, storageKey);

  try {
    const position = JSON.parse(saved) as Partial<ScrollPosition>;

    requestAnimationFrame(() => {
      scrollTo(position.left ?? 0, position.top ?? 0);
    });

    return true;
  } catch {
    return false;
  }
}

export function submitPreserveScrollForm<TEvent>({
  event,
  onSubmit,
  position,
  setSubmitted,
  storage,
  storageKey,
}: {
  event: TEvent;
  onSubmit?: (event: TEvent) => void;
  position: ScrollPosition;
  setSubmitted: (submitted: boolean) => void;
  storage: ScrollStorage | null | undefined;
  storageKey: string;
}) {
  safeWriteScroll(storage, storageKey, position);
  setSubmitted(true);
  onSubmit?.(event);
}
