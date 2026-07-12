"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  buildCoverImagePromptContext,
  coverImageGenerationTaskType,
  coverImageGenerationTemplateKey,
  parseCoverImageTaskOutput,
  parseCoverImageRequestPrompt,
} from "@/lib/ai/cover-images";
import { createImageGeneration } from "@/lib/ai/image-client";
import { expireStaleCoverImageTasks } from "@/lib/ai/cover-image-task-maintenance";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import {
  createAiTask,
  markAiTaskCompleted,
  markAiTaskFailed,
  markAiTaskRunning,
  startLoggedOpenAITextTask,
} from "@/lib/ai/task-logger";
import {
  readImageGenerationSecrets,
  readStationCatPublishSecrets,
} from "@/lib/ai/local-config";
import { assertProjectExists as assertProject } from "@/lib/server-actions/project-guards";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import {
  buildWechatLayoutCandidateContext,
  wechatLayoutCandidateTemplateKey,
} from "@/lib/ai/wechat-layout-candidates";
import {
  deleteProjectCoverAsset,
  deleteProjectCoverCandidateAssetsForTask,
  readProjectCoverAssetBuffer,
  saveProjectCoverAsset,
  saveProjectCoverAssetFromBuffer,
} from "@/lib/project-cover-assets";
import {
  normalizePublishMode,
  normalizePublishUploadScope,
  publishPlatformOptions,
} from "@/lib/publish-platforms";
import {
  findActiveCoverImageTask,
  findActiveWechatLayoutCandidateTask,
  loadProjectForCoverImage,
  loadWechatLayoutCandidateContext,
} from "@/lib/publish/ai-tasks";
import { persistGeneratedCoverCandidates } from "@/lib/publish/cover-candidates";
import {
  createPublishRun,
  ensureGlobalStationCatTarget,
  loadProjectForPublishRun,
  loadPublishTargetForRun,
  type PublishUploadSelection,
} from "@/lib/publish/runs";
import { prisma } from "@/lib/prisma";

export async function uploadProjectCover(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      coverImagePath: true,
    },
  });
  const file = formData.get("coverImage");

  if (!(file instanceof File) || file.size === 0) {
    revalidatePublishPaths(projectId);
    redirect(`/projects/${projectId}/publish`);
  }

  const savedCover = await saveProjectCoverAsset({
    file,
    previousRelativePath: project?.coverImagePath,
    projectId,
  });
  const coverAltText =
    clean(formData.get("coverAltText")?.toString()) || savedCover.fileName;

  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      coverImagePath: savedCover.relativePath,
      coverImageMimeType: savedCover.mimeType,
      coverImageFileName: savedCover.fileName,
      coverImageSizeBytes: savedCover.sizeBytes,
      coverImageUpdatedAt: savedCover.updatedAt,
      coverAltText,
    },
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function removeProjectCover(projectId: string) {
  await assertProject(projectId);

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      coverImagePath: true,
    },
  });

  await deleteProjectCoverAsset(project?.coverImagePath);
  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      coverImagePath: null,
      coverImageMimeType: null,
      coverImageFileName: null,
      coverImageSizeBytes: null,
      coverImageUpdatedAt: null,
      coverAltText: null,
    },
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function generateProjectCoverImage(
  projectId: string,
  formData: FormData,
) {
  await expireStaleCoverImageTasks(projectId);

  const [activeTask, project] = await Promise.all([
    findActiveCoverImageTask(projectId),
    loadProjectForCoverImage(projectId),
  ]);

  if (!project) {
    notFound();
  }

  if (activeTask) {
    revalidatePublishPaths(projectId);
    redirect(`/projects/${projectId}/publish`);
  }

  const imageSecrets = readImageGenerationSecrets();

  if (!imageSecrets.apiKey) {
    revalidatePublishPaths(projectId);
    redirect(`/projects/${projectId}/publish?coverImageError=missingImageApiKey`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    coverImageGenerationTemplateKey,
  );
  const requestedPrompt = parseCoverImageRequestPrompt(
    formData.get("coverPrompt")?.toString(),
  );

  if (!requestedPrompt.ok) {
    revalidatePublishPaths(projectId);
    redirect(`/projects/${projectId}/publish?coverImageError=invalidPrompt`);
  }

  const context = buildCoverImagePromptContext({
    imageCount: Number(formData.get("imageCount")?.toString()),
    latestCoverPrompt: null,
    project: {
      title: project.title,
      genre: project.genre,
      targetAudience: project.targetAudience,
      description: project.description,
    },
    requestPrompt: requestedPrompt.prompt,
    setting: project.setting,
    target: formData.get("coverTarget")?.toString(),
  });
  const task = await createAiTask({
    projectId,
    promptTemplateId: template.id,
    taskType: coverImageGenerationTaskType,
    model: imageSecrets.model,
    inputContextSummary: context.inputContextSummary,
    inputJson: context.inputJson,
  });
  const runningTask = await markAiTaskRunning(task.id);

  void completeRunningCoverImageTask({
    imageCount: context.imageCount,
    projectId,
    prompt: context.prompt,
    quality: imageSecrets.quality,
    size:
      imageSecrets.size === "default" ? context.target.suggestedSize : imageSecrets.size,
    taskId: runningTask.id,
  }).catch((error) => {
    console.error("Background cover image task failed after logging attempt:", error);
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function adoptGeneratedProjectCover(
  projectId: string,
  taskId: string,
  formData: FormData,
) {
  const imageIndex = normalizeImageIndex(formData.get("imageIndex")?.toString());
  const [project, task] = await Promise.all([
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        coverImagePath: true,
        title: true,
      },
    }),
    prisma.aiTask.findFirst({
      where: {
        id: taskId,
        projectId,
        taskType: coverImageGenerationTaskType,
        status: "completed",
        adoptionState: "not_reviewed",
      },
      select: {
        id: true,
        outputJson: true,
      },
    }),
  ]);

  if (!project || !task) {
    revalidatePublishPaths(projectId);
    redirect(`/projects/${projectId}/publish`);
  }

  const output = parseCoverImageTaskOutput(task.outputJson);
  const image = output?.images?.[imageIndex];

  if (!image) {
    revalidatePublishPaths(projectId);
    redirect(`/projects/${projectId}/publish?coverImageError=missingGeneratedImage`);
  }

  if (!image.assetPath || !image.mimeType) {
    revalidatePublishPaths(projectId);
    redirect(`/projects/${projectId}/publish?coverImageError=missingGeneratedImage`);
  }

  const candidateBuffer = await readProjectCoverAssetBuffer(image.assetPath);
  const savedCover = await saveProjectCoverAssetFromBuffer({
    buffer: candidateBuffer,
    fileName: image.fileName || `generated-cover-${imageIndex + 1}`,
    mimeType: image.mimeType ?? "",
    projectId,
  });
  const coverAltText =
    clean(formData.get("coverAltText")?.toString()) ||
    project.title ||
    savedCover.fileName;
  let shouldDeleteSavedCover = true;
  const previousCoverPath = project.coverImagePath;

  try {
    await prisma.$transaction(async (tx) => {
      const adoptedTask = await tx.aiTask.updateMany({
        where: {
          id: task.id,
          adoptionState: "not_reviewed",
          status: "completed",
        },
        data: {
          adoptionState: "adopted",
        },
      });

      if (adoptedTask.count !== 1) {
        throw new Error("Cover image task has already been reviewed.");
      }

      await tx.project.update({
        where: {
          id: projectId,
        },
        data: {
          coverImagePath: savedCover.relativePath,
          coverImageMimeType: savedCover.mimeType,
          coverImageFileName: savedCover.fileName,
          coverImageSizeBytes: savedCover.sizeBytes,
          coverImageUpdatedAt: savedCover.updatedAt,
          coverAltText,
        },
      });
    });

    shouldDeleteSavedCover = false;
  } finally {
    if (shouldDeleteSavedCover) {
      await deleteProjectCoverAsset(savedCover.relativePath);
    }
  }

  if (previousCoverPath && previousCoverPath !== savedCover.relativePath) {
    await deleteProjectCoverAsset(previousCoverPath);
  }
  await deleteProjectCoverCandidateAssetsForTask({
    projectId,
    taskId: task.id,
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function rejectGeneratedProjectCover(projectId: string, taskId: string) {
  await assertProject(projectId);

  const rejectedTask = await prisma.aiTask.updateMany({
    where: {
      id: taskId,
      projectId,
      taskType: coverImageGenerationTaskType,
      status: "completed",
      adoptionState: "not_reviewed",
    },
    data: {
      adoptionState: "rejected",
    },
  });

  if (rejectedTask.count === 1) {
    await deleteProjectCoverCandidateAssetsForTask({
      projectId,
      taskId,
    });
  }

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function generateWechatLayoutCandidates(
  projectId: string,
  chapterId: string,
) {
  const redirectPath = wechatLayoutCandidateRedirectPath(projectId, chapterId);

  if (!hasConfiguredOpenAIKey()) {
    revalidatePublishPaths(projectId, chapterId);
    redirect(redirectPath);
  }

  const activeTask = await findActiveWechatLayoutCandidateTask(
    projectId,
    chapterId,
  );

  if (activeTask) {
    revalidatePublishPaths(projectId, chapterId);
    redirect(redirectPath);
  }

  const contextInput = await loadWechatLayoutCandidateContext(
    projectId,
    chapterId,
  );

  if (!contextInput) {
    notFound();
  }

  const context = buildWechatLayoutCandidateContext(contextInput);

  if (!context) {
    revalidatePublishPaths(projectId, chapterId);
    redirect(redirectPath);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    wechatLayoutCandidateTemplateKey,
  );

  await startLoggedOpenAITextTask(
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

  revalidatePublishPaths(projectId, chapterId);
  redirect(redirectPath);
}

export async function savePublishTarget(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const targetId = clean(formData.get("targetId")?.toString());
  const platformKey = clean(formData.get("platformKey")?.toString()) || "station_cat";
  const name =
    clean(formData.get("name")?.toString()) ||
    publishPlatformOptions.find((option) => option.value === platformKey)?.defaultName ||
    "自定义发布目标";
  const apiBaseUrl = normalizeOptionalUrl(formData.get("apiBaseUrl")?.toString());
  const defaultMode = normalizePublishMode(formData.get("defaultMode")?.toString());
  const tokenInput = clean(formData.get("token")?.toString());
  const clearToken = formData.get("clearToken") === "on";

  if (targetId) {
    const target = await prisma.publishTarget.findFirst({
      where: {
        id: targetId,
        projectId,
      },
      select: {
        id: true,
        tokenSecret: true,
      },
    });

    if (!target) {
      notFound();
    }

    await prisma.publishTarget.update({
      where: {
        id: target.id,
      },
      data: {
        name,
        platformKey,
        apiBaseUrl,
        defaultMode,
        tokenSecret: clearToken ? null : tokenInput || target.tokenSecret,
        tokenUpdatedAt: clearToken || tokenInput ? new Date() : undefined,
      },
    });
  } else {
    await prisma.publishTarget.create({
      data: {
        projectId,
        name,
        platformKey,
        apiBaseUrl,
        defaultMode,
        tokenSecret: tokenInput || null,
        tokenUpdatedAt: tokenInput ? new Date() : null,
      },
    });
  }

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function preparePublishRun(
  projectId: string,
  targetId: string,
  formData: FormData,
) {
  const mode = normalizePublishMode(formData.get("publishMode")?.toString());
  const onlyChanged = formData.get("onlyChanged") === "on";
  const uploadSelection = parsePublishUploadSelection(formData);
  const [project, target] = await Promise.all([
    loadProjectForPublishRun(projectId),
    loadPublishTargetForRun(projectId, targetId),
  ]);

  if (!project || !target) {
    notFound();
  }

  await createPublishRun({
    projectId,
    project,
    target,
    mode,
    onlyChanged,
    uploadSelection,
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

export async function prepareGlobalStationCatPublishRun(
  projectId: string,
  formData: FormData,
) {
  const stationCatSettings = readStationCatPublishSecrets();
  const mode = normalizePublishMode(
    formData.get("publishMode")?.toString() || stationCatSettings.defaultMode,
  );
  const onlyChanged = formData.get("onlyChanged") === "on";
  const uploadSelection = parsePublishUploadSelection(formData);
  const project = await loadProjectForPublishRun(projectId);

  if (!project) {
    notFound();
  }

  const targetId = await ensureGlobalStationCatTarget(projectId, {
    apiBaseUrl: stationCatSettings.apiBaseUrl,
    token: stationCatSettings.token,
    defaultMode: mode,
  });
  const target = await loadPublishTargetForRun(projectId, targetId);

  if (!target) {
    notFound();
  }

  await createPublishRun({
    projectId,
    project,
    target,
    mode,
    onlyChanged,
    uploadSelection,
  });

  revalidatePublishPaths(projectId);
  redirect(`/projects/${projectId}/publish`);
}

async function completeRunningCoverImageTask({
  imageCount,
  projectId,
  prompt,
  quality,
  size,
  taskId,
}: {
  imageCount: number;
  projectId: string;
  prompt: string;
  quality: string;
  size: string;
  taskId: string;
}) {
  try {
    const result = await createImageGeneration({
      n: imageCount,
      prompt,
      quality,
      size,
    });
    const persisted = await persistGeneratedCoverCandidates({
      images: result.images,
      projectId,
      taskId,
    });
    const skippedUrlText =
      persisted.skippedUrlCount > 0
        ? ` 已跳过 ${persisted.skippedUrlCount} 张 URL 型候选图；请让图片接口返回 base64。`
        : "";

    await markAiTaskCompleted(taskId, {
      outputText: `已保存 ${persisted.images.length} 张封面候选图，等待作者采用。${skippedUrlText}`,
      outputJson: {
        endpoint: result.endpoint,
        images: persisted.images,
        requestJson: result.requestJson,
      },
    });
  } catch (error) {
    await markAiTaskFailed(taskId, error);
  } finally {
    revalidatePublishPaths(projectId);
  }
}

function normalizeImageIndex(value?: string | null) {
  const index = Number(value);

  if (!Number.isInteger(index) || index < 0) {
    return 0;
  }

  return index;
}

function revalidatePublishPaths(projectId: string, chapterId?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/publish`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  }
}

function parsePublishUploadSelection(formData: FormData): PublishUploadSelection {
  const scope = normalizePublishUploadScope(
    formData.get("uploadScope")?.toString(),
  );
  const chapterId = clean(formData.get("uploadChapterId")?.toString()) || null;

  return {
    scope,
    chapterId: scope === "chapter" ? chapterId : null,
  };
}

function normalizeOptionalUrl(value?: string | null) {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  if (!/^https?:\/\/[^\s]+$/i.test(cleaned)) {
    throw new Error("发布目标 API 地址必须是 http 或 https URL。");
  }

  return cleaned.replace(/\/+$/, "");
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function wechatLayoutCandidateRedirectPath(projectId: string, chapterId: string) {
  return `/projects/${projectId}/publish?wechatChapterId=${encodeURIComponent(
    chapterId,
  )}#wechat-layout-export`;
}
