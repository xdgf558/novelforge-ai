import type { OutlineDraftCopySuggestion } from "./outline-draft-copy";
import { outlineLevels } from "./outline-fields";

const storageKeyPrefix = "novelforge:outline-draft-copy:";

type SessionStorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function storeOutlineDraftCopySuggestion(
  storage: SessionStorageLike,
  pathname: string,
  suggestion: OutlineDraftCopySuggestion,
) {
  storage.setItem(storageKey(pathname), JSON.stringify(suggestion));
}

export function consumeOutlineDraftCopySuggestion(
  storage: SessionStorageLike,
  pathname: string,
) {
  const key = storageKey(pathname);
  const storedValue = storage.getItem(key);

  if (!storedValue) {
    return null;
  }

  storage.removeItem(key);

  try {
    const value = JSON.parse(storedValue) as unknown;

    return isOutlineDraftCopySuggestion(value) ? value : null;
  } catch {
    return null;
  }
}

function storageKey(pathname: string) {
  return `${storageKeyPrefix}${pathname}`;
}

function isOutlineDraftCopySuggestion(
  value: unknown,
): value is OutlineDraftCopySuggestion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const suggestion = value as Record<string, unknown>;

  return (
    outlineLevels.includes(
      suggestion.level as (typeof outlineLevels)[number],
    ) &&
    typeof suggestion.title === "string" &&
    typeof suggestion.goal === "string" &&
    optionalPositiveNumber(suggestion.startChapter) &&
    optionalPositiveNumber(suggestion.endChapter) &&
    optionalPositiveNumber(suggestion.chapterNumber) &&
    optionalPositiveNumber(suggestion.expectedWords) &&
    optionalPositiveNumber(suggestion.volumeNumber) &&
    optionalPositiveNumber(suggestion.unitNumber)
  );
}

function optionalPositiveNumber(value: unknown) {
  return value === undefined || (typeof value === "number" && value > 0);
}
