"use server";

import { Prisma, type PendingUpdate } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildPendingUpdateContext,
  parsePendingUpdateSuggestions,
  type PendingUpdateChapterContext,
} from "@/lib/ai/pending-updates";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { runLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import {
  characterSnapshot,
  characterValuesFromRecord,
  type CharacterTextFieldName,
} from "@/lib/character-fields";
import {
  appendMemoryNote,
  characterValuesForPendingUpdate,
  inferProjectSettingFieldName,
  isCharacterFieldName,
  isProjectSettingFieldName,
} from "@/lib/pending-updates";
import {
  projectSettingSnapshot,
  projectSettingValuesFromRecord,
  type ProjectSettingFieldName,
} from "@/lib/project-setting-fields";
import { prisma } from "@/lib/prisma";

const pendingUpdateTemplateKey = "pending_update_extraction";

const reviewSchema = z.object({
  proposedContent: z.string().trim().min(1).max(12000),
  resolutionNote: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().max(1000).optional(),
    ),
});

const rejectionSchema = z.object({
  resolutionNote: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().max(1000).optional(),
    ),
});

export async function generatePendingUpdates(projectId: string, chapterId: string) {
  const activeTask = await findActivePendingUpdateTask(projectId, chapterId);

  if (activeTask) {
    revalidateChapterAndPendingUpdatePaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadPendingUpdateContext(projectId, chapterId);
  const sourceText = contextInput.chapter.finalText?.trim();

  if (!sourceText) {
    revalidateChapterAndPendingUpdatePaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    pendingUpdateTemplateKey,
  );
  const context = buildPendingUpdateContext(contextInput);

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
    {
      rethrow: false,
    },
  );

  const suggestions = parsePendingUpdateSuggestions(task.outputText);

  if (suggestions.length > 0) {
    await prisma.$transaction(
      suggestions.map((suggestion) =>
        prisma.pendingUpdate.create({
          data: {
            projectId,
            chapterId,
            aiTaskId: task.id,
            updateType: suggestion.updateType,
            targetType: suggestion.targetType,
            targetName: suggestion.targetName,
            fieldName: suggestion.fieldName,
            title: suggestion.title,
            proposedContent: suggestion.proposedContent,
            reason: suggestion.reason,
            riskLevel: suggestion.riskLevel,
            evidence: suggestion.evidence,
            payloadJson: JSON.stringify(suggestion.payload, null, 2),
          },
        }),
      ),
    );
  }

  revalidateChapterAndPendingUpdatePaths(projectId, chapterId);
  redirect(`/projects/${projectId}/pending-updates`);
}

export async function approvePendingUpdate(
  projectId: string,
  updateId: string,
  formData: FormData,
) {
  const parsed = reviewSchema.parse({
    proposedContent: formData.get("proposedContent"),
    resolutionNote: formData.get("resolutionNote"),
  });

  const pendingUpdate = await prisma.pendingUpdate.findFirst({
    where: {
      id: updateId,
      projectId,
      status: "pending",
    },
  });

  if (!pendingUpdate) {
    notFound();
  }

  await prisma.$transaction(async (tx) => {
    await applyApprovedUpdate(tx, pendingUpdate, parsed.proposedContent);

    await tx.pendingUpdate.update({
      where: {
        id: pendingUpdate.id,
      },
      data: {
        status: "approved",
        proposedContent: parsed.proposedContent,
        resolutionNote: parsed.resolutionNote,
        appliedAt: new Date(),
      },
    });
  });

  revalidatePendingUpdatePaths(projectId, pendingUpdate.chapterId);
  redirect(`/projects/${projectId}/pending-updates`);
}

export async function rejectPendingUpdate(
  projectId: string,
  updateId: string,
  formData: FormData,
) {
  const parsed = rejectionSchema.parse({
    resolutionNote: formData.get("resolutionNote"),
  });

  const pendingUpdate = await prisma.pendingUpdate.findFirst({
    where: {
      id: updateId,
      projectId,
      status: "pending",
    },
  });

  if (!pendingUpdate) {
    notFound();
  }

  await prisma.pendingUpdate.update({
    where: {
      id: pendingUpdate.id,
    },
    data: {
      status: "rejected",
      resolutionNote: parsed.resolutionNote,
      appliedAt: new Date(),
    },
  });

  revalidatePendingUpdatePaths(projectId, pendingUpdate.chapterId);
  redirect(`/projects/${projectId}/pending-updates`);
}

async function applyApprovedUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  switch (pendingUpdate.targetType) {
    case "character":
      await applyCharacterUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "world_rule":
      await applyWorldRuleUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "foreshadow":
      await applyForeshadowUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "timeline_event":
      await applyTimelineEventUpdate(tx, pendingUpdate, proposedContent);
      return;
    case "location":
      await applyProjectSettingUpdate(tx, pendingUpdate, proposedContent, "worldviewRules");
      return;
    case "organization":
      await applyProjectSettingUpdate(tx, pendingUpdate, proposedContent, "factions");
      return;
    case "project_setting":
    default:
      await applyProjectSettingUpdate(tx, pendingUpdate, proposedContent);
  }
}

async function applyProjectSettingUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
  forcedFieldName?: ProjectSettingFieldName,
) {
  const fieldName =
    forcedFieldName ??
    (isProjectSettingFieldName(pendingUpdate.fieldName)
      ? pendingUpdate.fieldName
      : inferProjectSettingFieldName(pendingUpdate.title, proposedContent));
  const currentSetting = await tx.projectSetting.findUnique({
    where: {
      projectId: pendingUpdate.projectId,
    },
  });
  const nextValue = appendMemoryNote(currentSetting?.[fieldName], proposedContent);
  const fieldData = {
    [fieldName]: nextValue,
  } as Partial<Record<ProjectSettingFieldName, string>>;

  const setting = await tx.projectSetting.upsert({
    where: {
      projectId: pendingUpdate.projectId,
    },
    create: {
      projectId: pendingUpdate.projectId,
      ...fieldData,
    },
    update: fieldData,
  });
  const updatedSetting = await tx.projectSetting.findUniqueOrThrow({
    where: {
      projectId: pendingUpdate.projectId,
    },
  });
  const snapshot = projectSettingSnapshot(
    projectSettingValuesFromRecord(updatedSetting),
  );
  const versionCount = await tx.settingVersion.count({
    where: {
      projectId: pendingUpdate.projectId,
    },
  });

  await tx.settingVersion.create({
    data: {
      projectId: pendingUpdate.projectId,
      settingId: setting.id,
      versionNumber: versionCount + 1,
      snapshotJson: JSON.stringify(snapshot),
      changeReason: `批准待审核更新：${pendingUpdate.title}`,
      sourceType: "pending_update",
      sourceChapterId: pendingUpdate.chapterId,
    },
  });
}

async function applyCharacterUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  const targetName = clean(pendingUpdate.targetName) || clean(pendingUpdate.title);
  const fieldName = characterMemoryField(pendingUpdate.fieldName);
  const existingCharacter = pendingUpdate.targetId
    ? await tx.character.findFirst({
        where: {
          id: pendingUpdate.targetId,
          projectId: pendingUpdate.projectId,
        },
      })
    : targetName
      ? await tx.character.findFirst({
          where: {
            projectId: pendingUpdate.projectId,
            name: targetName,
          },
        })
      : null;

  if (existingCharacter) {
    const nextValue = appendMemoryNote(
      existingCharacter[fieldName],
      proposedContent,
    );
    const fieldData = {
      [fieldName]: nextValue,
    } as Partial<Record<CharacterTextFieldName, string>>;

    await tx.character.update({
      where: {
        id: existingCharacter.id,
      },
      data: fieldData,
    });

    const updatedCharacter = await tx.character.findUniqueOrThrow({
      where: {
        id: existingCharacter.id,
      },
    });
    const versionCount = await tx.characterVersion.count({
      where: {
        characterId: existingCharacter.id,
      },
    });

    await tx.characterVersion.create({
      data: {
        projectId: pendingUpdate.projectId,
        characterId: existingCharacter.id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(
          characterSnapshot(characterValuesFromRecord(updatedCharacter)),
        ),
        changeReason: `批准待审核更新：${pendingUpdate.title}`,
        sourceType: "pending_update",
        sourceChapterId: pendingUpdate.chapterId,
      },
    });

    return;
  }

  const snapshot = characterSnapshot(
    characterValuesForPendingUpdate({
      targetName,
      title: pendingUpdate.title,
      fieldName,
      proposedContent,
    }),
  );
  const createdCharacter = await tx.character.create({
    data: {
      projectId: pendingUpdate.projectId,
      ...snapshot,
    },
  });

  await tx.characterVersion.create({
    data: {
      projectId: pendingUpdate.projectId,
      characterId: createdCharacter.id,
      versionNumber: 1,
      snapshotJson: JSON.stringify(snapshot),
      changeReason: `批准待审核更新：${pendingUpdate.title}`,
      sourceType: "pending_update",
      sourceChapterId: pendingUpdate.chapterId,
    },
  });
}

async function applyWorldRuleUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  await tx.worldRule.create({
    data: {
      projectId: pendingUpdate.projectId,
      title: pendingUpdate.title,
      content: proposedContent,
      category: pendingUpdate.fieldName || pendingUpdate.targetName,
      riskLevel: pendingUpdate.riskLevel,
      sourceChapterId: pendingUpdate.chapterId,
      pendingUpdateId: pendingUpdate.id,
    },
  });
}

async function applyForeshadowUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  await tx.foreshadow.create({
    data: {
      projectId: pendingUpdate.projectId,
      content: proposedContent,
      status: pendingUpdate.updateType === "resolve" ? "resolved" : "planted",
      importance: pendingUpdate.riskLevel === "high" ? "high" : "medium",
      plantedChapterId:
        pendingUpdate.updateType === "resolve" ? undefined : pendingUpdate.chapterId,
      resolvedChapterId:
        pendingUpdate.updateType === "resolve" ? pendingUpdate.chapterId : undefined,
      sourceChapterId: pendingUpdate.chapterId,
      pendingUpdateId: pendingUpdate.id,
    },
  });
}

async function applyTimelineEventUpdate(
  tx: Prisma.TransactionClient,
  pendingUpdate: PendingUpdate,
  proposedContent: string,
) {
  await tx.timelineEvent.create({
    data: {
      projectId: pendingUpdate.projectId,
      title: pendingUpdate.title,
      description: proposedContent,
      storyTime: pendingUpdate.targetName,
      impact: pendingUpdate.reason,
      chapterId: pendingUpdate.chapterId,
      sourceChapterId: pendingUpdate.chapterId,
      pendingUpdateId: pendingUpdate.id,
    },
  });
}

async function loadPendingUpdateContext(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    include: {
      project: {
        select: {
          title: true,
          genre: true,
          targetAudience: true,
          platform: true,
          description: true,
          wechatPositioning: true,
        },
      },
    },
  });

  if (!chapter) {
    notFound();
  }

  const [setting, characters, latestSummaryTask] = await Promise.all([
    prisma.projectSetting.findUnique({
      where: {
        projectId,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: {
        name: "asc",
      },
      take: 12,
    }),
    prisma.aiTask.findFirst({
      where: {
        projectId,
        chapterId,
        taskType: "chapter_summary_extraction",
        status: "completed",
      },
      orderBy: [
        {
          completedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        inputContextSummary: true,
        outputText: true,
        completedAt: true,
      },
    }),
  ]);

  return {
    project: chapter.project,
    setting,
    chapter: pickPendingUpdateChapterContext(chapter),
    characters,
    latestSummaryTask,
  };
}

function pickPendingUpdateChapterContext(chapter: PendingUpdateChapterContext) {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    goal: chapter.goal,
    beats: chapter.beats,
    finalText: chapter.finalText,
    notes: chapter.notes,
  };
}

async function findActivePendingUpdateTask(projectId: string, chapterId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      chapterId,
      taskType: "pending_update_extraction",
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function characterMemoryField(fieldName?: string | null): CharacterTextFieldName {
  if (
    isCharacterFieldName(fieldName) &&
    fieldName !== "name" &&
    fieldName !== "status"
  ) {
    return fieldName;
  }

  return "notes";
}

function revalidateChapterAndPendingUpdatePaths(
  projectId: string,
  chapterId: string,
) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/pending-updates`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
}

function revalidatePendingUpdatePaths(
  projectId: string,
  chapterId?: string | null,
) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/projects/${projectId}/settings/history`);
  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/pending-updates`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  }
}

function clean(value?: string | null) {
  return value?.trim() ?? "";
}
