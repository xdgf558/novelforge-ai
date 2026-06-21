"use client";

import { useEffect } from "react";

const scrollStorageKey = "novelforge:form-scroll-position";

type StoredScrollPosition = {
  pathname: string;
  savedAt: number;
  y: number;
};

export function FormScrollRestoration() {
  useEffect(() => {
    restoreScrollPosition();

    const handleSubmit = (event: SubmitEvent) => {
      if (!(event.target instanceof HTMLFormElement)) {
        return;
      }

      sessionStorage.setItem(
        scrollStorageKey,
        JSON.stringify({
          pathname: window.location.pathname,
          savedAt: Date.now(),
          y: window.scrollY,
        } satisfies StoredScrollPosition),
      );
    };

    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}

function restoreScrollPosition() {
  const stored = readStoredScrollPosition();

  if (!stored) {
    return;
  }

  sessionStorage.removeItem(scrollStorageKey);

  const isFresh = Date.now() - stored.savedAt < 60_000;
  const isSamePage = stored.pathname === window.location.pathname;

  if (!isFresh || !isSamePage || stored.y <= 0) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: stored.y,
        behavior: "auto",
      });
    });
  });
}

function readStoredScrollPosition() {
  const raw = sessionStorage.getItem(scrollStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredScrollPosition>;

    if (
      typeof parsed.pathname !== "string" ||
      typeof parsed.savedAt !== "number" ||
      typeof parsed.y !== "number"
    ) {
      return null;
    }

    return parsed as StoredScrollPosition;
  } catch {
    return null;
  }
}
