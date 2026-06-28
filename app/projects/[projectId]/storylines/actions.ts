"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  normalizeStorylineStatus,
  normalizeStorylineType,
  storylineStatusOptions,
  storylineTypeOptions,
  type StorylineValidationErrorCode,
} from "@/lib/storyline-fields";
import { prisma } from "@/lib/prisma";

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

type StorylineFormValues = z.infer<typeof storylineSchema>;

type RelationIds = {
  characterIds: string[];
  foreshadowIds: string[];
  chapterIds: string[];
  outlineIds: string[];
};

type ParseStorylineResult =
  | {
      ok: true;
      values: StorylineFormValues;
      relationIds: RelationIds;
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

  const relationError = await validateRelationIds(projectId, parsed.relationIds);

  if (relationError) {
    redirectStorylineError(projectId, relationError);
  }

  await prisma.$transaction(async (tx) => {
    const storyline = await tx.storyline.create({
      data: {
        projectId,
        ...storylineData(parsed.values),
      },
      select: {
        id: true,
      },
    });

    await replaceStorylineRelations(
      tx,
      projectId,
      storyline.id,
      parsed.relationIds,
    );
  });

  revalidateStorylinePaths(projectId);
  redirect(`/projects/${projectId}/storylines?storylineSaved=created`);
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

  const relationError = await validateRelationIds(projectId, parsed.relationIds);

  if (relationError) {
    redirectStorylineError(projectId, relationError, storylineId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.storyline.update({
      where: {
        id: storylineId,
      },
      data: storylineData(parsed.values),
    });

    await replaceStorylineRelations(
      tx,
      projectId,
      storylineId,
      parsed.relationIds,
    );
  });

  revalidateStorylinePaths(projectId);
  redirect(`/projects/${projectId}/storylines?storylineSaved=updated`);
}

export async function archiveStoryline(projectId: string, storylineId: string) {
  await assertStoryline(projectId, storylineId);

  await prisma.storyline.update({
    where: {
      id: storylineId,
    },
    data: {
      status: "archived",
    },
  });

  revalidateStorylinePaths(projectId);
  redirect(`/projects/${projectId}/storylines?storylineSaved=archived`);
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

function storylineData(values: StorylineFormValues) {
  return {
    name: values.name,
    type: normalizeStorylineType(values.type),
    status: normalizeStorylineStatus(values.status),
    startChapter: values.startChapter,
    endChapter: values.endChapter,
    coreGoal: values.coreGoal,
    currentProgress: values.currentProgress,
    notes: values.notes,
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

async function assertStoryline(projectId: string, storylineId: string) {
  const storyline = await prisma.storyline.findFirst({
    where: {
      id: storylineId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!storyline) {
    notFound();
  }
}

async function validateRelationIds(
  projectId: string,
  relationIds: RelationIds,
): Promise<StorylineValidationErrorCode | null> {
  const [
    characterCount,
    foreshadowCount,
    chapterCount,
    outlineCount,
  ] = await Promise.all([
    countProjectRecords("character", projectId, relationIds.characterIds),
    countProjectRecords("foreshadow", projectId, relationIds.foreshadowIds),
    countProjectRecords("chapter", projectId, relationIds.chapterIds),
    countProjectRecords("outline", projectId, relationIds.outlineIds),
  ]);

  if (
    characterCount !== relationIds.characterIds.length ||
    foreshadowCount !== relationIds.foreshadowIds.length ||
    chapterCount !== relationIds.chapterIds.length ||
    outlineCount !== relationIds.outlineIds.length
  ) {
    return "invalidRelation";
  }

  return null;
}

async function countProjectRecords(
  kind: "character" | "foreshadow" | "chapter" | "outline",
  projectId: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return 0;
  }

  const where = {
    projectId,
    id: {
      in: ids,
    },
  };

  switch (kind) {
    case "character":
      return prisma.character.count({ where });
    case "foreshadow":
      return prisma.foreshadow.count({ where });
    case "chapter":
      return prisma.chapter.count({ where });
    case "outline":
      return prisma.outline.count({ where });
  }
}

async function replaceStorylineRelations(
  tx: Prisma.TransactionClient,
  projectId: string,
  storylineId: string,
  relationIds: RelationIds,
) {
  await Promise.all([
    tx.storylineCharacter.deleteMany({
      where: {
        storylineId,
      },
    }),
    tx.storylineForeshadow.deleteMany({
      where: {
        storylineId,
      },
    }),
    tx.storylineChapter.deleteMany({
      where: {
        storylineId,
      },
    }),
    tx.storylineOutline.deleteMany({
      where: {
        storylineId,
      },
    }),
  ]);

  await Promise.all([
    relationIds.characterIds.length > 0
      ? tx.storylineCharacter.createMany({
          data: relationIds.characterIds.map((characterId) => ({
            projectId,
            storylineId,
            characterId,
          })),
        })
      : null,
    relationIds.foreshadowIds.length > 0
      ? tx.storylineForeshadow.createMany({
          data: relationIds.foreshadowIds.map((foreshadowId) => ({
            projectId,
            storylineId,
            foreshadowId,
          })),
        })
      : null,
    relationIds.chapterIds.length > 0
      ? tx.storylineChapter.createMany({
          data: relationIds.chapterIds.map((chapterId) => ({
            projectId,
            storylineId,
            chapterId,
          })),
        })
      : null,
    relationIds.outlineIds.length > 0
      ? tx.storylineOutline.createMany({
          data: relationIds.outlineIds.map((outlineId) => ({
            projectId,
            storylineId,
            outlineId,
          })),
        })
      : null,
  ]);
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
