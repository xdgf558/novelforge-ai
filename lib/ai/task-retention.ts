import { prisma } from "../prisma";
import { isActiveAiTaskStatus } from "./status";

export const projectAiTaskRetentionLimit = 10;

type AiTaskRetentionCandidate = {
  id: string;
  createdAt: Date;
  status: string;
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
    .slice(normalizedLimit)
    .filter((task) => !isActiveAiTaskStatus(task.status))
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
    },
  });

  const pruneIds = aiTaskIdsToPrune(tasks, limit);

  if (pruneIds.length === 0) {
    return 0;
  }

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
