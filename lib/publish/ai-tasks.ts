import { coverImageGenerationTaskType } from "@/lib/ai/cover-images";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { wechatLayoutCandidateTaskType } from "@/lib/ai/wechat-layout-candidates";
import { prisma } from "@/lib/prisma";

export async function loadProjectForCoverImage(projectId: string) {
  return prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      setting: {
        select: {
          forbiddenItems: true,
          sellingPoint: true,
          styleSample: true,
          worldviewRules: true,
        },
      },
    },
  });
}

export async function findActiveCoverImageTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: coverImageGenerationTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

export async function findActiveWechatLayoutCandidateTask(
  projectId: string,
  chapterId: string,
) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType: wechatLayoutCandidateTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

export async function loadWechatLayoutCandidateContext(
  projectId: string,
  chapterId: string,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        include: {
          setting: true,
        },
      },
    },
  });

  if (!chapter) {
    return null;
  }

  return {
    project: {
      title: chapter.project.title,
      genre: chapter.project.genre,
      targetAudience: chapter.project.targetAudience,
      platform: chapter.project.platform,
      description: chapter.project.description,
      wechatPositioning: chapter.project.wechatPositioning,
    },
    setting: chapter.project.setting,
    chapter: {
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      goal: chapter.goal,
      notes: chapter.notes,
      draftText: chapter.draftText,
      finalText: chapter.finalText,
      polishedText: chapter.polishedText,
    },
  };
}
