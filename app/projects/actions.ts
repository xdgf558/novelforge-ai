"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { deleteProjectAudioAssets } from "@/lib/audio/audio-assets";
import { prisma } from "@/lib/prisma";
import { deleteProjectCoverAssets } from "@/lib/project-cover-assets";
import { calculateProjectCompletionReadiness } from "@/lib/projects/completion";
import {
  acquireActiveProjectContentWriteLease,
  ProjectContentWriteBlockedError,
} from "@/lib/projects/content-write-guard";
import {
  defaultProjectWorkType,
  projectWorkTypeValues,
} from "@/lib/projects/work-types";

const optionalText = z.preprocess(
  (value) =>
    value == null || (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  z.string().trim().max(2000).optional(),
);

const optionalInteger = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().positive().optional());

const nullableInteger = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().positive().nullable());

const projectDetailsSchema = z.object({
  title: z.string().trim().min(1, "请输入作品标题").max(120),
  genre: optionalText,
  targetAudience: optionalText,
  platform: optionalText,
  totalWordTarget: optionalInteger,
  chapterWordMin: optionalInteger,
  chapterWordMax: optionalInteger,
  aiDailyTokenBudget: nullableInteger,
  updateFrequency: optionalText,
  description: optionalText,
  wechatPositioning: optionalText,
});

const createProjectSchema = projectDetailsSchema.extend({
  workType: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim()
        ? value.trim()
        : defaultProjectWorkType,
    z.enum(projectWorkTypeValues),
  ),
});

function projectDetailsFormValues(formData: FormData) {
  return {
    title: formData.get("title"),
    genre: formData.get("genre"),
    targetAudience: formData.get("targetAudience"),
    platform: formData.get("platform"),
    totalWordTarget: formData.get("totalWordTarget"),
    chapterWordMin: formData.get("chapterWordMin"),
    chapterWordMax: formData.get("chapterWordMax"),
    aiDailyTokenBudget: formData.get("aiDailyTokenBudget"),
    updateFrequency: formData.get("updateFrequency"),
    description: formData.get("description"),
    wechatPositioning: formData.get("wechatPositioning"),
  };
}

function parseCreateProjectForm(formData: FormData) {
  return createProjectSchema.parse({
    ...projectDetailsFormValues(formData),
    workType: formData.get("workType"),
  });
}

function parseProjectUpdateForm(formData: FormData) {
  return projectDetailsSchema.parse(projectDetailsFormValues(formData));
}

export async function createProject(formData: FormData) {
  const data = parseCreateProjectForm(formData);

  const project = await prisma.project.create({
    data,
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const data = parseProjectUpdateForm(formData);
  const existingProject = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      totalWordTarget: true,
    },
  });

  if (!existingProject) {
    notFound();
  }

  const changesTotalWordTarget =
    data.totalWordTarget !== undefined &&
    data.totalWordTarget !== existingProject.totalWordTarget;

  if (changesTotalWordTarget) {
    const updateResult = await prisma.project.updateMany({
      where: {
        id: projectId,
        status: "active",
      },
      data,
    });

    if (updateResult.count !== 1) {
      revalidatePath(`/projects/${projectId}/edit`);
      redirect(`/projects/${projectId}/edit?projectError=restore-required`);
    }
  } else {
    await prisma.project.update({
      where: {
        id: projectId,
      },
      data,
    });
  }

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function archiveProject(projectId: string) {
  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      status: "archived",
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  redirect(`/projects/${projectId}`);
}

export async function completeAndArchiveProject(projectId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        status: true,
        totalWordTarget: true,
        updatedAt: true,
        workType: true,
        chapters: {
          select: {
            finalText: true,
            status: true,
            wordCount: true,
          },
        },
      },
    });

    if (!project) {
      return "missing" as const;
    }

    if (project.workType !== "serial_novel") {
      return "unsupported" as const;
    }

    if (project.status !== "active") {
      return "already-finished" as const;
    }

    const readiness = calculateProjectCompletionReadiness({
      chapters: project.chapters,
      totalWordTarget: project.totalWordTarget,
    });

    if (!readiness.canCompleteAndArchive) {
      return "not-ready" as const;
    }

    let completionLeaseUpdatedAt: Date;

    try {
      completionLeaseUpdatedAt = await acquireActiveProjectContentWriteLease(
        tx,
        projectId,
        project.updatedAt,
      );
    } catch (error) {
      if (error instanceof ProjectContentWriteBlockedError) {
        return "changed" as const;
      }

      throw error;
    }

    const updateResult = await tx.project.updateMany({
      where: {
        id: projectId,
        status: "active",
        updatedAt: completionLeaseUpdatedAt,
        workType: "serial_novel",
      },
      data: {
        status: "completed",
      },
    });

    return updateResult.count === 1 ? ("completed" as const) : ("changed" as const);
  });

  if (result === "missing") {
    notFound();
  }

  if (result === "unsupported") {
    redirect(`/projects/${projectId}?completion=unsupported`);
  }

  if (result === "already-finished") {
    redirect(`/projects/${projectId}?completion=already-finished`);
  }

  if (result === "not-ready" || result === "changed") {
    redirect(`/projects/${projectId}?completion=not-ready`);
  }

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  redirect("/?projectStatus=archived&projectCompleted=1");
}

export async function restoreProject(projectId: string) {
  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      status: "active",
    },
  });

  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string, formData?: FormData) {
  const confirmation = formData?.get("deleteConfirmation")?.toString().trim();
  const backupAcknowledged = formData?.get("backupAcknowledged") === "on";

  if (confirmation !== "DELETE" || !backupAcknowledged) {
    revalidatePath(`/projects/${projectId}/edit`);
    redirect(`/projects/${projectId}/edit?projectError=delete-confirmation`);
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  const cleanupResults = await Promise.allSettled([
    deleteProjectCoverAssets(projectId),
    deleteProjectAudioAssets(projectId),
  ]);

  for (const result of cleanupResults) {
    if (result.status === "rejected") {
      console.error("Failed to remove deleted project assets:", result.reason);
    }
  }

  revalidatePath("/");
  redirect("/");
}
