import { prisma } from "../prisma";
import { deleteProjectCoverCandidateAssetsForTask } from "../project-cover-assets";
import { coverImageGenerationTaskType } from "./cover-images";
import { isActiveAiTaskStatus } from "./status";

export const projectAiTaskRetentionLimit = 10;

type AiTaskRetentionCandidate = {
  id: string;
  createdAt: Date;
  status: string;
  taskType?: string | null;
  _count?: {
    pendingUpdates?: number;
    continuityReports?: number;
    publishPackages?: number;
    chapterSummaries?: number;
  };
};

export function aiTaskIdsToPrune(
  tasks: readonly AiTaskRetentionCandidate[],
  limit = projectAiTaskRetentionLimit,
) {
  const normalizedLimit = Math.max(0, limit);
  const sortedTasks = [...tasks].sort((taskA, taskB) => {
    const createdAtDiff =
      taskB.createdAt.getTime() - taskA.createdAt.getTime();

    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return taskB.id.localeCompare(taskA.id);
  });

  return sortedTasks
    .filter(
      (task) =>
        !isActiveAiTaskStatus(task.status) && !isProtectedAiTask(task),
    )
    .slice(normalizedLimit)
    .map((task) => task.id);
}

export async function pruneProjectAiTasks(
  projectId: string,
  limit = projectAiTaskRetentionLimit,
) {
  const tasks = await prisma.aiTask.findMany({
    where: {
      projectId,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: {
      id: true,
      createdAt: true,
      status: true,
      taskType: true,
      _count: {
        select: {
          pendingUpdates: true,
          continuityReports: true,
          publishPackages: true,
          chapterSummaries: true,
        },
      },
    },
  });

  const pruneIds = aiTaskIdsToPrune(tasks, limit);

  if (pruneIds.length === 0) {
    return 0;
  }

  await cleanupPrunedAiTaskArtifacts(projectId, tasks, pruneIds);

  const result = await prisma.aiTask.deleteMany({
    where: {
      projectId,
      id: {
        in: pruneIds,
      },
    },
  });

  return result.count;
}

function isProtectedAiTask(task: AiTaskRetentionCandidate) {
  if (task.taskType === "chapter_summary_extraction") {
    return true;
  }

  return Object.values(task._count ?? {}).some((count) => (count ?? 0) > 0);
}

async function cleanupPrunedAiTaskArtifacts(
  projectId: string,
  tasks: readonly AiTaskRetentionCandidate[],
  pruneIds: readonly string[],
) {
  const pruneIdSet = new Set(pruneIds);
  const coverTaskIds = tasks
    .filter(
      (task) =>
        pruneIdSet.has(task.id) && task.taskType === coverImageGenerationTaskType,
    )
    .map((task) => task.id);

  await Promise.all(
    coverTaskIds.map((taskId) =>
      deleteProjectCoverCandidateAssetsForTask({
        projectId,
        taskId,
      }),
    ),
  );
}
