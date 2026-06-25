"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { buildEndingPlanningContext } from "@/lib/ai/ending-planning";
import { buildOutlineGenerationContext } from "@/lib/ai/outlines";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { activeAiTaskStatuses } from "@/lib/ai/status";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import {
  endingPlanningGenerationTaskType,
  expireStaleOutlineAiTasks,
  outlineGenerationTaskType,
} from "@/lib/ai/outline-task-maintenance";
import {
  inferOutlineSortOrder,
  normalizeOutlineLevel,
  normalizeOutlineStatus,
  outlineLevels,
  outlineNumberFieldNames,
  outlineSnapshot,
  outlineStatusOptions,
  outlineTextFieldNames,
  type OutlineValidationErrorCode,
  validateOutlineValues,
  type OutlineLevel,
  type OutlineValues,
} from "@/lib/outline-fields";
import { prisma } from "@/lib/prisma";

const outlineTemplateKey = outlineGenerationTaskType;
const endingPlanningTemplateKey = endingPlanningGenerationTaskType;

const outlineStatusValues = outlineStatusOptions.map((option) => option.value) as [
  string,
  ...string[],
];

const optionalText = z
  .preprocess(
    (value) => {
      if (value == null) {
        return "";
      }

      return typeof value === "string" && value.trim() === "" ? "" : value;
    },
    z.string().trim().max(12000),
  )
  .default("");

const optionalInt = z
  .preprocess((value) => {
    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().int().positive().nullable())
  .default(null);

const optionalSortOrder = z
  .preprocess((value) => {
    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().int().min(0).nullable())
  .default(null);

const outlineSchema = z.object({
  level: z.enum(outlineLevels).default("volume"),
  title: z.string().trim().min(1, "请输入大纲标题").max(180),
  status: z.enum(outlineStatusValues).default("planned"),
  sortOrder: optionalSortOrder,
  ...Object.fromEntries(
    outlineTextFieldNames.map((fieldName) => [fieldName, optionalText]),
  ),
  ...Object.fromEntries(
    outlineNumberFieldNames
      .filter((fieldName) => fieldName !== "sortOrder")
      .map((fieldName) => [fieldName, optionalInt]),
  ),
});

const generationRequestSchema = z.object({
  targetLevel: z
    .string()
    .transform((value) => normalizeOutlineLevel(value))
    .default("volume"),
  chapterCount: z
    .preprocess((value) => {
      if (typeof value !== "string" || value.trim() === "") {
        return null;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }, z.number().int().min(1).max(30).nullable())
    .default(null),
  targetChapterNumber: z
    .preprocess((value) => {
      if (typeof value !== "string" || value.trim() === "") {
        return null;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }, z.number().int().min(1).nullable())
    .default(null),
}).transform((request) => ({
  ...request,
  chapterCount: request.targetLevel === "chapter" ? 1 : null,
  targetChapterNumber:
    request.targetLevel === "chapter" ? request.targetChapterNumber : null,
}));

type ParseOutlineFormResult =
  | {
      ok: true;
      values: OutlineValues;
    }
  | {
      ok: false;
      error: OutlineValidationErrorCode;
    };

function parseOutlineForm(formData: FormData): ParseOutlineFormResult {
  const raw = {
    level: formData.get("level"),
    title: formData.get("title"),
    status: formData.get("status"),
    sortOrder: formData.get("sortOrder"),
    ...Object.fromEntries(
      outlineTextFieldNames.map((fieldName) => [
        fieldName,
        formData.get(fieldName),
      ]),
    ),
    ...Object.fromEntries(
      outlineNumberFieldNames
        .filter((fieldName) => fieldName !== "sortOrder")
      .map((fieldName) => [fieldName, formData.get(fieldName)]),
    ),
  };
  const parsedResult = outlineSchema.safeParse(raw);

  if (!parsedResult.success) {
    return {
      ok: false,
      error: "invalidForm",
    };
  }

  const parsed = parsedResult.data;
  const values = outlineValuesFromParsed(parsed);

  return {
    ok: true,
    values: {
      ...values,
      sortOrder: values.sortOrder ?? inferOutlineSortOrder(values),
    },
  };
}

function outlineValuesFromParsed(
  parsed: z.infer<typeof outlineSchema>,
): OutlineValues {
  const parsedRecord = parsed as Record<string, string | number | null>;

  return {
    level: normalizeOutlineLevel(parsed.level),
    title: parsed.title,
    status: normalizeOutlineStatus(parsed.status),
    sortOrder: parsed.sortOrder,
    ...Object.fromEntries(
      outlineTextFieldNames.map((fieldName) => [
        fieldName,
        typeof parsedRecord[fieldName] === "string"
          ? parsedRecord[fieldName]
          : "",
      ]),
    ),
    ...Object.fromEntries(
      outlineNumberFieldNames
        .filter((fieldName) => fieldName !== "sortOrder")
        .map((fieldName) => [
          fieldName,
          typeof parsedRecord[fieldName] === "number"
            ? parsedRecord[fieldName]
            : null,
        ]),
    ),
  } as OutlineValues;
}

async function assertProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    notFound();
  }
}

export async function createOutline(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const parsed = parseOutlineForm(formData);

  if (!parsed.ok) {
    revalidateOutlinePaths(projectId);
    redirect(`/projects/${projectId}/outlines?outlineError=${parsed.error}`);
  }

  const values = parsed.values;
  const validationError = validateOutlineValues(values);

  if (validationError) {
    revalidateOutlinePaths(projectId);
    redirect(`/projects/${projectId}/outlines?outlineError=${validationError}`);
  }

  await prisma.outline.create({
    data: {
      projectId,
      ...outlineSnapshot(values),
    },
  });

  revalidateOutlinePaths(projectId);
  redirect(`/projects/${projectId}/outlines?outlineSaved=${values.level}`);
}

export async function updateOutline(
  projectId: string,
  outlineId: string,
  formData: FormData,
) {
  await assertProject(projectId);

  const outline = await prisma.outline.findFirst({
    where: {
      id: outlineId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!outline) {
    notFound();
  }

  const parsed = parseOutlineForm(formData);

  if (!parsed.ok) {
    revalidatePath(`/projects/${projectId}/outlines/${outlineId}/edit`);
    redirect(
      `/projects/${projectId}/outlines/${outlineId}/edit?outlineError=${parsed.error}`,
    );
  }

  const values = parsed.values;
  const validationError = validateOutlineValues(values);

  if (validationError) {
    revalidatePath(`/projects/${projectId}/outlines/${outlineId}/edit`);
    redirect(
      `/projects/${projectId}/outlines/${outlineId}/edit?outlineError=${validationError}`,
    );
  }

  await prisma.outline.update({
    where: {
      id: outlineId,
    },
    data: outlineSnapshot(values),
  });

  revalidateOutlinePaths(projectId);
  redirect(`/projects/${projectId}/outlines`);
}

export async function deleteOutline(projectId: string, outlineId: string) {
  const outline = await prisma.outline.findFirst({
    where: {
      id: outlineId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!outline) {
    notFound();
  }

  await prisma.outline.delete({
    where: {
      id: outlineId,
    },
  });

  revalidateOutlinePaths(projectId);
  redirect(`/projects/${projectId}/outlines`);
}

export async function generateOutlineDraft(projectId: string, formData: FormData) {
  await assertProject(projectId);
  await expireStaleOutlineAiTasks(projectId);

  const activeTask = await findActiveOutlineGenerationTask(projectId);

  if (activeTask) {
    revalidateOutlinePaths(projectId);
    redirect(`/projects/${projectId}/outlines`);
  }

  const rawRequest = {
    targetLevel: formData.get("targetLevel"),
    chapterCount: formData.get("chapterCount"),
    targetChapterNumber: formData.get("targetChapterNumber"),
  };
  const request = generationRequestSchema.parse(rawRequest);
  const [project, outlines, characters, recentChapters] = await Promise.all([
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        setting: true,
      },
    }),
    prisma.outline.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      orderBy: [
        {
          level: "asc",
        },
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
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
    prisma.chapter.findMany({
      where: {
        projectId,
      },
      orderBy: {
        chapterNumber: "desc",
      },
      take: 5,
    }),
  ]);

  if (!project) {
    notFound();
  }

  const resolvedRequest =
    request.targetLevel === "chapter"
      ? {
          ...request,
          targetChapterNumber:
            request.targetChapterNumber ??
            inferNextTargetChapterNumber(recentChapters, outlines),
        }
      : request;
  const template = await ensureDefaultPromptTemplate(
    projectId,
    outlineTemplateKey,
  );
  const context = buildOutlineGenerationContext({
    project,
    setting: project.setting,
    outlines,
    characters,
    recentChapters: recentChapters.reverse(),
    request: resolvedRequest,
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
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  revalidateOutlinePaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/outlines`);
}

export async function generateEndingPlanDraft(projectId: string) {
  await assertProject(projectId);
  await expireStaleOutlineAiTasks(projectId);

  const activeTask = await findActiveEndingPlanningTask(projectId);

  if (activeTask) {
    revalidateOutlinePaths(projectId);
    redirect(`/projects/${projectId}/outlines#ending-planning`);
  }

  const [project, outlines, chapters, foreshadows, characters, timelineEvents] =
    await Promise.all([
      prisma.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          setting: true,
        },
      }),
      prisma.outline.findMany({
        where: {
          projectId,
          status: {
            not: "archived",
          },
        },
        orderBy: [
          {
            level: "asc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      }),
      prisma.chapter.findMany({
        where: {
          projectId,
        },
        orderBy: {
          chapterNumber: "asc",
        },
        select: {
          chapterNumber: true,
          title: true,
          status: true,
          goal: true,
          wordCount: true,
        },
      }),
      prisma.foreshadow.findMany({
        where: {
          projectId,
          status: {
            not: "abandoned",
          },
        },
        include: {
          plantedChapter: {
            select: {
              chapterNumber: true,
              title: true,
            },
          },
          resolvedChapter: {
            select: {
              chapterNumber: true,
              title: true,
            },
          },
        },
        orderBy: [
          {
            importance: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: 30,
      }),
      prisma.character.findMany({
        where: {
          projectId,
          status: "active",
        },
        orderBy: {
          name: "asc",
        },
        select: {
          name: true,
          roleInStory: true,
          characterArc: true,
          status: true,
        },
        take: 24,
      }),
      prisma.timelineEvent.findMany({
        where: {
          projectId,
          status: "active",
        },
        include: {
          chapter: {
            select: {
              chapterNumber: true,
              title: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 12,
      }),
    ]);

  if (!project) {
    notFound();
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    endingPlanningTemplateKey,
  );
  const context = buildEndingPlanningContext({
    project,
    setting: project.setting,
    outlines,
    chapters,
    foreshadows,
    characters,
    timelineEvents: timelineEvents.reverse(),
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
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  revalidateOutlinePaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/outlines#ending-planning`);
}

async function findActiveOutlineGenerationTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: outlineTemplateKey,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

async function findActiveEndingPlanningTask(projectId: string) {
  return prisma.aiTask.findFirst({
    where: {
      projectId,
      taskType: endingPlanningTemplateKey,
      status: {
        in: [...activeAiTaskStatuses],
      },
    },
    select: {
      id: true,
    },
  });
}

function revalidateOutlinePaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/outlines`);
}

function inferNextTargetChapterNumber(
  chapters: readonly { chapterNumber: number }[],
  outlines: readonly { level?: string | null; chapterNumber?: number | null }[],
) {
  const maxKnownChapterNumber = Math.max(
    0,
    ...chapters.map((chapter) => chapter.chapterNumber),
    ...outlines
      .filter((outline) => outline.level === "chapter")
      .map((outline) => outline.chapterNumber ?? 0),
  );

  return maxKnownChapterNumber + 1;
}
