import { activeAiTaskStatuses } from "@/lib/ai/status";
import { prisma } from "@/lib/prisma";

export async function findActiveChapterAiTask(
  projectId: string,
  chapterId: string,
  taskType: string,
) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}
