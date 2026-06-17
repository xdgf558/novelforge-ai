"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  chapterFieldNames,
  chapterSnapshot,
  chapterStatusOptions,
  type ChapterValues,
} from "@/lib/chapter-fields";
import { prisma } from "@/lib/prisma";

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
  finalText: optionalChapterText,
  notes: optionalChapterText,
});

const changeReasonSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(1000).optional(),
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

  const changeReason = changeReasonSchema.parse(formData.get("changeReason"));

  return {
    values,
    changeReason,
  };
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

export async function createChapter(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const { values, changeReason } = parseChapterForm(formData);
  const snapshot = chapterSnapshot(values);

  const chapter = await prisma.$transaction(async (tx) => {
    const createdChapter = await tx.chapter.create({
      data: {
        projectId,
        ...snapshot,
      },
    });

    await tx.chapterVersion.create({
      data: {
        projectId,
        chapterId: createdChapter.id,
        versionNumber: 1,
        snapshotJson: JSON.stringify(snapshot),
        changeReason,
        sourceType: "manual",
      },
    });

    return createdChapter;
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  redirect(`/projects/${projectId}/chapters/${chapter.id}`);
}

export async function updateChapter(
  projectId: string,
  chapterId: string,
  formData: FormData,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!chapter) {
    notFound();
  }

  const { values, changeReason } = parseChapterForm(formData);
  const snapshot = chapterSnapshot(values);

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
        changeReason,
        sourceType: "manual",
      },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  revalidatePath(`/projects/${projectId}/chapters/${chapterId}/history`);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function deleteChapter(projectId: string, chapterId: string) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!chapter) {
    notFound();
  }

  await prisma.chapter.delete({
    where: {
      id: chapterId,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/chapters`);
  redirect(`/projects/${projectId}/chapters`);
}
