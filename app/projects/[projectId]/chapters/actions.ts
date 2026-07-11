"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  isExcerptedChapterPolishInputJson,
} from "@/lib/ai/chapter-polishes";
import {
  startChapterBeatGeneration,
  startChapterDraftGeneration,
  startChapterPolishGeneration,
  startChapterSummaryGeneration,
  type ChapterAiGenerationResult,
} from "@/lib/chapters/ai-generation";
import { readStationCatPublishSecrets } from "@/lib/ai/local-config";
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
  latestStationCatChapterRemoteId,
  saveChapterReaderFeedbackSnapshot,
} from "@/lib/chapters/reader-feedback-snapshots";
import {
  createChapterRecord,
  deleteChapterRecord,
  DuplicateChapterNumberError,
  findChapterForUpdate,
  updateChapterReaderRemoteIdRecord,
  updateChapterRecord,
} from "@/lib/chapters/records";
import { prisma } from "@/lib/prisma";
import { assertProjectExists as assertProject } from "@/lib/server-actions/project-guards";
import { fetchStationCatReaderFeedback } from "@/lib/reader-feedback";

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

const readerRemoteIdSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(240).nullable(),
  )
  .default(null);

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

export async function createChapter(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const { values, changeReason } = parseChapterForm(formData);
  let createResult: Awaited<ReturnType<typeof createChapterRecord>>;

  try {
    createResult = await createChapterRecord({
      projectId,
      values,
      changeReason,
    });
  } catch (error) {
    if (error instanceof DuplicateChapterNumberError) {
      redirect(
        `/projects/${projectId}/chapters/new?chapterError=duplicate-number`,
      );
    }

    throw error;
  }

  const { chapter, chapterNumber } = createResult;

  await syncOutlineStatusesForChapterNumbers(projectId, [chapterNumber]);

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
    });
  } catch (error) {
    if (error instanceof DuplicateChapterNumberError) {
      redirect(
        `/projects/${projectId}/chapters/${chapterId}/edit?chapterError=duplicate-number`,
      );
    }

    throw error;
  }

  await syncOutlineStatusesForChapterNumbers(projectId, [
    updateResult.previousChapterNumber,
    updateResult.chapterNumber,
  ]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function deleteChapter(projectId: string, chapterId: string) {
  const deleteResult = await deleteChapterRecord({
    projectId,
    chapterId,
  });

  if (!deleteResult) {
    notFound();
  }

  await syncOutlineStatusesForChapterNumbers(projectId, [
    deleteResult.chapterNumber,
  ]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/outlines`);
  revalidatePath(`/projects/${projectId}/storylines`);
  redirect(`/projects/${projectId}/chapters`);
}

export async function updateChapterReaderRemoteId(
  projectId: string,
  chapterId: string,
  formData: FormData,
) {
  const chapter = await findChapterForUpdate({
    projectId,
    chapterId,
  });

  if (!chapter) {
    notFound();
  }

  const readerRemoteId = readerRemoteIdSchema.parse(
    formData.get("readerRemoteId"),
  );
  await updateChapterReaderRemoteIdRecord({
    projectId,
    chapter,
    readerRemoteId,
  });

  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(`/projects/${projectId}/chapters/${chapterId}#reader-feedback`);
}

export async function fetchChapterReaderFeedback(
  projectId: string,
  chapterId: string,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
      readerRemoteId: true,
    },
  });

  if (!chapter) {
    notFound();
  }

  const remoteChapterId =
    chapter.readerRemoteId?.trim() ||
    (await latestStationCatChapterRemoteId(projectId, chapterId));

  if (!remoteChapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?readerFeedbackError=missingRemoteId#reader-feedback`,
    );
  }

  const stationCatSecrets = readStationCatPublishSecrets();

  if (!stationCatSecrets.token) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?readerFeedbackError=missingToken#reader-feedback`,
    );
  }

  try {
    const feedback = await fetchStationCatReaderFeedback({
      apiBaseUrl: stationCatSecrets.apiBaseUrl,
      token: stationCatSecrets.token,
      remoteChapterId,
    });

    await saveChapterReaderFeedbackSnapshot({
      projectId,
      chapterId,
      remoteChapterId,
      feedback,
    });
  } catch (error) {
    const errorMessage = encodeURIComponent(
      error instanceof Error ? error.message : String(error),
    );

    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
    redirect(
      `/projects/${projectId}/chapters/${chapterId}?readerFeedbackError=fetchFailed&readerFeedbackMessage=${errorMessage}#reader-feedback`,
    );
  }

  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  redirect(
    `/projects/${projectId}/chapters/${chapterId}?readerFeedbackSaved=1#reader-feedback`,
  );
}

export async function generateChapterBeats(projectId: string, chapterId: string) {
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

  await prisma.$transaction(async (tx) => {
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

  await prisma.$transaction(async (tx) => {
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

  await prisma.$transaction(async (tx) => {
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
      return;
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
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}
