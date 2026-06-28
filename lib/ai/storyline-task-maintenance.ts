import { prisma } from "@/lib/prisma";
import { storylineGenerationTaskType } from "./storylines";
import { activeAiTaskStatuses } from "./status";
import { staleAiTaskCutoff, staleAiTaskErrorMessage } from "./task-timeouts";

export async function expireStaleStorylineAiTasks(
  projectId: string,
  now = new Date(),
) {
  const cutoff = staleAiTaskCutoff(now);

  await prisma.aiTask.updateMany({
    where: {
      projectId,
      taskType: storylineGenerationTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
      OR: [
        {
          startedAt: {
            lt: cutoff,
          },
        },
        {
          startedAt: null,
          createdAt: {
            lt: cutoff,
          },
        },
      ],
    },
    data: {
      status: "failed",
      errorMessage: staleAiTaskErrorMessage,
      completedAt: now,
    },
  });
}
