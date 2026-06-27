import { prisma } from "@/lib/prisma";
import { continuityFixPatchTaskType } from "./continuity-fix-patches";
import { activeAiTaskStatuses } from "./status";
import { staleAiTaskCutoff, staleAiTaskErrorMessage } from "./task-timeouts";

export async function expireStaleContinuityFixPatchTasks(
  projectId: string,
  now = new Date(),
) {
  const cutoff = staleAiTaskCutoff(now);

  await prisma.aiTask.updateMany({
    where: {
      projectId,
      taskType: continuityFixPatchTaskType,
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
