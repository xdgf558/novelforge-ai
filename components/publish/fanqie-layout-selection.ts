export function resolveFanqieLayoutInitialChapterId(
  chapters: readonly {
    id: string;
  }[],
  initialChapterId?: string | string[] | null,
) {
  const requestedId = firstSearchParamValue(initialChapterId)?.trim();

  if (requestedId && chapters.some((chapter) => chapter.id === requestedId)) {
    return requestedId;
  }

  return chapters[chapters.length - 1]?.id ?? "";
}

function firstSearchParamValue(value?: string | string[] | null) {
  return Array.isArray(value) ? value[0] : value;
}
