"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  isExcerptedChapterPolishInputJson,
} from "@/lib/ai/chapter-polishes";
import { shortStoryUnitPlanTaskType } from "@/lib/ai/short-story-unit-plans";
import {
  startChapterBeatGeneration,
  startChapterDraftGeneration,
  startChapterPolishGeneration,
  startChapterSummaryGeneration,
  type ChapterAiGenerationResult,
} from "@/lib/chapters/ai-generation";
import {
  chapterFieldNames,
  chapterValuesFromRecord,
  chapterSnapshot,
  chapterStatusOptions,
  type ChapterValues,
} from "@/lib/chapter-fields";
import {
  ChapterContextNotFoundError,
} from "@/lib/chapters/context";
import { syncOutlineStatusesForChapterNumbers } from "@/lib/chapters/outline-status";
import {
  createChapterRecord,
  deleteChapterRecord,
  DuplicateChapterNumberError,
  findChapterForUpdate,
  updateChapterRecord,
} from "@/lib/chapters/records";
import { prisma } from "@/lib/prisma";
import {
  acquireActiveProjectContentWriteLease,
  ProjectContentWriteBlockedError,
} from "@/lib/projects/content-write-guard";
import { isShortStoryProject } from "@/lib/projects/work-types";
import { assertProjectAllowsContentWrites } from "@/lib/server-actions/project-guards";

const optionalChapterText = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? "" : value),
    z.string().trim().max(60000),
  )
  .default("");

const chapterNumberSchema = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().positive());

const optionalNonNegativeIntegerSchema = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().nonnegative());

const statusValues = chapterStatusOptions.map((option) => option.value) as [
  string,
  ...string[],
];

const chapterSchema = z.object({
  chapterNumber: chapterNumberSchema,
  title: z.string().trim().min(1, "请输入章节标题").max(160),
  status: z.enum(statusValues).default("draft"),
  goal: optionalChapterText,
  beats: optionalChapterText,
  unitSceneMovement: optionalChapterText,
  unitConflict: optionalChapterText,
  unitTurn: optionalChapterText,
  unitPayoffMovement: optionalChapterText,
  unitWordTarget: optionalNonNegativeIntegerSchema,
  draftText: optionalChapterText,
  polishedText: optionalChapterText,
  finalText: optionalChapterText,
  notes: optionalChapterText,
});

const changeReasonSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(1000).optional(),
  );

const sourceUnitPlanTaskIdSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.string().max(128).optional(),
);

function parseChapterForm(formData: FormData) {
  const parsedValues = chapterSchema.parse(
    Object.fromEntries(
      chapterFieldNames
        .filter((fieldName) => fieldName !== "wordCount")
        .map((fieldName) => [fieldName, formData.get(fieldName)]),
    ),
  );

  const values: ChapterValues = {
    ...parsedValues,
    wordCount: 0,
  };

  const submitIntent = formData.get("submitIntent");
  const finalizeError =
    submitIntent === "finalizeFromPolished" && !values.polishedText.trim()
      ? "missingPolishedText"
      : submitIntent === "finalizeFromDraft" && !values.draftText.trim()
        ? "missingDraftText"
        : null;
  const finalTextSource =
    submitIntent === "finalizeFromPolished"
      ? values.polishedText
      : submitIntent === "finalizeFromDraft"
        ? values.draftText
        : "";
  const shouldFinalize = Boolean(finalTextSource.trim());
  const parsedChangeReason = changeReasonSchema.parse(
    formData.get("changeReason"),
  );
  const changeReason = shouldFinalize
    ? (parsedChangeReason ??
      (submitIntent === "finalizeFromPolished"
        ? "一键定稿：将精修正文保存为定稿正文"
        : "一键定稿：将草稿正文保存为定稿正文"))
    : parsedChangeReason;

  if (shouldFinalize) {
    values.finalText = finalTextSource;
    values.status = "final";
  }

  return {
    values,
    changeReason,
    finalizeError,
    sourceUnitPlanTaskId: sourceUnitPlanTaskIdSchema.parse(
      formData.get("sourceUnitPlanTaskId"),
    ),
  };
}

async function loadChapterContextForAction<T>(loader: () => Promise<T>) {
  try {
    return await loader();
  } catch (error) {
    if (error instanceof ChapterContextNotFoundError) {
      notFound();
    }

    throw error;
  }
}

function finishChapterAiGenerationAction({
  chapterId,
  projectId,
  result,
}: {
  chapterId: string;
  projectId: string;
  result: ChapterAiGenerationResult;
}) {
  if (result.status === "started") {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/ai`);
  }

  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

async function assertWritableProject(projectId: string) {
  try {
    return await assertProjectAllowsContentWrites(projectId);
  } catch (error) {
    redirectProjectWriteBlockedError(error, projectId);
  }
}

function redirectProjectWriteBlockedError(
  error: unknown,
  projectId: string,
): never {
  if (error instanceof ProjectContentWriteBlockedError) {
    redirect(`/projects/${projectId}/edit?projectError=restore-required`);
  }

  throw error;
}

export async function createChapter(projectId: string, formData: FormData) {
  const project = await assertWritableProject(projectId);
  const serialProject = !isShortStoryProject(project.workType);

  const { values, changeReason, sourceUnitPlanTaskId } =
    parseChapterForm(formData);
  let createResult: Awaited<ReturnType<typeof createChapterRecord>>;

  try {
    createResult = await createChapterRecord({
      projectId,
      values,
      changeReason,
      linkStorylines: serialProject,
      sourceAiTask:
        !serialProject && sourceUnitPlanTaskId
          ? {
              id: sourceUnitPlanTaskId,
              taskType: shortStoryUnitPlanTaskType,
              sourceType: "ai_short_story_unit_plan",
            }
          : undefined,
    });
  } catch (error) {
    if (error instanceof DuplicateChapterNumberError) {
      redirect(
        `/projects/${projectId}/chapters/new?chapterError=duplicate-number`,
      );
    }

    redirectProjectWriteBlockedError(error, projectId);
  }

  const { chapter, chapterNumber } = createResult;

  if (serialProject) {
    await syncOutlineStatusesForChapterNumbers(projectId, [chapterNumber]);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  redirect(`/projects/${projectId}/chapters/${chapter.id}`);
}

export async function updateChapter(
  projectId: string,
  chapterId: string,
  formData: FormData,
) {
  const project = await assertWritableProject(projectId);
  const serialProject = !isShortStoryProject(project.workType);
  const chapter = await findChapterForUpdate({
    projectId,
    chapterId,
  });

  if (!chapter) {
    notFound();
  }

  const { values, changeReason, finalizeError } = parseChapterForm(formData);

  if (finalizeError) {
    const targetHash =
      finalizeError === "missingPolishedText" ? "polishedText" : "draftText";

    revalidatePath(`/projects/${projectId}/chapters/${chapterId}/edit`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}/edit?finalizeError=${finalizeError}#${targetHash}`,
    );
  }

  let updateResult: Awaited<ReturnType<typeof updateChapterRecord>>;

  try {
    updateResult = await updateChapterRecord({
      projectId,
      chapter,
      values,
      changeReason,
      linkStorylines: serialProject,
    });
  } catch (error) {
    if (error instanceof DuplicateChapterNumberError) {
      redirect(
        `/projects/${projectId}/chapters/${chapterId}/edit?chapterError=duplicate-number`,
      );
    }

    redirectProjectWriteBlockedError(error, projectId);
  }

  if (serialProject) {
    await syncOutlineStatusesForChapterNumbers(projectId, [
      updateResult.previousChapterNumber,
      updateResult.chapterNumber,
    ]);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function deleteChapter(projectId: string, chapterId: string) {
  const project = await assertWritableProject(projectId);
  const serialProject = !isShortStoryProject(project.workType);
  let deleteResult: Awaited<ReturnType<typeof deleteChapterRecord>>;

  try {
    deleteResult = await deleteChapterRecord({
      projectId,
      chapterId,
    });
  } catch (error) {
    redirectProjectWriteBlockedError(error, projectId);
  }

  if (!deleteResult) {
    notFound();
  }

  if (serialProject) {
    await syncOutlineStatusesForChapterNumbers(projectId, [
      deleteResult.chapterNumber,
    ]);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  redirect(`/projects/${projectId}/chapters`);
}

export async function generateChapterBeats(projectId: string, chapterId: string) {
  await assertWritableProject(projectId);
  const result = await loadChapterContextForAction(() =>
    startChapterBeatGeneration(projectId, chapterId),
  );

  finishChapterAiGenerationAction({
    projectId,
    chapterId,
    result,
  });
}

export async function generateChapterDraft(
  projectId: string,
  chapterId: string,
  formData?: FormData,
) {
  await assertWritableProject(projectId);
  const result = await loadChapterContextForAction(() =>
    startChapterDraftGeneration(
      projectId,
      chapterId,
      formData?.get("platformTemplate"),
    ),
  );

  finishChapterAiGenerationAction({
    projectId,
    chapterId,
    result,
  });
}

export async function generateChapterPolish(
  projectId: string,
  chapterId: string,
  formData?: FormData,
) {
  await assertWritableProject(projectId);
  const result = await loadChapterContextForAction(() =>
    startChapterPolishGeneration(
      projectId,
      chapterId,
      formData?.get("platformTemplate"),
    ),
  );

  finishChapterAiGenerationAction({
    projectId,
    chapterId,
    result,
  });
}

export async function generateChapterSummary(projectId: string, chapterId: string) {
  await assertWritableProject(projectId);
  const result = await loadChapterContextForAction(() =>
    startChapterSummaryGeneration(projectId, chapterId),
  );

  finishChapterAiGenerationAction({
    projectId,
    chapterId,
    result,
  });
}

export async function adoptChapterBeats(
  projectId: string,
  chapterId: string,
  taskId: string,
) {
  await assertWritableProject(projectId);
  const [chapter, task] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        id: chapterId,
        projectId,
      },
    }),
    prisma.aiTask.findFirst({
      where: {
        id: taskId,
        projectId,
        chapterId,
        taskType: "chapter_beat_generation",
        status: "completed",
      },
      select: {
        id: true,
        outputText: true,
      },
    }),
  ]);

  const beats = task?.outputText?.trim();

  if (!chapter || !task || !beats) {
    notFound();
  }

  const snapshot = chapterSnapshot({
    ...chapterValuesFromRecord(chapter),
    beats,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await acquireActiveProjectContentWriteLease(tx, projectId);

      await tx.chapter.update({
        where: {
          id: chapterId,
        },
        data: snapshot,
      });

      const versionCount = await tx.chapterVersion.count({
        where: {
          chapterId,
        },
      });

      await tx.chapterVersion.create({
        data: {
          projectId,
          chapterId,
          versionNumber: versionCount + 1,
          snapshotJson: JSON.stringify(snapshot),
          changeReason: `采用 AI 章节节拍任务 ${task.id}`,
          sourceType: "ai_chapter_beats",
        },
      });

      await tx.aiTask.update({
        where: {
          id: task.id,
        },
        data: {
          adoptionState: "adopted",
        },
      });
    });
  } catch (error) {
    redirectProjectWriteBlockedError(error, projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function adoptChapterDraft(
  projectId: string,
  chapterId: string,
  taskId: string,
) {
  await assertWritableProject(projectId);
  const [chapter, task] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        id: chapterId,
        projectId,
      },
    }),
    prisma.aiTask.findFirst({
      where: {
        id: taskId,
        projectId,
        chapterId,
        taskType: "chapter_draft_generation",
        status: "completed",
      },
      select: {
        id: true,
        outputText: true,
      },
    }),
  ]);

  const draftText = task?.outputText?.trim();

  if (!chapter || !task || !draftText) {
    notFound();
  }

  const snapshot = chapterSnapshot({
    ...chapterValuesFromRecord(chapter),
    draftText,
  });

  try {
    await prisma.$transaction(async (tx) => {
      await acquireActiveProjectContentWriteLease(tx, projectId);

      await tx.chapter.update({
        where: {
          id: chapterId,
        },
        data: snapshot,
      });

      const versionCount = await tx.chapterVersion.count({
        where: {
          chapterId,
        },
      });

      await tx.chapterVersion.create({
        data: {
          projectId,
          chapterId,
          versionNumber: versionCount + 1,
          snapshotJson: JSON.stringify(snapshot),
          changeReason: `采用 AI 章节草稿任务 ${task.id}`,
          sourceType: "ai_chapter_draft",
        },
      });

      await tx.aiTask.update({
        where: {
          id: task.id,
        },
        data: {
          adoptionState: "adopted",
        },
      });
    });
  } catch (error) {
    redirectProjectWriteBlockedError(error, projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function adoptChapterPolish(
  projectId: string,
  chapterId: string,
  taskId: string,
) {
  await assertWritableProject(projectId);
  const [chapter, task] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        id: chapterId,
        projectId,
      },
    }),
    prisma.aiTask.findFirst({
      where: {
        id: taskId,
        projectId,
        chapterId,
        taskType: "chapter_polish_generation",
        status: "completed",
      },
      select: {
        id: true,
        inputJson: true,
        outputText: true,
        adoptionState: true,
      },
    }),
  ]);

  const polishedText = task?.outputText?.trim();

  if (!chapter || !task || !polishedText) {
    notFound();
  }

  if (task.adoptionState !== "not_reviewed") {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  if (isExcerptedChapterPolishInputJson(task.inputJson)) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?polishError=excerptedTaskCannotAdopt`,
    );
  }

  const snapshot = chapterSnapshot({
    ...chapterValuesFromRecord(chapter),
    polishedText,
    status: chapter.status === "published" ? "published" : "revising",
  });

  let adopted = false;

  try {
    adopted = await prisma.$transaction(async (tx) => {
      await acquireActiveProjectContentWriteLease(tx, projectId);

      const adoptedTask = await tx.aiTask.updateMany({
        where: {
          id: task.id,
          adoptionState: "not_reviewed",
        },
        data: {
          adoptionState: "adopted",
        },
      });

      if (adoptedTask.count !== 1) {
        return false;
      }

      await tx.chapter.update({
        where: {
          id: chapterId,
        },
        data: snapshot,
      });

      const versionCount = await tx.chapterVersion.count({
        where: {
          chapterId,
        },
      });

      await tx.chapterVersion.create({
        data: {
          projectId,
          chapterId,
          versionNumber: versionCount + 1,
          snapshotJson: JSON.stringify(snapshot),
          changeReason: `采用 AI 正文精修任务 ${task.id}`,
          sourceType: "ai_chapter_polish",
        },
      });

      return true;
    });
  } catch (error) {
    redirectProjectWriteBlockedError(error, projectId);
  }

  if (adopted) {
    await syncOutlineStatusesForChapterNumbers(projectId, [
      chapter.chapterNumber,
    ]);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}
