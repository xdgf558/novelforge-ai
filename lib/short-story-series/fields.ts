export const shortStorySeriesStatusOptions = [
  { value: "active", label: "连载中" },
  { value: "completed", label: "已完结" },
  { value: "archived", label: "已归档" },
] as const;

export type ShortStorySeriesStatus =
  (typeof shortStorySeriesStatusOptions)[number]["value"];

export const shortStorySeriesCharacterStatusOptions = [
  { value: "active", label: "持续登场" },
  { value: "retired", label: "已退场" },
] as const;

export type ShortStorySeriesCharacterStatus =
  (typeof shortStorySeriesCharacterStatusOptions)[number]["value"];

export type SeriesEntryOrderItem = {
  id: string;
  sortOrder: number;
};

export function shortStorySeriesStatusLabel(value?: string | null) {
  return (
    shortStorySeriesStatusOptions.find((option) => option.value === value)
      ?.label ?? "连载中"
  );
}

export function shortStorySeriesCharacterStatusLabel(
  value?: string | null,
) {
  return (
    shortStorySeriesCharacterStatusOptions.find(
      (option) => option.value === value,
    )?.label ?? "持续登场"
  );
}

export function nextSeriesSortOrder(
  entries: ReadonlyArray<{ sortOrder: number }>,
) {
  return entries.reduce(
    (maximum, entry) => Math.max(maximum, entry.sortOrder),
    0,
  ) + 10;
}

export function moveSeriesEntryOrder(
  orderedEntries: ReadonlyArray<SeriesEntryOrderItem>,
  entryId: string,
  direction: "up" | "down",
) {
  const entryIds = orderedEntries.map((entry) => entry.id);
  const currentIndex = entryIds.indexOf(entryId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= entryIds.length
  ) {
    return orderedEntries.map((entry, index) => ({
      id: entry.id,
      sortOrder: (index + 1) * 10,
    }));
  }

  [entryIds[currentIndex], entryIds[targetIndex]] = [
    entryIds[targetIndex],
    entryIds[currentIndex],
  ];

  return entryIds.map((id, index) => ({
    id,
    sortOrder: (index + 1) * 10,
  }));
}
