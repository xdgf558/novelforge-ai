import { prisma } from "@/lib/prisma";
import { coverImageGenerationTaskType } from "./cover-images";
import { activeAiTaskStatuses } from "./status";
import { staleAiTaskCutoff, staleAiTaskErrorMessage } from "./task-timeouts";

export async function expireStaleCoverImageTasks(
  projectId: string,
  now = new Date(),
) {
  const cutoff = staleAiTaskCutoff(now);
  const staleTasks = await prisma.aiTask.findMany({
    where: {
      projectId,
      taskType: coverImageGenerationTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
      createdAt: {
        lt: cutoff,
      },
    },
    select: {
      id: true,
    },
  });

  if (staleTasks.length === 0) {
    return 0;
  }

  const result = await prisma.aiTask.updateMany({
    where: {
      id: {
        in: staleTasks.map((task) => task.id),
      },
    },
    data: {
      status: "failed",
      errorMessage: staleAiTaskErrorMessage,
      completedAt: now,
    },
  });

  return result.count;
}
