export type PublishChapterOption = {
  id: string;
  chapterNumber: number | null;
  title: string;
};

export const stationCatChapterSelectorLimit = 5;

export function latestStationCatChapterOptions(
  chapters: PublishChapterOption[],
  limit = stationCatChapterSelectorLimit,
) {
  if (limit <= 0) {
    return [];
  }

  return chapters
    .map((chapter, index) => ({ chapter, index }))
    .sort((left, right) => {
      const chapterDelta = compareChapterNumbers(
        right.chapter.chapterNumber,
        left.chapter.chapterNumber,
      );

      if (chapterDelta !== 0) {
        return chapterDelta;
      }

      return right.index - left.index;
    })
    .slice(0, limit)
    .sort((left, right) => {
      const chapterDelta = compareChapterNumbers(
        left.chapter.chapterNumber,
        right.chapter.chapterNumber,
      );

      if (chapterDelta !== 0) {
        return chapterDelta;
      }

      return left.index - right.index;
    })
    .map(({ chapter }) => chapter);
}

function chapterSortValue(value: number | null) {
  return value ?? Number.NEGATIVE_INFINITY;
}

function compareChapterNumbers(left: number | null, right: number | null) {
  const leftValue = chapterSortValue(left);
  const rightValue = chapterSortValue(right);

  if (leftValue < rightValue) {
    return -1;
  }

  if (leftValue > rightValue) {
    return 1;
  }

  return 0;
}
