"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  buildPublishPackageContext,
  parsePublishPackageOutput,
  type PublishPackageChapterContext,
} from "@/lib/ai/publish-packages";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import { DEFAULT_AI_PROMPT_TEMPLATES } from "@/lib/ai/prompt-templates";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { runLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { prisma } from "@/lib/prisma";

const publishPackageTemplateKey = "wechat_publish_packaging";
const publishPackageTaskType = "wechat_publish_packaging";

export async function generatePublishPackage(
  projectId: string,
  chapterId: string,
) {
  const activeTask = await findActivePublishPackageTask(projectId, chapterId);

  if (activeTask) {
    revalidatePublishPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/publish`);
  }

  const contextInput = await loadPublishPackageContext(projectId, chapterId);

  if (!hasConfirmedChapterText(contextInput.chapter)) {
    revalidatePublishPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/publish`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    publishPackageTemplateKey,
  );
  const context = buildPublishPackageContext(contextInput);

  const task = await runLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [
        template.userPrompt,
        template.contextNotes,
        template.responseSchema
          ? `请严格输出符合以下 JSON Schema 的 JSON：\n${template.responseSchema}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  const suggestion = parsePublishPackageOutput(task.outputText, {
    chapterTitle: contextInput.chapter.title,
    finalText: contextInput.chapter.finalText,
  });

  if (suggestion) {
    await prisma.publishPackage.create({
      data: {
        projectId,
        chapterId,
        aiTaskId: task.id,
        titleCandidatesJson: JSON.stringify(suggestion.titleCandidates, null, 2),
        selectedTitle: suggestion.selectedTitle,
        openingGuide: suggestion.openingGuide,
        chapterSummary: suggestion.chapterSummary,
        endingQuestion: suggestion.endingQuestion,
        nextChapterPreview: suggestion.nextChapterPreview,
        commentGuide: suggestion.commentGuide,
        collectionTitle: suggestion.collectionTitle,
        coverPrompt: suggestion.coverPrompt,
        markdownBody: suggestion.markdownBody,
        checklistJson: JSON.stringify(suggestion.checklist, null, 2),
        status: "draft",
      },
    });
  }

  revalidatePublishPaths(projectId, chapterId);
  redirect(`/projects/${projectId}/publish`);
}

export async function markPublishPackageExported(
  projectId: string,
  publishPackageId: string,
) {
  const publishPackage = await prisma.publishPackage.findFirst({
    where: {
      id: publishPackageId,
      projectId,
    },
    select: {
      id: true,
      chapterId: true,
      aiTaskId: true,
    },
  });

  if (!publishPackage) {
    notFound();
  }

  await prisma.$transaction(async (tx) => {
    await tx.publishPackage.update({
      where: {
        id: publishPackage.id,
      },
      data: {
        status: "exported",
      },
    });

    if (publishPackage.aiTaskId) {
      await tx.aiTask.update({
        where: {
          id: publishPackage.aiTaskId,
        },
        data: {
          adoptionState: "adopted",
        },
      });
    }
  });

  revalidatePublishPaths(projectId, publishPackage.chapterId);
  redirect(`/projects/${projectId}/publish`);
}

async function loadPublishPackageContext(projectId: string, chapterId: string) {
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
    notFound();
  }

  const [latestSummaryTask, recentPublishPackages] = await Promise.all([
    prisma.aiTask.findFirst({
      where: {
        projectId,
        chapterId,
        taskType: "chapter_summary_extraction",
        status: "completed",
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        inputContextSummary: true,
        outputText: true,
        completedAt: true,
      },
    }),
    prisma.publishPackage.findMany({
      where: {
        projectId,
        chapterId: {
          not: chapterId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        selectedTitle: true,
        titleCandidatesJson: true,
      },
    }),
  ]);

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
    chapter: pickPublishPackageChapterContext(chapter),
    latestSummaryTask,
    recentPublishPackages,
  };
}

async function findActivePublishPackageTask(projectId: string, chapterId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType: publishPackageTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

async function ensureDefaultPromptTemplate(projectId: string, templateKey: string) {
  const template = DEFAULT_AI_PROMPT_TEMPLATES.find(
    (defaultTemplate) => defaultTemplate.key === templateKey,
  );

  if (!template) {
    throw new Error(`Default prompt template is missing: ${templateKey}.`);
  }

  return prisma.aiPromptTemplate.upsert({
    where: {
      projectId_key_version: {
        projectId,
        key: template.key,
        version: template.version,
      },
    },
    create: {
      projectId,
      key: template.key,
      name: template.name,
      taskType: template.taskType,
      version: template.version,
      outputFormat: template.outputFormat,
      systemPrompt: template.systemPrompt,
      userPrompt: template.userPrompt,
      contextNotes: template.contextNotes,
      responseSchema: template.responseSchema,
      status: "active",
    },
    update: {
      name: template.name,
      taskType: template.taskType,
      outputFormat: template.outputFormat,
      systemPrompt: template.systemPrompt,
      userPrompt: template.userPrompt,
      contextNotes: template.contextNotes,
      responseSchema: template.responseSchema,
      status: "active",
    },
  });
}

function pickPublishPackageChapterContext(chapter: PublishPackageChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

function revalidatePublishPaths(projectId: string, chapterId?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/publish`);
  revalidatePath(`/projects/${projectId}/chapters`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  }
}
