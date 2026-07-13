"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  moveSeriesEntryOrder,
  nextSeriesSortOrder,
  shortStorySeriesCharacterStatusOptions,
  shortStorySeriesStatusOptions,
} from "@/lib/short-story-series/fields";

const optionalSeriesText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(12000).nullable(),
);

const seriesSchema = z.object({
  title: z.string().trim().min(1, "请输入系列名称").max(120),
  status: z.enum(
    shortStorySeriesStatusOptions.map((option) => option.value) as [
      "active",
      "completed",
      "archived",
    ],
  ),
  premise: optionalSeriesText,
  sharedWorldview: optionalSeriesText,
  continuityRules: optionalSeriesText,
  recurringElements: optionalSeriesText,
  longTermMysteries: optionalSeriesText,
  futureDirection: optionalSeriesText,
});

const characterSchema = z.object({
  name: z.string().trim().min(1, "请输入人物姓名").max(120),
  status: z.enum(
    shortStorySeriesCharacterStatusOptions.map((option) => option.value) as [
      "active",
      "retired",
    ],
  ),
  roleInSeries: optionalSeriesText,
  identity: optionalSeriesText,
  accumulatedState: optionalSeriesText,
  relationshipState: optionalSeriesText,
  knownInformation: optionalSeriesText,
  recurringRules: optionalSeriesText,
  notes: optionalSeriesText,
});

const membershipSchema = z.object({
  projectId: z.string().trim().min(1),
});

const continuityNoteSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(6000).nullable(),
);

function parseSeriesForm(formData: FormData) {
  return seriesSchema.parse({
    title: formData.get("title"),
    status: formData.get("status") || "active",
    premise: formData.get("premise"),
    sharedWorldview: formData.get("sharedWorldview"),
    continuityRules: formData.get("continuityRules"),
    recurringElements: formData.get("recurringElements"),
    longTermMysteries: formData.get("longTermMysteries"),
    futureDirection: formData.get("futureDirection"),
  });
}

function parseCharacterForm(formData: FormData) {
  return characterSchema.parse({
    name: formData.get("name"),
    status: formData.get("status") || "active",
    roleInSeries: formData.get("roleInSeries"),
    identity: formData.get("identity"),
    accumulatedState: formData.get("accumulatedState"),
    relationshipState: formData.get("relationshipState"),
    knownInformation: formData.get("knownInformation"),
    recurringRules: formData.get("recurringRules"),
    notes: formData.get("notes"),
  });
}

export async function createShortStorySeries(formData: FormData) {
  const series = await prisma.shortStorySeries.create({
    data: parseSeriesForm(formData),
  });

  revalidatePath("/series");
  redirect(`/series/${series.id}`);
}

export async function updateShortStorySeries(
  seriesId: string,
  formData: FormData,
) {
  await assertSeries(seriesId);
  await prisma.shortStorySeries.update({
    where: {
      id: seriesId,
    },
    data: parseSeriesForm(formData),
  });

  revalidateSeriesPaths(seriesId);
  redirect(`/series/${seriesId}`);
}

export async function deleteShortStorySeries(
  seriesId: string,
  formData: FormData,
) {
  await assertSeries(seriesId);
  const confirmation = formData.get("deleteConfirmation")?.toString().trim();

  if (confirmation !== "DELETE") {
    revalidateSeriesPaths(seriesId);
    redirect(`/series/${seriesId}/edit?seriesError=delete-confirmation`);
  }

  await prisma.shortStorySeries.delete({
    where: {
      id: seriesId,
    },
  });

  revalidatePath("/");
  revalidatePath("/series");
  redirect("/series");
}

export async function addProjectToShortStorySeries(
  seriesId: string,
  formData: FormData,
) {
  await assertSeries(seriesId);
  const { projectId } = membershipSchema.parse({
    projectId: formData.get("projectId"),
  });
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      workType: true,
      shortStorySeriesEntry: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!project || project.workType !== "short_story") {
    revalidateSeriesPaths(seriesId);
    redirect(`/series/${seriesId}?seriesError=invalid-project`);
  }

  if (project.shortStorySeriesEntry) {
    revalidateSeriesPaths(seriesId);
    redirect(`/series/${seriesId}?seriesError=already-assigned`);
  }

  const existingEntries = await prisma.shortStorySeriesEntry.findMany({
    where: {
      seriesId,
    },
    select: {
      sortOrder: true,
    },
  });

  try {
    await prisma.shortStorySeriesEntry.create({
      data: {
        seriesId,
        projectId,
        sortOrder: nextSeriesSortOrder(existingEntries),
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    revalidateSeriesPaths(seriesId);
    redirect(`/series/${seriesId}?seriesError=already-assigned`);
  }
  await touchSeries(seriesId);

  revalidateProjectSeriesPaths(seriesId, projectId);
  redirect(`/series/${seriesId}`);
}

export async function updateShortStorySeriesEntry(
  seriesId: string,
  entryId: string,
  formData: FormData,
) {
  const entry = await findSeriesEntry(seriesId, entryId);
  const continuityNote = continuityNoteSchema.parse(
    formData.get("continuityNote"),
  );

  await prisma.shortStorySeriesEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      continuityNote,
    },
  });
  await touchSeries(seriesId);

  revalidateProjectSeriesPaths(seriesId, entry.projectId);
  redirect(`/series/${seriesId}`);
}

export async function moveShortStorySeriesEntry(
  seriesId: string,
  entryId: string,
  direction: "up" | "down",
) {
  await findSeriesEntry(seriesId, entryId);
  const entries = await prisma.shortStorySeriesEntry.findMany({
    where: {
      seriesId,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      sortOrder: true,
    },
  });
  const order = moveSeriesEntryOrder(entries, entryId, direction);

  await prisma.$transaction(
    order.map((entry) =>
      prisma.shortStorySeriesEntry.update({
        where: {
          id: entry.id,
        },
        data: {
          sortOrder: entry.sortOrder,
        },
      }),
    ),
  );
  await touchSeries(seriesId);

  revalidateSeriesPaths(seriesId);
}

export async function removeProjectFromShortStorySeries(
  seriesId: string,
  entryId: string,
) {
  const entry = await findSeriesEntry(seriesId, entryId);
  await prisma.shortStorySeriesEntry.delete({
    where: {
      id: entry.id,
    },
  });
  await touchSeries(seriesId);

  revalidateProjectSeriesPaths(seriesId, entry.projectId);
  redirect(`/series/${seriesId}`);
}

export async function createShortStorySeriesCharacter(
  seriesId: string,
  formData: FormData,
) {
  await assertSeries(seriesId);
  const data = parseCharacterForm(formData);
  const duplicate = await prisma.shortStorySeriesCharacter.findFirst({
    where: {
      seriesId,
      name: data.name,
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    revalidateSeriesPaths(seriesId);
    redirect(`/series/${seriesId}?seriesError=duplicate-character`);
  }

  const existingCharacters = await prisma.shortStorySeriesCharacter.findMany({
    where: {
      seriesId,
    },
    select: {
      sortOrder: true,
    },
  });

  try {
    await prisma.shortStorySeriesCharacter.create({
      data: {
        seriesId,
        ...data,
        sortOrder: nextSeriesSortOrder(existingCharacters),
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    revalidateSeriesPaths(seriesId);
    redirect(`/series/${seriesId}?seriesError=duplicate-character`);
  }
  await touchSeries(seriesId);

  revalidateSeriesPaths(seriesId);
  redirect(`/series/${seriesId}#series-characters`);
}

export async function updateShortStorySeriesCharacter(
  seriesId: string,
  characterId: string,
  formData: FormData,
) {
  await findSeriesCharacter(seriesId, characterId);
  const data = parseCharacterForm(formData);
  const duplicate = await prisma.shortStorySeriesCharacter.findFirst({
    where: {
      seriesId,
      name: data.name,
      id: {
        not: characterId,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    revalidateSeriesPaths(seriesId);
    redirect(
      `/series/${seriesId}/characters/${characterId}/edit?seriesError=duplicate-character`,
    );
  }

  try {
    await prisma.shortStorySeriesCharacter.update({
      where: {
        id: characterId,
      },
      data,
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    revalidateSeriesPaths(seriesId);
    redirect(
      `/series/${seriesId}/characters/${characterId}/edit?seriesError=duplicate-character`,
    );
  }
  await touchSeries(seriesId);

  revalidateSeriesPaths(seriesId);
  redirect(`/series/${seriesId}#series-characters`);
}

export async function setShortStorySeriesCharacterStatus(
  seriesId: string,
  characterId: string,
  status: "active" | "retired",
) {
  await findSeriesCharacter(seriesId, characterId);
  await prisma.shortStorySeriesCharacter.update({
    where: {
      id: characterId,
    },
    data: {
      status,
    },
  });
  await touchSeries(seriesId);

  revalidateSeriesPaths(seriesId);
}

async function assertSeries(seriesId: string) {
  const series = await prisma.shortStorySeries.findUnique({
    where: {
      id: seriesId,
    },
    select: {
      id: true,
    },
  });

  if (!series) {
    notFound();
  }

  return series;
}

async function findSeriesEntry(seriesId: string, entryId: string) {
  const entry = await prisma.shortStorySeriesEntry.findFirst({
    where: {
      id: entryId,
      seriesId,
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!entry) {
    notFound();
  }

  return entry;
}

async function findSeriesCharacter(seriesId: string, characterId: string) {
  const character = await prisma.shortStorySeriesCharacter.findFirst({
    where: {
      id: characterId,
      seriesId,
    },
    select: {
      id: true,
    },
  });

  if (!character) {
    notFound();
  }

  return character;
}

async function touchSeries(seriesId: string) {
  await prisma.shortStorySeries.update({
    where: {
      id: seriesId,
    },
    data: {
      updatedAt: new Date(),
    },
  });
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function revalidateSeriesPaths(seriesId: string) {
  revalidatePath("/series");
  revalidatePath(`/series/${seriesId}`);
  revalidatePath(`/series/${seriesId}/edit`);
}

function revalidateProjectSeriesPaths(seriesId: string, projectId: string) {
  revalidatePath("/");
  revalidateSeriesPaths(seriesId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
}
