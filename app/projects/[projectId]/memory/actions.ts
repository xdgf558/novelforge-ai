"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  normalizeForeshadowImportance,
  normalizeForeshadowStatus,
  normalizeRiskLevel,
  normalizeTimelineEventStatus,
  normalizeWorldRuleCategory,
  normalizeWorldRuleStatus,
} from "@/lib/story-memory-fields";
import {
  abandonForeshadowRecord,
  archiveTimelineEventRecord,
  archiveWorldRuleRecord,
  chapterReferencesBelongToProject,
  createForeshadowRecord,
  createTimelineEventRecord,
  createWorldRuleRecord,
  findForeshadowForProject,
  findTimelineEventForProject,
  findWorldRuleForProject,
  updateForeshadowRecord,
  updateTimelineEventRecord,
  updateWorldRuleRecord,
} from "@/lib/memory/records";
import { assertProjectExists as assertProject } from "@/lib/server-actions/project-guards";

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

const requiredTitle = z.string().trim().min(1).max(180);
const requiredBody = z.string().trim().min(1).max(20000);

const optionalInt = z
  .preprocess((value) => {
    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().int().positive().nullable())
  .default(null);

const optionalRelationId = z
  .preprocess((value) => {
    if (typeof value !== "string" || value.trim() === "") {
      return null;
    }

    return value.trim();
  }, z.string().nullable())
  .default(null);

const worldRuleSchema = z.object({
  title: requiredTitle,
  content: requiredBody,
  category: z
    .string()
    .optional()
    .transform((value) => normalizeWorldRuleCategory(value)),
  riskLevel: z
    .string()
    .optional()
    .transform((value) => normalizeRiskLevel(value)),
  status: z
    .string()
    .optional()
    .transform((value) => normalizeWorldRuleStatus(value)),
  scope: optionalText,
  relatedCharacters: optionalText,
  relatedLocations: optionalText,
  relatedOrganizations: optionalText,
  sourceChapterId: optionalRelationId,
  isCore: z.preprocess((value) => value === "on", z.boolean()).default(false),
});

const foreshadowSchema = z.object({
  content: requiredBody,
  status: z
    .string()
    .optional()
    .transform((value) => normalizeForeshadowStatus(value)),
  importance: z
    .string()
    .optional()
    .transform((value) => normalizeForeshadowImportance(value)),
  expectedResolveChapter: optionalInt,
  relatedCharacters: optionalText,
  relatedLocations: optionalText,
  relatedFactions: optionalText,
  plantedChapterId: optionalRelationId,
  resolvedChapterId: optionalRelationId,
  sourceChapterId: optionalRelationId,
});

const timelineEventSchema = z.object({
  title: requiredTitle,
  description: requiredBody,
  storyTime: optionalText,
  relatedCharacters: optionalText,
  location: optionalText,
  impact: optionalText,
  status: z
    .string()
    .optional()
    .transform((value) => normalizeTimelineEventStatus(value)),
  chapterId: optionalRelationId,
  sourceChapterId: optionalRelationId,
});

export async function createWorldRule(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const values = parseWorldRuleForm(formData, projectId);
  await assertChapterIdsBelongToProject(projectId, [values.sourceChapterId]);

  await createWorldRuleRecord({
    projectId,
    values,
  });

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#world-rules`);
}

export async function updateWorldRule(
  projectId: string,
  ruleId: string,
  formData: FormData,
) {
  await assertProject(projectId);

  const values = parseWorldRuleForm(formData, projectId);
  await assertChapterIdsBelongToProject(projectId, [values.sourceChapterId]);
  const rule = await findWorldRuleForProject({
    projectId,
    ruleId,
  });

  if (!rule) {
    redirectMemoryError(projectId, "recordNotFound");
  }

  await updateWorldRuleRecord({
    ruleId,
    values,
  });

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#world-rules`);
}

export async function archiveWorldRule(projectId: string, ruleId: string) {
  await assertProject(projectId);
  await assertWorldRule(projectId, ruleId);

  await archiveWorldRuleRecord(ruleId);

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#world-rules`);
}

export async function createForeshadow(projectId: string, formData: FormData) {
  await assertProject(projectId);

  const values = parseForeshadowForm(formData, projectId);
  await assertChapterIdsBelongToProject(projectId, [
    values.plantedChapterId,
    values.resolvedChapterId,
    values.sourceChapterId,
  ]);

  await createForeshadowRecord({
    projectId,
    values,
  });

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#foreshadows`);
}

export async function updateForeshadow(
  projectId: string,
  foreshadowId: string,
  formData: FormData,
) {
  await assertProject(projectId);

  const values = parseForeshadowForm(formData, projectId);
  await assertChapterIdsBelongToProject(projectId, [
    values.plantedChapterId,
    values.resolvedChapterId,
    values.sourceChapterId,
  ]);
  const foreshadow = await findForeshadowForProject({
    foreshadowId,
    projectId,
  });

  if (!foreshadow) {
    redirectMemoryError(projectId, "recordNotFound");
  }

  await updateForeshadowRecord({
    foreshadowId,
    values,
  });

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#foreshadows`);
}

export async function abandonForeshadow(projectId: string, foreshadowId: string) {
  await assertProject(projectId);
  await assertForeshadow(projectId, foreshadowId);

  await abandonForeshadowRecord(foreshadowId);

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#foreshadows`);
}

export async function createTimelineEvent(
  projectId: string,
  formData: FormData,
) {
  await assertProject(projectId);

  const values = parseTimelineEventForm(formData, projectId);
  await assertChapterIdsBelongToProject(projectId, [
    values.chapterId,
    values.sourceChapterId,
  ]);

  await createTimelineEventRecord({
    projectId,
    values,
  });

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#timeline`);
}

export async function updateTimelineEvent(
  projectId: string,
  eventId: string,
  formData: FormData,
) {
  await assertProject(projectId);

  const values = parseTimelineEventForm(formData, projectId);
  await assertChapterIdsBelongToProject(projectId, [
    values.chapterId,
    values.sourceChapterId,
  ]);
  const event = await findTimelineEventForProject({
    eventId,
    projectId,
  });

  if (!event) {
    redirectMemoryError(projectId, "recordNotFound");
  }

  await updateTimelineEventRecord({
    eventId,
    values,
  });

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#timeline`);
}

export async function archiveTimelineEvent(projectId: string, eventId: string) {
  await assertProject(projectId);
  await assertTimelineEvent(projectId, eventId);

  await archiveTimelineEventRecord(eventId);

  revalidateMemoryPaths(projectId);
  redirect(`/projects/${projectId}/memory#timeline`);
}

function parseWorldRuleForm(formData: FormData, projectId: string) {
  return parseMemoryForm(worldRuleSchema, formData, projectId, {
    title: "missingTitle",
    content: "missingContent",
  });
}

function parseForeshadowForm(formData: FormData, projectId: string) {
  return parseMemoryForm(foreshadowSchema, formData, projectId, {
    content: "missingContent",
    expectedResolveChapter: "invalidExpectedResolveChapter",
  });
}

function parseTimelineEventForm(formData: FormData, projectId: string) {
  return parseMemoryForm(timelineEventSchema, formData, projectId, {
    title: "missingTitle",
    description: "missingContent",
  });
}

function parseMemoryForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
  projectId: string,
  fieldErrorCodes: Record<string, string>,
): z.infer<T> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    if (issue?.code === "too_big") {
      redirectMemoryError(projectId, "bodyTooLong");
    }

    const code =
      typeof field === "string" ? fieldErrorCodes[field] : undefined;

    if (code) {
      redirectMemoryError(projectId, code);
    }

    redirectMemoryError(projectId, "invalidForm");
  }

  return parsed.data;
}

async function assertChapterIdsBelongToProject(
  projectId: string,
  ids: Array<string | null | undefined>,
) {
  const validReferences = await chapterReferencesBelongToProject({
    ids,
    projectId,
  });

  if (!validReferences) {
    redirectMemoryError(projectId, "invalidChapterReference");
  }
}

async function assertWorldRule(projectId: string, ruleId: string) {
  const rule = await findWorldRuleForProject({
    projectId,
    ruleId,
  });

  if (!rule) {
    redirectMemoryError(projectId, "recordNotFound");
  }
}

async function assertForeshadow(projectId: string, foreshadowId: string) {
  const foreshadow = await findForeshadowForProject({
    foreshadowId,
    projectId,
  });

  if (!foreshadow) {
    redirectMemoryError(projectId, "recordNotFound");
  }
}

async function assertTimelineEvent(projectId: string, eventId: string) {
  const event = await findTimelineEventForProject({
    eventId,
    projectId,
  });

  if (!event) {
    redirectMemoryError(projectId, "recordNotFound");
  }
}

function redirectMemoryError(projectId: string, code: string): never {
  redirect(`/projects/${projectId}/memory?memoryError=${code}`);
}

function revalidateMemoryPaths(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/memory`);
  revalidatePath(`/projects/${projectId}/continuity`);
  revalidatePath(`/projects/${projectId}/publish`);
}
