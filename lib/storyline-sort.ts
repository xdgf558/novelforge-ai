export type SortableStoryline = {
  status: string;
  updatedAt: Date;
};

const storylineStatusRank: Record<string, number> = {
  active: 0,
  planned: 1,
  paused: 2,
  completed: 3,
  archived: 4,
};

export function sortStorylines<T extends SortableStoryline>(
  storylines: readonly T[],
) {
  return [...storylines].sort((a, b) => {
    const byStatus =
      (storylineStatusRank[a.status] ?? 9) -
      (storylineStatusRank[b.status] ?? 9);

    if (byStatus !== 0) {
      return byStatus;
    }

    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
