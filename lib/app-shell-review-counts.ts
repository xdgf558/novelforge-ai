export type AppShellReviewCount = {
  projectId: string;
  projectTitle: string;
  pendingUpdateCount: number;
  openContinuityCount: number;
};

type ProjectReference = {
  id: string;
  title: string;
};

type CountGroup = {
  projectId: string;
  _count: {
    _all: number;
  };
};

export function buildAppShellReviewCounts(
  projects: ProjectReference[],
  pendingUpdateGroups: CountGroup[],
  openContinuityGroups: CountGroup[],
): AppShellReviewCount[] {
  const projectTitleById = new Map(
    projects.map((project) => [project.id, project.title]),
  );
  const reviewCountByProject = new Map<
    string,
    Omit<AppShellReviewCount, "projectId" | "projectTitle">
  >();

  for (const group of pendingUpdateGroups) {
    reviewCountByProject.set(group.projectId, {
      pendingUpdateCount: group._count._all,
      openContinuityCount: 0,
    });
  }
  for (const group of openContinuityGroups) {
    const current = reviewCountByProject.get(group.projectId);
    reviewCountByProject.set(group.projectId, {
      pendingUpdateCount: current?.pendingUpdateCount ?? 0,
      openContinuityCount: group._count._all,
    });
  }

  return Array.from(reviewCountByProject, ([projectId, counts]) => ({
    projectId,
    projectTitle: projectTitleById.get(projectId) ?? "未知项目",
    ...counts,
  })).sort(
    (left, right) =>
      right.pendingUpdateCount +
        right.openContinuityCount -
        (left.pendingUpdateCount + left.openContinuityCount) ||
      left.projectTitle.localeCompare(right.projectTitle, "zh-CN"),
  );
}
