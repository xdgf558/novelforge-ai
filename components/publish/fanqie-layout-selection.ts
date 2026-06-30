export function resolveFanqieLayoutInitialChapterId(
  chapters: readonly {
    id: string;
  }[],
  initialChapterId?: string | null,
) {
  const requestedId = initialChapterId?.trim();

  if (requestedId && chapters.some((chapter) => chapter.id === requestedId)) {
    return requestedId;
  }

  return chapters[chapters.length - 1]?.id ?? "";
}
