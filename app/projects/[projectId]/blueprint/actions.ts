"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { expireStaleShortStoryBlueprintTasks } from "@/lib/ai/short-story-blueprint-task-maintenance";
import {
  buildShortStoryBlueprintGenerationContext,
  isReviewableShortStoryBlueprintDraft,
  parseShortStoryBlueprintGenerationOutput,
  shortStoryBlueprintTaskType,
  shortStoryBlueprintTemplateKey,
} from "@/lib/ai/short-story-blueprints";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { prisma } from "@/lib/prisma";
import { assertShortStoryProject } from "@/lib/server-actions/project-guards";
import {
  hasShortStoryBlueprintContent,
  shortStoryBlueprintFieldNames,
  shortStoryBlueprintSnapshot,
  shortStoryBlueprintValuesFromRecord,
  type ShortStoryBlueprintFieldName,
  type ShortStoryBlueprintValues,
} from "@/lib/short-stories/blueprint-fields";
import { loadShortStorySeriesContext } from "@/lib/short-story-series/context";

const blueprintText = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? "" : value),
    z.string().trim().max(8000),
  )
  .default("");

const blueprintSchema = z.object(
  Object.fromEntries(
    shortStoryBlueprintFieldNames.map((fieldName) => [
      fieldName,
      blueprintText,
    ]),
  ) as Record<
    ShortStoryBlueprintFieldName,
    z.ZodDefault<z.ZodEffects<z.ZodString, string, unknown>>
  >,
);

const changeReasonSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(1000).optional(),
);

function parseBlueprintForm(formData: FormData) {
  const values = blueprintSchema.parse(
    Object.fromEntries(
      shortStoryBlueprintFieldNames.map((fieldName) => [
        fieldName,
        formData.get(fieldName),
      ]),
    ),
  ) as ShortStoryBlueprintValues;

  return {
    values,
    changeReason: changeReasonSchema.parse(formData.get("changeReason")),
  };
}

export async function saveShortStoryBlueprint(
  projectId: string,
  formData: FormData,
) {
  await assertShortStoryProject(projectId);
  const { values, changeReason } = parseBlueprintForm(formData);
  const snapshot = shortStoryBlueprintSnapshot(values);

  if (!hasShortStoryBlueprintContent(snapshot)) {
    revalidateBlueprintPaths(projectId);
    redirect(`/projects/${projectId}/blueprint?blueprintError=empty`);
  }

  await prisma.$transaction(async (tx) => {
    const blueprint = await tx.shortStoryBlueprint.upsert({
      where: {
        projectId,
      },
      create: {
        projectId,
        ...snapshot,
      },
      update: snapshot,
    });
    const versionCount = await tx.shortStoryBlueprintVersion.count({
      where: {
        projectId,
      },
    });

    await tx.shortStoryBlueprintVersion.create({
      data: {
        projectId,
        blueprintId: blueprint.id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason,
        sourceType: "manual",
      },
    });
  });

  revalidateBlueprintPaths(projectId);
  redirect(`/projects/${projectId}/blueprint`);
}

export async function generateShortStoryBlueprintDraft(projectId: string) {
  await assertShortStoryProject(projectId);
  await expireStaleShortStoryBlueprintTasks(projectId);

  const activeTask = await prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: shortStoryBlueprintTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });

  if (activeTask) {
    revalidateBlueprintPaths(projectId);
    redirect(`/projects/${projectId}/blueprint`);
  }

  const [project, characters, seriesContext] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: projectId,
        workType: "short_story",
      },
      include: {
        setting: true,
        shortStoryBlueprint: true,
      },
    }),
    prisma.character.findMany({
      where: {
        projectId,
        status: "active",
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          name: "asc",
        },
      ],
      take: 12,
    }),
    loadShortStorySeriesContext(projectId),
  ]);

  if (!project) {
    notFound();
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    shortStoryBlueprintTemplateKey,
  );
  const context = buildShortStoryBlueprintGenerationContext({
    project,
    setting: project.setting,
    characters,
    seriesContext,
    blueprint: project.shortStoryBlueprint,
  });

  await startLoggedOpenAITextTask(
    {
      projectId,
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

  revalidateBlueprintPaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/blueprint`);
}

export async function adoptShortStoryBlueprintDraft(
  projectId: string,
  taskId: string,
) {
  await assertShortStoryProject(projectId);
  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      projectId,
      taskType: shortStoryBlueprintTaskType,
      status: "completed",
      adoptionState: "not_reviewed",
    },
    select: {
      id: true,
      inputContextSummary: true,
      outputText: true,
    },
  });

  if (!task) {
    notFound();
  }

  const draft = parseShortStoryBlueprintGenerationOutput(task.outputText);

  if (!isReviewableShortStoryBlueprintDraft(draft)) {
    revalidateBlueprintPaths(projectId);
    redirect(`/projects/${projectId}/blueprint?blueprintError=invalidDraft`);
  }

  const adopted = await prisma.$transaction(async (tx) => {
    const claimedTask = await tx.aiTask.updateMany({
      where: {
        id: task.id,
        projectId,
        taskType: shortStoryBlueprintTaskType,
        status: "completed",
        adoptionState: "not_reviewed",
      },
      data: {
        adoptionState: "adopted",
      },
    });

    if (claimedTask.count !== 1) {
      return false;
    }

    const currentBlueprint = await tx.shortStoryBlueprint.findUnique({
      where: {
        projectId,
      },
    });
    const snapshot = shortStoryBlueprintSnapshot({
      ...shortStoryBlueprintValuesFromRecord(currentBlueprint),
      ...draft,
    });
    const blueprint = await tx.shortStoryBlueprint.upsert({
      where: {
        projectId,
      },
      create: {
        projectId,
        ...snapshot,
      },
      update: snapshot,
    });
    const versionCount = await tx.shortStoryBlueprintVersion.count({
      where: {
        projectId,
      },
    });

    await tx.shortStoryBlueprintVersion.create({
      data: {
        projectId,
        blueprintId: blueprint.id,
        sourceAiTaskId: task.id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason: `采用 AI 短故事蓝图：${task.inputContextSummary}`,
        sourceType: "ai_short_story_blueprint",
      },
    });

    return true;
  });

  revalidateBlueprintPaths(projectId);
  redirect(
    adopted
      ? `/projects/${projectId}/blueprint`
      : `/projects/${projectId}/blueprint?blueprintError=alreadyReviewed`,
  );
}

export async function rejectShortStoryBlueprintDraft(
  projectId: string,
  taskId: string,
) {
  await assertShortStoryProject(projectId);

  await prisma.aiTask.updateMany({
    where: {
      id: taskId,
      projectId,
      taskType: shortStoryBlueprintTaskType,
      status: "completed",
      adoptionState: "not_reviewed",
    },
    data: {
      adoptionState: "rejected",
    },
  });

  revalidateBlueprintPaths(projectId);
  redirect(`/projects/${projectId}/blueprint`);
}

export async function restoreShortStoryBlueprintVersion(
  projectId: string,
  versionId: string,
) {
  await assertShortStoryProject(projectId);
  const version = await prisma.shortStoryBlueprintVersion.findFirst({
    where: {
      id: versionId,
      projectId,
    },
    select: {
      snapshotJson: true,
      versionNumber: true,
    },
  });

  if (!version) {
    notFound();
  }

  const snapshot = parseBlueprintSnapshot(version.snapshotJson);

  if (!hasShortStoryBlueprintContent(snapshot)) {
    revalidateBlueprintPaths(projectId);
    redirect(`/projects/${projectId}/blueprint?blueprintError=invalidVersion`);
  }

  await prisma.$transaction(async (tx) => {
    const blueprint = await tx.shortStoryBlueprint.upsert({
      where: {
        projectId,
      },
      create: {
        projectId,
        ...snapshot,
      },
      update: snapshot,
    });
    const versionCount = await tx.shortStoryBlueprintVersion.count({
      where: {
        projectId,
      },
    });

    await tx.shortStoryBlueprintVersion.create({
      data: {
        projectId,
        blueprintId: blueprint.id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason: `从短故事蓝图历史 v${version.versionNumber} 恢复`,
        sourceType: "rollback",
      },
    });
  });

  revalidateBlueprintPaths(projectId);
  revalidatePath(`/projects/${projectId}/blueprint/history/${versionId}`);
  redirect(`/projects/${projectId}/blueprint`);
}

function parseBlueprintSnapshot(snapshotJson: string) {
  try {
    const parsed = JSON.parse(snapshotJson);

    return shortStoryBlueprintSnapshot(
      typeof parsed === "object" && parsed !== null ? parsed : {},
    );
  } catch {
    return shortStoryBlueprintSnapshot({});
  }
}

function revalidateBlueprintPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/blueprint`);
  revalidatePath(`/projects/${projectId}/blueprint/history`);
}
