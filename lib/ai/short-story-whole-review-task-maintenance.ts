import { prisma } from "@/lib/prisma";
import { shortStoryWholeReviewTaskType } from "./short-story-whole-review";
import { activeAiTaskStatuses } from "./status";
import { staleAiTaskCutoff, staleAiTaskErrorMessage } from "./task-timeouts";

export async function expireStaleShortStoryWholeReviewTasks(
  projectId: string,
  now = new Date(),
) {
  const cutoff = staleAiTaskCutoff(now);

  await prisma.aiTask.updateMany({
    where: {
      projectId,
      taskType: shortStoryWholeReviewTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
      updatedAt: {
        lt: cutoff,
      },
    },
    data: {
      status: "failed",
      errorMessage: staleAiTaskErrorMessage,
      completedAt: now,
    },
  });
}
