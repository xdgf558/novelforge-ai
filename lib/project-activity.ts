import { prisma } from "./prisma";

type ProjectActivityProject = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

type SqliteDateValue = Date | string | number | bigint | null | undefined;

type FirstChapterRow = {
  id: string;
  chapterNumber: number | bigint;
  title: string;
  createdAt: SqliteDateValue;
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
    audioExportDates,
  ] = await Promise.all([
    loadFirstChapter(project.id),
    latestProjectTableDate(project.id, "chapters", ["updatedAt"]),
    latestProjectTableDate(project.id, "project_settings", ["updatedAt"]),
    latestProjectTableDate(project.id, "setting_versions", ["createdAt"]),
    latestProjectTableDate(project.id, "characters", ["updatedAt"]),
    latestProjectTableDate(project.id, "character_versions", ["createdAt"]),
    latestProjectTableDate(project.id, "world_rules", ["updatedAt"]),
    latestProjectTableDate(project.id, "foreshadows", ["updatedAt"]),
    latestProjectTableDate(project.id, "timeline_events", ["updatedAt"]),
    latestProjectTableDate(project.id, "ai_tasks", ["updatedAt", "completedAt"]),
    latestProjectTableDate(project.id, "pending_updates", [
      "updatedAt",
      "appliedAt",
    ]),
    latestProjectTableDate(project.id, "continuity_reports", [
      "updatedAt",
      "resolvedAt",
    ]),
    latestProjectTableDate(project.id, "publish_packages", ["updatedAt"]),
    latestProjectTableDate(project.id, "publish_targets", [
      "updatedAt",
      "tokenUpdatedAt",
    ]),
    latestProjectTableDate(project.id, "publish_runs", [
      "createdAt",
      "completedAt",
    ]),
    latestProjectTableDate(project.id, "publish_sync_states", [
      "updatedAt",
      "lastSyncedAt",
    ]),
    latestProjectTableDate(project.id, "audio_exports", [
      "updatedAt",
      "completedAt",
    ]),
  ]);

  const latestActivityAt = latestDate([
    project.updatedAt,
    firstChapter?.createdAt,
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
    audioExportDates,
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

async function loadFirstChapter(projectId: string) {
  const rows = await prisma.$queryRawUnsafe<FirstChapterRow[]>(
    `
      SELECT "id", "chapterNumber", "title", "createdAt"
      FROM "chapters"
      WHERE "projectId" = ?
    `,
    projectId,
  );

  return (
    rows
      .map((row) => {
        const createdAt = parseSqliteDate(row.createdAt);

        if (!createdAt) {
          return null;
        }

        return {
          id: row.id,
          chapterNumber: Number(row.chapterNumber),
          title: row.title,
          createdAt,
        };
      })
      .filter((row) => row !== null)
      .sort(
        (left, right) =>
          left.chapterNumber - right.chapterNumber ||
          left.createdAt.getTime() - right.createdAt.getTime(),
      )[0] ?? null
  );
}

async function latestProjectTableDate(
  projectId: string,
  tableName: string,
  columns: string[],
) {
  const selectedColumns = columns.map(quoteIdentifier).join(", ");
  const rows = await prisma.$queryRawUnsafe<Record<string, SqliteDateValue>[]>(
    `
      SELECT ${selectedColumns}
      FROM ${quoteIdentifier(tableName)}
      WHERE "projectId" = ?
    `,
    projectId,
  );

  return latestDate(
    rows.flatMap((row) => columns.map((column) => parseSqliteDate(row[column]))),
  );
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function parseSqliteDate(value: SqliteDateValue) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "bigint") {
    return numberToDate(Number(value));
  }

  if (typeof value === "number") {
    return numberToDate(value);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^-?\d+$/.test(trimmedValue)) {
    return numberToDate(Number(trimmedValue));
  }

  const normalizedValue =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmedValue)
      ? `${trimmedValue.replace(" ", "T")}Z`
      : trimmedValue;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function numberToDate(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const milliseconds = Math.abs(value) < 10_000_000_000 ? value * 1000 : value;
  const date = new Date(milliseconds);

  return Number.isNaN(date.getTime()) ? null : date;
}
