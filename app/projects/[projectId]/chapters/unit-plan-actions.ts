"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { expireStaleShortStoryUnitPlanTasks } from "@/lib/ai/short-story-unit-plan-task-maintenance";
import {
  buildShortStoryUnitPlanGenerationContext,
  isUsableShortStoryBlueprint,
  shortStoryUnitPlanDraftFieldNames,
  shortStoryUnitPlanTaskType,
  shortStoryUnitPlanTemplateKey,
  type ShortStoryUnitPlanDraft,
} from "@/lib/ai/short-story-unit-plans";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { prisma } from "@/lib/prisma";
import { assertShortStoryProject } from "@/lib/server-actions/project-guards";
import { recommendShortStoryWritingUnits } from "@/lib/short-stories/writing-units";
import { loadShortStorySeriesContext } from "@/lib/short-story-series/context";

const positiveIntegerFromForm = z.preprocess((value) => {
  if (typeof value !== "string" || !value.trim()) {
    return value;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().positive().max(100000));

const unitPlanHintText = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string().trim().max(8000),
);

const unitPlanGenerationFormSchema = z.object({
  chapterNumber: positiveIntegerFromForm,
  unitWordTarget: positiveIntegerFromForm,
  title: unitPlanHintText,
  unitSceneMovement: unitPlanHintText,
  unitConflict: unitPlanHintText,
  unitTurn: unitPlanHintText,
  unitPayoffMovement: unitPlanHintText,
  goal: unitPlanHintText,
});

export async function generateShortStoryUnitPlanDraft(
  projectId: string,
  formData: FormData,
) {
  await assertShortStoryProject(projectId);
  await expireStaleShortStoryUnitPlanTasks(projectId);

  const parsedForm = unitPlanGenerationFormSchema.safeParse(
    Object.fromEntries(
      [
        "chapterNumber",
        "unitWordTarget",
        ...shortStoryUnitPlanDraftFieldNames,
      ].map((fieldName) => [fieldName, formData.get(fieldName)]),
    ),
  );

  if (!parsedForm.success) {
    finishUnitPlanGeneration(projectId, "invalid-target");
  }

  const activeTask = await prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: shortStoryUnitPlanTaskType,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });

  if (activeTask) {
    finishUnitPlanGeneration(
      projectId,
      undefined,
      parsedForm.data.chapterNumber,
    );
  }

  const chapterNumber = parsedForm.data.chapterNumber;
  const [project, characters, previousUnits, seriesContext] = await Promise.all([
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
    prisma.chapter.findMany({
      where: {
        projectId,
        chapterNumber: {
          lt: chapterNumber,
        },
      },
      orderBy: {
        chapterNumber: "desc",
      },
      take: 12,
    }),
    loadShortStorySeriesContext(projectId),
  ]);

  if (!project) {
    notFound();
  }

  if (!isUsableShortStoryBlueprint(project.shortStoryBlueprint)) {
    finishUnitPlanGeneration(
      projectId,
      "missing-blueprint",
      parsedForm.data.chapterNumber,
    );
  }

  const recommendation = recommendShortStoryWritingUnits({
    totalWordTarget: project.totalWordTarget,
    unitWordMin: project.chapterWordMin,
    unitWordMax: project.chapterWordMax,
  });
  const template = await ensureDefaultPromptTemplate(
    projectId,
    shortStoryUnitPlanTemplateKey,
  );
  const authorHints = shortStoryUnitPlanDraftFieldNames.reduce(
    (values, fieldName) => {
      const value = parsedForm.data[fieldName];

      if (
        value &&
        !(fieldName === "title" && /^单元\s*\d+$/u.test(value))
      ) {
        values[fieldName] = value;
      }

      return values;
    },
    {} as Partial<ShortStoryUnitPlanDraft>,
  );
  const context = buildShortStoryUnitPlanGenerationContext({
    project,
    setting: project.setting,
    characters,
    seriesContext,
    blueprint: project.shortStoryBlueprint,
    previousUnits,
    target: {
      chapterNumber,
      totalUnitCount: recommendation.unitCount,
      unitWordTarget: parsedForm.data.unitWordTarget,
    },
    authorHints,
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

  revalidatePath(`/projects/${projectId}/ai`);
  finishUnitPlanGeneration(projectId, undefined, chapterNumber);
}

function finishUnitPlanGeneration(
  projectId: string,
  error?: string,
  chapterNumber?: number,
): never {
  const path = `/projects/${projectId}/chapters/new`;
  const searchParams = new URLSearchParams();

  if (error) {
    searchParams.set("unitPlanError", error);
  }

  if (chapterNumber) {
    searchParams.set("unitPlanTarget", String(chapterNumber));
  }

  revalidatePath(path);
  redirect(searchParams.size > 0 ? `${path}?${searchParams}` : path);
}
