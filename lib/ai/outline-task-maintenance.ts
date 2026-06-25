import { prisma } from "@/lib/prisma";
import { endingPlanningTaskType } from "./ending-planning";
import { activeAiTaskStatuses } from "./status";
import { staleAiTaskCutoff, staleAiTaskErrorMessage } from "./task-timeouts";

export const outlineGenerationTaskType = "outline_generation";
export const endingPlanningGenerationTaskType = endingPlanningTaskType;

const outlineModuleAiTaskTypes = [
  outlineGenerationTaskType,
  endingPlanningGenerationTaskType,
] as const;

export async function expireStaleOutlineAiTasks(
  projectId: string,
  now = new Date(),
) {
  const cutoff = staleAiTaskCutoff(now);

  await prisma.aiTask.updateMany({
    where: {
      projectId,
      taskType: {
        in: [...outlineModuleAiTaskTypes],
      },
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
