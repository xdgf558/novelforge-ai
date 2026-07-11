"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  buildShortStoryWholeReviewContext,
  shortStoryWholeReviewMinimumUnits,
  shortStoryWholeReviewTemplateKey,
} from "@/lib/ai/short-story-whole-review";
import { expireStaleShortStoryWholeReviewTasks } from "@/lib/ai/short-story-whole-review-task-maintenance";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import {
  reopenContinuityReportRecord,
  resolveContinuityReportRecord,
} from "@/lib/continuity/records";
import { hasShortStoryBlueprintContent } from "@/lib/short-stories/blueprint-fields";
import {
  createShortStoryWholeReviewReportsFromTask,
  findActiveShortStoryWholeReviewTask,
  findShortStoryWholeReviewReport,
  loadShortStoryWholeReviewContext,
} from "@/lib/short-stories/whole-review-records";
import { assertShortStoryProject } from "@/lib/server-actions/project-guards";

const resolutionSchema = z.object({
  resolutionNote: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().max(1000).optional(),
    ),
});

export async function generateShortStoryWholeReview(projectId: string) {
  await assertShortStoryProject(projectId);
  await expireStaleShortStoryWholeReviewTasks(projectId);

  const activeTask = await findActiveShortStoryWholeReviewTask(projectId);

  if (activeTask) {
    revalidateWholeReviewPaths(projectId);
    redirect(`/projects/${projectId}/story-review?review=active`);
  }

  const input = await loadShortStoryWholeReviewContext(projectId);

  if (!input) {
    notFound();
  }

  if (!hasShortStoryBlueprintContent(input.blueprint)) {
    redirect(`/projects/${projectId}/story-review?review=missing-blueprint`);
  }

  if (input.units.length < shortStoryWholeReviewMinimumUnits) {
    redirect(`/projects/${projectId}/story-review?review=insufficient-units`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    shortStoryWholeReviewTemplateKey,
  );
  const context = buildShortStoryWholeReviewContext(input);

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
    {
      onCompleted: async (task) => {
        await createShortStoryWholeReviewReportsFromTask({
          outputText: task.outputText,
          projectId,
          taskId: task.id,
          units: input.units,
        });
      },
    },
  );

  revalidateWholeReviewPaths(projectId);
  redirect(`/projects/${projectId}/story-review?review=started`);
}

export async function resolveShortStoryWholeReviewReport(
  projectId: string,
  reportId: string,
  formData: FormData,
) {
  await assertShortStoryProject(projectId);
  const { resolutionNote } = resolutionSchema.parse({
    resolutionNote: formData.get("resolutionNote"),
  });
  const report = await findShortStoryWholeReviewReport({ projectId, reportId });

  if (!report) {
    notFound();
  }

  await resolveContinuityReportRecord({
    reportId: report.id,
    resolutionNote,
  });
  revalidateWholeReviewPaths(projectId, report.chapterId);
  redirect(`/projects/${projectId}/story-review#suggestion-${report.id}`);
}

export async function reopenShortStoryWholeReviewReport(
  projectId: string,
  reportId: string,
) {
  await assertShortStoryProject(projectId);
  const report = await findShortStoryWholeReviewReport({ projectId, reportId });

  if (!report) {
    notFound();
  }

  await reopenContinuityReportRecord(report.id);
  revalidateWholeReviewPaths(projectId, report.chapterId);
  redirect(`/projects/${projectId}/story-review#suggestion-${report.id}`);
}

function revalidateWholeReviewPaths(projectId: string, chapterId?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/continuity`);
  revalidatePath(`/projects/${projectId}/story-review`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  }
}
