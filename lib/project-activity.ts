import { prisma } from "./prisma";

type ProjectActivityProject = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectActivitySummary = {
  projectId: string;
  projectCreatedAt: Date;
  projectUpdatedAt: Date;
  firstChapter: {
    id: string;
    chapterNumber: number;
    title: string;
    createdAt: Date;
  } | null;
  latestActivityAt: Date;
};

export async function loadProjectActivitySummary(
  project: ProjectActivityProject,
): Promise<ProjectActivitySummary> {
  const [
    firstChapter,
    chapterDates,
    settingDates,
    settingVersionDates,
    characterDates,
    characterVersionDates,
    worldRuleDates,
    foreshadowDates,
    timelineDates,
    aiTaskDates,
    pendingUpdateDates,
    continuityReportDates,
    publishPackageDates,
    publishTargetDates,
    publishRunDates,
    publishSyncDates,
  ] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        projectId: project.id,
      },
      orderBy: [{ chapterNumber: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        createdAt: true,
      },
    }),
    prisma.chapter.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.projectSetting.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.settingVersion.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        createdAt: true,
      },
    }),
    prisma.character.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.characterVersion.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        createdAt: true,
      },
    }),
    prisma.worldRule.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.foreshadow.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.timelineEvent.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.aiTask.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
        completedAt: true,
      },
    }),
    prisma.pendingUpdate.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
        appliedAt: true,
      },
    }),
    prisma.continuityReport.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
        resolvedAt: true,
      },
    }),
    prisma.publishPackage.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
      },
    }),
    prisma.publishTarget.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
        tokenUpdatedAt: true,
      },
    }),
    prisma.publishRun.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.publishSyncState.aggregate({
      where: {
        projectId: project.id,
      },
      _max: {
        updatedAt: true,
        lastSyncedAt: true,
      },
    }),
  ]);

  const latestActivityAt = latestDate([
    project.updatedAt,
    firstChapter?.createdAt,
    chapterDates._max.updatedAt,
    settingDates._max.updatedAt,
    settingVersionDates._max.createdAt,
    characterDates._max.updatedAt,
    characterVersionDates._max.createdAt,
    worldRuleDates._max.updatedAt,
    foreshadowDates._max.updatedAt,
    timelineDates._max.updatedAt,
    aiTaskDates._max.updatedAt,
    aiTaskDates._max.completedAt,
    pendingUpdateDates._max.updatedAt,
    pendingUpdateDates._max.appliedAt,
    continuityReportDates._max.updatedAt,
    continuityReportDates._max.resolvedAt,
    publishPackageDates._max.updatedAt,
    publishTargetDates._max.updatedAt,
    publishTargetDates._max.tokenUpdatedAt,
    publishRunDates._max.createdAt,
    publishRunDates._max.completedAt,
    publishSyncDates._max.updatedAt,
    publishSyncDates._max.lastSyncedAt,
  ]);

  return {
    projectId: project.id,
    projectCreatedAt: project.createdAt,
    projectUpdatedAt: project.updatedAt,
    firstChapter,
    latestActivityAt: latestActivityAt ?? project.updatedAt,
  };
}

export async function loadProjectActivitySummaries<
  Project extends ProjectActivityProject,
>(projects: readonly Project[]) {
  const summaries = await Promise.all(
    projects.map((project) => loadProjectActivitySummary(project)),
  );

  return new Map(
    summaries.map((summary) => [summary.projectId, summary] as const),
  );
}

export function latestDate(values: Array<Date | null | undefined>) {
  return values.reduce<Date | null>((latest, value) => {
    if (!value) {
      return latest;
    }

    if (!latest || value.getTime() > latest.getTime()) {
      return value;
    }

    return latest;
  }, null);
}
