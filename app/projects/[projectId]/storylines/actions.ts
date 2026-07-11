"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildStorylineGenerationContext,
  storylineGenerationTaskType,
} from "@/lib/ai/storylines";
import { expireStaleStorylineAiTasks } from "@/lib/ai/storyline-task-maintenance";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { findRecentCurrentChapterSummaries } from "@/lib/chapters/summaries";
import {
  normalizeStorylineStatus,
  normalizeStorylineType,
  storylineStatusOptions,
  storylineTypeOptions,
  type StorylineValidationErrorCode,
} from "@/lib/storyline-fields";
import { prisma } from "@/lib/prisma";
import {
  archiveStorylineRecord,
  completeStorylineRecord,
  createStorylineRecord,
  findActiveStorylineGenerationTask,
  findDuplicateStorylineCandidate,
  findStorylineForProject,
  updateStorylineRecord,
  validateStorylineRelationIds,
  type StorylineRecordValues,
  type StorylineRelationIds,
} from "@/lib/storylines/records";
import { assertProjectExists as assertProject } from "@/lib/server-actions/project-guards";

const storylineTypeValues = storylineTypeOptions.map((option) => option.value) as [
  string,
  ...string[],
];
const storylineStatusValues = storylineStatusOptions.map(
  (option) => option.value,
) as [string, ...string[]];

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

const storylineSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(storylineTypeValues).default("mainline"),
  status: z.enum(storylineStatusValues).default("active"),
  startChapter: optionalInt,
  endChapter: optionalInt,
  coreGoal: optionalText,
  currentProgress: optionalText,
  notes: optionalText,
});

type ParseStorylineResult =
  | {
      ok: true;
      values: StorylineRecordValues;
      relationIds: StorylineRelationIds;
    }
  | {
      ok: false;
      error: StorylineValidationErrorCode;
    };

export async function createStoryline(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const parsed = parseStorylineForm(formData);

  if (!parsed.ok) {
    redirectStorylineError(projectId, parsed.error);
  }

  const relationError = await validateStorylineRelationIds(
    projectId,
    parsed.relationIds,
  );

  if (relationError) {
    redirectStorylineError(projectId, relationError);
  }

  await createStorylineRecord({
    projectId,
    relationIds: parsed.relationIds,
    values: parsed.values,
  });

  revalidateStorylinePaths(projectId);
  redirect(`/projects/${projectId}/storylines?storylineSaved=created`);
}

export async function generateStorylineDrafts(projectId: string) {
  await expireStaleStorylineAiTasks(projectId);

  const activeTask = await findActiveStorylineGenerationTask(projectId);

  if (activeTask) {
    redirect(`/projects/${projectId}/storylines?storylineAi=active#storyline-ai`);
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      setting: true,
    },
  });

  if (!project) {
    notFound();
  }

  const [
    characters,
    foreshadows,
    chapters,
    recentSummaries,
    outlines,
    existingStorylines,
  ] = await Promise.all([
    prisma.character.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          name: "asc",
        },
      ],
      take: 80,
      select: {
        id: true,
        name: true,
        status: true,
        roleInStory: true,
        identity: true,
        characterArc: true,
        latestAppearance: true,
      },
    }),
    prisma.foreshadow.findMany({
      where: {
        projectId,
        status: {
          not: "abandoned",
        },
      },
      orderBy: [
        {
          importance: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 60,
      select: {
        id: true,
        content: true,
        status: true,
        importance: true,
        expectedResolveChapter: true,
      },
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
      },
      orderBy: {
        chapterNumber: "desc",
      },
      take: 12,
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        status: true,
        goal: true,
      },
    }),
    findRecentCurrentChapterSummaries({ projectId, limit: 12 }),
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
          updatedAt: "desc",
        },
      ],
      take: 30,
      select: {
        id: true,
        level: true,
        title: true,
        status: true,
        chapterNumber: true,
        startChapter: true,
        endChapter: true,
        goal: true,
        mainlineProgression: true,
        coreEvents: true,
        characterChanges: true,
        foreshadow: true,
        resolvedForeshadow: true,
      },
    }),
    prisma.storyline.findMany({
      where: {
        projectId,
        status: {
          not: "archived",
        },
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 30,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        startChapter: true,
        endChapter: true,
        coreGoal: true,
        currentProgress: true,
      },
    }),
  ]);

  const template = await ensureDefaultPromptTemplate(
    projectId,
    storylineGenerationTaskType,
  );
  const context = buildStorylineGenerationContext({
    project,
    setting: project.setting,
    characters,
    foreshadows,
    chapters: chapters.reverse().map((chapter) => ({
      ...chapter,
      summaryOutput:
        recentSummaries.find((summary) => summary.chapterId === chapter.id)
          ?.outputText ?? "",
    })),
    outlines,
    existingStorylines,
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

  revalidateStorylinePaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/storylines?storylineAi=started#storyline-ai`);
}

export async function saveStorylineDraftCandidate(
  projectId: string,
  taskId: string,
  formData: FormData,
) {
  await assertProject(projectId);

  const task = await prisma.aiTask.findFirst({
    where: {
      id: taskId,
      projectId,
      taskType: storylineGenerationTaskType,
      status: "completed",
      adoptionState: "not_reviewed",
    },
    select: {
      id: true,
    },
  });

  if (!task) {
    notFound();
  }

  const parsed = parseStorylineForm(formData);

  if (!parsed.ok) {
    redirectStorylineError(projectId, parsed.error);
  }

  const relationError = await validateStorylineRelationIds(
    projectId,
    parsed.relationIds,
  );

  if (relationError) {
    redirectStorylineError(projectId, relationError);
  }

  const duplicate = await findDuplicateStorylineCandidate(projectId, parsed.values);

  if (duplicate) {
    redirectStorylineError(projectId, "duplicateStoryline");
  }

  await createStorylineRecord({
    projectId,
    relationIds: parsed.relationIds,
    values: parsed.values,
  });

  revalidateStorylinePaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/storylines?storylineSaved=adopted#storylines`);
}

export async function updateStorylineDraftTaskAdoptionState(
  projectId: string,
  taskId: string,
  adoptionState: "adopted" | "rejected",
) {
  await assertProject(projectId);

  const result = await prisma.aiTask.updateMany({
    where: {
      id: taskId,
      projectId,
      taskType: storylineGenerationTaskType,
      status: "completed",
      adoptionState: "not_reviewed",
    },
    data: {
      adoptionState,
    },
  });

  revalidateStorylinePaths(projectId);
  revalidatePath(`/projects/${projectId}/ai`);

  if (result.count !== 1) {
    redirect(
      `/projects/${projectId}/storylines?storylineAi=already-reviewed#storyline-ai`,
    );
  }

  redirect(`/projects/${projectId}/storylines#storyline-ai`);
}

export async function updateStoryline(
  projectId: string,
  storylineId: string,
  formData: FormData,
) {
  await assertStoryline(projectId, storylineId);

  const parsed = parseStorylineForm(formData);

  if (!parsed.ok) {
    redirectStorylineError(projectId, parsed.error, storylineId);
  }

  const relationError = await validateStorylineRelationIds(
    projectId,
    parsed.relationIds,
  );

  if (relationError) {
    redirectStorylineError(projectId, relationError, storylineId);
  }

  await updateStorylineRecord({
    projectId,
    relationIds: parsed.relationIds,
    storylineId,
    values: parsed.values,
  });

  revalidateStorylinePaths(projectId);
  redirect(`/projects/${projectId}/storylines?storylineSaved=updated`);
}

export async function archiveStoryline(projectId: string, storylineId: string) {
  await assertStoryline(projectId, storylineId);

  await archiveStorylineRecord(storylineId);

  revalidateStorylinePaths(projectId);
  redirect(`/projects/${projectId}/storylines?storylineSaved=archived`);
}

export async function completeStoryline(projectId: string, storylineId: string) {
  await assertStoryline(projectId, storylineId);

  const result = await completeStorylineRecord({
    projectId,
    storylineId,
  });

  revalidateStorylinePaths(projectId);

  if (result !== "completed") {
    redirect(
      `/projects/${projectId}/storylines?storylineSaved=already-updated#storylines`,
    );
  }

  redirect(`/projects/${projectId}/storylines?storylineSaved=completed`);
}

function parseStorylineForm(formData: FormData): ParseStorylineResult {
  const parsed = storylineSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") ?? "mainline",
    status: formData.get("status") ?? "active",
    startChapter: formData.get("startChapter"),
    endChapter: formData.get("endChapter"),
    coreGoal: formData.get("coreGoal"),
    currentProgress: formData.get("currentProgress"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "invalidForm",
    };
  }

  if (
    parsed.data.startChapter &&
    parsed.data.endChapter &&
    parsed.data.endChapter < parsed.data.startChapter
  ) {
    return {
      ok: false,
      error: "invalidRange",
    };
  }

  return {
    ok: true,
    values: {
      ...parsed.data,
      type: normalizeStorylineType(parsed.data.type),
      status: normalizeStorylineStatus(parsed.data.status),
    },
    relationIds: {
      characterIds: uniqueFormValues(formData.getAll("characterIds")),
      foreshadowIds: uniqueFormValues(formData.getAll("foreshadowIds")),
      chapterIds: uniqueFormValues(formData.getAll("chapterIds")),
      outlineIds: uniqueFormValues(formData.getAll("outlineIds")),
    },
  };
}

async function assertStoryline(projectId: string, storylineId: string) {
  const storyline = await findStorylineForProject({
    projectId,
    storylineId,
  });

  if (!storyline) {
    notFound();
  }
}

function uniqueFormValues(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function redirectStorylineError(
  projectId: string,
  error: StorylineValidationErrorCode,
  editId?: string,
): never {
  revalidateStorylinePaths(projectId);
  const params = new URLSearchParams({
    storylineError: error,
  });

  if (editId) {
    params.set("editId", editId);
  }

  redirect(`/projects/${projectId}/storylines?${params.toString()}#storylines`);
}

function revalidateStorylinePaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/storylines`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
}
