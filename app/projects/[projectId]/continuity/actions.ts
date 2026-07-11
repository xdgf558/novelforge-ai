"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { buildContinuityContext } from "@/lib/ai/continuity-reports";
import {
  buildContinuityFixPatchContext,
  continuityFixPatchTemplateKey,
} from "@/lib/ai/continuity-fix-patches";
import { expireStaleContinuityFixPatchTasks } from "@/lib/ai/continuity-fix-patch-task-maintenance";
import { hasConfirmedChapterText } from "@/lib/ai/chapter-summaries";
import { ensureDefaultPromptTemplate } from "@/lib/ai/prompt-template-store";
import { startLoggedOpenAITextTask } from "@/lib/ai/task-logger";
import { shortStoryWholeReviewTaskType } from "@/lib/ai/short-story-whole-review";
import {
  chapterFinalTextHash,
  chapterSourceMatches,
} from "@/lib/chapters/source-text";
import {
  applyContinuityReportReplacementFix,
  createContinuityReportsFromTask,
  findActiveContinuityFixPatchTask,
  findActiveContinuityTask,
  findContinuityReportSummary,
  loadContinuityContext,
  loadContinuityFixPatchReport,
  reopenContinuityReportRecord,
  resolveContinuityReportRecord,
  updateContinuityFixPatchTaskAdoptionState,
} from "@/lib/continuity/records";

const continuityTemplateKey = "continuity_check";

const resolutionSchema = z.object({
  resolutionNote: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().max(1000).optional(),
    ),
});

export async function generateContinuityReport(
  projectId: string,
  chapterId: string,
) {
  const activeTask = await findActiveContinuityTask(projectId, chapterId);

  if (activeTask) {
    revalidateContinuityPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const contextInput = await loadContinuityContext(projectId, chapterId);

  if (!contextInput) {
    notFound();
  }

  if (!hasConfirmedChapterText(contextInput.chapter)) {
    revalidateContinuityPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const sourceTextHash = chapterFinalTextHash(contextInput.chapter.finalText);

  if (!sourceTextHash) {
    revalidateContinuityPaths(projectId, chapterId);
    redirect(`/projects/${projectId}/chapters/${chapterId}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    continuityTemplateKey,
  );
  const context = buildContinuityContext(contextInput);

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: {
        ...context.inputJson,
        finalTextHash: sourceTextHash,
      },
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
        await createContinuityReportsFromTask({
          chapterId,
          outputText: task.outputText,
          projectId,
          sourceTextHash,
          taskId: task.id,
        });
      },
    },
  );

  revalidateContinuityPaths(projectId, chapterId);
  redirect(`/projects/${projectId}/chapters/${chapterId}`);
}

export async function resolveContinuityReport(
  projectId: string,
  reportId: string,
  formData: FormData,
) {
  const { resolutionNote } = resolutionSchema.parse({
    resolutionNote: formData.get("resolutionNote"),
  });

  const report = await findContinuityReportSummary({
    projectId,
    reportId,
  });

  if (!report) {
    notFound();
  }

  await resolveContinuityReportRecord({
    reportId: report.id,
    resolutionNote,
  });

  revalidateContinuityPaths(projectId, report.chapterId);
  redirect(`/projects/${projectId}/continuity`);
}

export async function reopenContinuityReport(projectId: string, reportId: string) {
  const report = await findContinuityReportSummary({
    projectId,
    reportId,
  });

  if (!report) {
    notFound();
  }

  await reopenContinuityReportRecord(report.id);

  revalidateContinuityPaths(projectId, report.chapterId);
  redirect(`/projects/${projectId}/continuity`);
}

export async function applyContinuityReportFix(
  projectId: string,
  reportId: string,
) {
  const result = await applyContinuityReportReplacementFix({
    projectId,
    reportId,
  });

  if (result.status === "missing-report") {
    notFound();
  }

  if (result.status === "already-resolved") {
    redirect(`/projects/${projectId}/continuity?fix=already-resolved`);
  }

  if (result.status === "missing-chapter") {
    redirect(`/projects/${projectId}/continuity?fix=missing-chapter`);
  }

  if (result.status === "unsupported") {
    redirect(`/projects/${projectId}/continuity?fix=unsupported`);
  }

  if (result.status === "not-found") {
    redirect(`/projects/${projectId}/continuity?fix=not-found`);
  }

  if (result.status === "stale-report") {
    redirect(`/projects/${projectId}/continuity?fix=stale-report`);
  }

  revalidateContinuityPaths(projectId, result.chapterId);
  revalidatePath(`/projects/${projectId}/chapters/${result.chapterId}/history`);
  redirect(`/projects/${projectId}/continuity?fix=applied`);
}

export async function generateContinuityFixPatch(
  projectId: string,
  reportId: string,
) {
  await expireStaleContinuityFixPatchTasks(projectId);

  const report = await loadContinuityFixPatchReport({
    projectId,
    reportId,
  });

  if (!report) {
    notFound();
  }

  if (report.status !== "open") {
    redirect(`/projects/${projectId}/continuity?patch=already-resolved`);
  }

  if (report.aiTask?.taskType === shortStoryWholeReviewTaskType) {
    redirect(
      `/projects/${projectId}/continuity?patch=manual-only#report-${report.id}`,
    );
  }

  if (!report.chapter) {
    redirect(`/projects/${projectId}/continuity?patch=missing-chapter`);
  }

  if (
    report.sourceTextHash &&
    !chapterSourceMatches(report.sourceTextHash, report.chapter.finalText)
  ) {
    redirect(
      `/projects/${projectId}/continuity?patch=stale-report#report-${report.id}`,
    );
  }

  const activeTask = await findActiveContinuityFixPatchTask(
    projectId,
    report.id,
  );

  if (activeTask) {
    revalidateContinuityPaths(projectId, report.chapter.id);
    redirect(`/projects/${projectId}/continuity?patch=active#report-${report.id}`);
  }

  let context: ReturnType<typeof buildContinuityFixPatchContext>;

  try {
    context = buildContinuityFixPatchContext({
      project: report.project,
      report: {
        id: report.id,
        severity: report.severity,
        category: report.category,
        title: report.title,
        description: report.description,
        evidence: report.evidence,
        conflictingMemory: report.conflictingMemory,
        suggestedFix: report.suggestedFix,
      },
      chapter: report.chapter,
    });
  } catch {
    redirect(`/projects/${projectId}/continuity?patch=missing-text#report-${report.id}`);
  }

  const template = await ensureDefaultPromptTemplate(
    projectId,
    continuityFixPatchTemplateKey,
  );

  await startLoggedOpenAITextTask(
    {
      projectId,
      chapterId: report.chapter.id,
      promptTemplateId: template.id,
      taskType: template.taskType,
      model: undefined,
      inputContextSummary: context.inputContextSummary,
      inputJson: context.inputJson,
    },
    {
      systemPrompt: template.systemPrompt,
      developerPrompt: [template.userPrompt, template.contextNotes]
        .filter(Boolean)
        .join("\n\n"),
      input: context.inputText,
    },
  );

  revalidateContinuityPaths(projectId, report.chapter.id);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(`/projects/${projectId}/continuity?patch=started#report-${report.id}`);
}

export async function markContinuityFixPatchOrganized(
  projectId: string,
  taskId: string,
) {
  await updateContinuityFixPatchTaskAdoptionStateAndRedirect(
    projectId,
    taskId,
    "adopted",
    "organized",
  );
}

export async function ignoreContinuityFixPatch(
  projectId: string,
  taskId: string,
) {
  await updateContinuityFixPatchTaskAdoptionStateAndRedirect(
    projectId,
    taskId,
    "rejected",
    "ignored",
  );
}

async function updateContinuityFixPatchTaskAdoptionStateAndRedirect(
  projectId: string,
  taskId: string,
  adoptionState: "adopted" | "rejected",
  resultCode: "organized" | "ignored",
) {
  const result = await updateContinuityFixPatchTaskAdoptionState({
    adoptionState,
    projectId,
    taskId,
  });

  if (result.status === "missing-task") {
    notFound();
  }

  if (result.status === "already-reviewed") {
    revalidateContinuityPaths(projectId, result.chapterId);
    revalidatePath(`/projects/${projectId}/ai`);
    redirect(
      `/projects/${projectId}/continuity?patch=already-reviewed${
        result.reportId ? `#report-${result.reportId}` : ""
      }`,
    );
  }

  revalidateContinuityPaths(projectId, result.chapterId);
  revalidatePath(`/projects/${projectId}/ai`);
  redirect(
    `/projects/${projectId}/continuity?patch=${resultCode}${
      result.reportId ? `#report-${result.reportId}` : ""
    }`,
  );
}

function revalidateContinuityPaths(projectId: string, chapterId?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/ai`);
  revalidatePath(`/projects/${projectId}/continuity`);

  if (chapterId) {
    revalidatePath(`/projects/${projectId}/chapters/${chapterId}`);
  }
}
