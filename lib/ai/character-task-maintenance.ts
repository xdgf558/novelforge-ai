import { prisma } from "@/lib/prisma";
import { activeAiTaskStatuses } from "./status";
import { staleAiTaskCutoff, staleAiTaskErrorMessage } from "./task-timeouts";

export const characterGenerationTaskType = "character_generation";

export async function expireStaleCharacterAiTasks(
  projectId: string,
  now = new Date(),
) {
  const cutoff = staleAiTaskCutoff(now);

  await prisma.aiTask.updateMany({
    where: {
      projectId,
      taskType: characterGenerationTaskType,
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
