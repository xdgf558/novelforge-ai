"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteProjectAudioAssets } from "@/lib/audio/audio-assets";
import { prisma } from "@/lib/prisma";
import { deleteProjectCoverAssets } from "@/lib/project-cover-assets";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
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

const projectSchema = z.object({
  title: z.string().trim().min(1, "请输入小说标题").max(120),
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

function parseProjectForm(formData: FormData) {
  return projectSchema.parse({
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
  });
}

export async function createProject(formData: FormData) {
  const data = parseProjectForm(formData);

  const project = await prisma.project.create({
    data,
  });

  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(projectId: string, formData: FormData) {
  const data = parseProjectForm(formData);

  await prisma.project.update({
    where: {
      id: projectId,
    },
    data,
  });

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
