import { notFound, redirect } from "next/navigation";
import { createChapter } from "@/app/projects/[projectId]/chapters/actions";
import { generateShortStoryUnitPlanDraft } from "@/app/projects/[projectId]/chapters/unit-plan-actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { ChapterForm } from "@/components/chapters/chapter-form";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { expireStaleShortStoryUnitPlanTasks } from "@/lib/ai/short-story-unit-plan-task-maintenance";
import {
  isReviewableShortStoryUnitPlanDraft,
  isUsableShortStoryBlueprint,
  parseShortStoryUnitPlanGenerationOutput,
  shortStoryUnitPlanTaskTargetNumber,
  shortStoryUnitPlanTaskType,
} from "@/lib/ai/short-story-unit-plans";
import { isActiveAiTaskStatus } from "@/lib/ai/status";
import {
  buildChapterOutlinePrefill,
  selectChapterOutlineForPrefill,
} from "@/lib/chapter-outline-prefill";
import { prisma } from "@/lib/prisma";
import { isShortStoryProject } from "@/lib/projects/work-types";
import { recommendShortStoryWritingUnits } from "@/lib/short-stories/writing-units";

export const dynamic = "force-dynamic";

type NewChapterPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    chapterError?: string;
    unitPlanError?: string;
    unitPlanTarget?: string;
  }>;
};

export default async function NewChapterPage({
  params,
  searchParams,
}: NewChapterPageProps) {
  const { projectId } = await params;
  const { chapterError, unitPlanError, unitPlanTarget } =
    (await searchParams) ?? {};
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      shortStoryBlueprint: true,
    },
  });

  if (!project) {
    notFound();
  }

  if (project.status !== "active") {
    redirect(`/projects/${projectId}/edit?projectError=restore-required`);
  }

  const shortStoryProject = isShortStoryProject(project.workType);
  if (shortStoryProject) {
    await expireStaleShortStoryUnitPlanTasks(projectId);
  }

  const unitRecommendation = recommendShortStoryWritingUnits({
    totalWordTarget: project.totalWordTarget,
    unitWordMin: project.chapterWordMin,
    unitWordMax: project.chapterWordMax,
  });

  const [chapterNumberAggregate, unitPlanTasks] = await Promise.all([
    prisma.chapter.aggregate({
      where: {
        projectId,
      },
      _max: {
        chapterNumber: true,
      },
    }),
    shortStoryProject
      ? prisma.aiTask.findMany({
          where: {
            projectId,
            taskType: shortStoryUnitPlanTaskType,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            status: true,
            adoptionState: true,
            inputJson: true,
            outputText: true,
            errorMessage: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const nextChapterNumber =
    (chapterNumberAggregate._max.chapterNumber ?? 0) + 1;
  const requestedUnitPlanTarget = positiveInteger(unitPlanTarget);
  const targetChapterNumber =
    shortStoryProject && requestedUnitPlanTarget
      ? requestedUnitPlanTarget
      : nextChapterNumber;
  const matchingChapterOutlines = shortStoryProject
    ? []
    : await prisma.outline.findMany({
        where: {
          projectId,
          level: "chapter",
          status: {
            not: "archived",
          },
          chapterNumber: nextChapterNumber,
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 5,
      });
  const chapterOutlinePrefill = buildChapterOutlinePrefill(
    selectChapterOutlineForPrefill(matchingChapterOutlines),
  );
  const defaultChapterTitle =
    chapterOutlinePrefill?.title ??
    (shortStoryProject
      ? `单元 ${targetChapterNumber}`
      : `第 ${nextChapterNumber} 章`);
  const hasActiveUnitPlanTask = unitPlanTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const latestTargetUnitPlanTask = unitPlanTasks.find(
    (task) =>
      shortStoryUnitPlanTaskTargetNumber(task.inputJson) === targetChapterNumber,
  );
  const generatedUnitPlan =
    latestTargetUnitPlanTask?.status === "completed" &&
    latestTargetUnitPlanTask.adoptionState === "not_reviewed"
      ? parseShortStoryUnitPlanGenerationOutput(
          latestTargetUnitPlanTask.outputText,
        )
      : {};
  const hasGeneratedUnitPlan = isReviewableShortStoryUnitPlanDraft(
    generatedUnitPlan,
  );
  const hasUsableBlueprint = isUsableShortStoryBlueprint(
    project.shortStoryBlueprint,
  );
  const hasApiKey = hasConfiguredOpenAIKey();
  const unitPlanStatusMessage = shortStoryProject
    ? buildUnitPlanStatusMessage({
        hasActiveTask: hasActiveUnitPlanTask,
        hasApiKey,
        hasGeneratedUnitPlan,
        hasUsableBlueprint,
        latestTask: latestTargetUnitPlanTask,
      })
    : undefined;

  return (
    <>
      <AutoRefresh enabled={hasActiveUnitPlanTask} />
      <ChapterForm
        action={createChapter.bind(null, project.id)}
        initialValues={{
          chapterNumber: targetChapterNumber,
          goal: hasGeneratedUnitPlan
            ? generatedUnitPlan.goal
            : chapterOutlinePrefill?.goal,
          title: hasGeneratedUnitPlan
            ? generatedUnitPlan.title
            : defaultChapterTitle,
          unitSceneMovement: hasGeneratedUnitPlan
            ? generatedUnitPlan.unitSceneMovement
            : undefined,
          unitConflict: hasGeneratedUnitPlan
            ? generatedUnitPlan.unitConflict
            : undefined,
          unitTurn: hasGeneratedUnitPlan
            ? generatedUnitPlan.unitTurn
            : undefined,
          unitPayoffMovement: hasGeneratedUnitPlan
            ? generatedUnitPlan.unitPayoffMovement
            : undefined,
          unitWordTarget: shortStoryProject
            ? unitRecommendation.unitWordTarget
            : 0,
        }}
        formMessage={
          chapterError === "duplicate-number"
            ? `这个${shortStoryProject ? "单元序号" : "章节号"}已经存在，请改用其他编号。`
            : unitPlanErrorMessage(unitPlanError)
        }
        project={project}
        sourceUnitPlanTaskId={
          hasGeneratedUnitPlan ? latestTargetUnitPlanTask?.id : undefined
        }
        submitLabel={shortStoryProject ? "创建写作单元" : "创建章节"}
        subtitle={
          shortStoryProject
            ? `建议全篇拆成 ${unitRecommendation.unitCount} 个内部写作单元，每单元约 ${unitRecommendation.unitWordTarget.toLocaleString("zh-CN")} 字。可以让 AI 先生成当前单元规划，确认或修改后再创建正式单元。`
            : chapterOutlinePrefill
              ? `已读取第 ${nextChapterNumber} 章章节大纲“${
                  chapterOutlinePrefill.sourceOutlineTitle ?? defaultChapterTitle
                }”，可调整后保存。保存后进入章节详情页，再用 AI 生成节拍和草稿。`
              : "只需要先填写章节号、标题和目标。保存后进入章节详情页，再用 AI 生成节拍和草稿。"
        }
        title={shortStoryProject ? "新建写作单元" : "新建章节"}
        unitPlanGeneration={
          shortStoryProject
            ? {
                action: generateShortStoryUnitPlanDraft.bind(null, project.id),
                canGenerate:
                  hasApiKey &&
                  hasUsableBlueprint &&
                  !hasActiveUnitPlanTask,
                hasActiveTask: hasActiveUnitPlanTask,
                hasDraft: hasGeneratedUnitPlan,
                statusMessage: unitPlanStatusMessage,
              }
            : undefined
        }
      />
    </>
  );
}

function positiveInteger(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function unitPlanErrorMessage(error?: string) {
  if (error === "invalid-target") {
    return "单元序号或目标字数无效，未启动 AI 规划。";
  }

  if (error === "missing-blueprint") {
    return "请先建立包含核心前提、核心冲突和结局的正式短故事蓝图。";
  }

  return undefined;
}

function buildUnitPlanStatusMessage({
  hasActiveTask,
  hasApiKey,
  hasGeneratedUnitPlan,
  hasUsableBlueprint,
  latestTask,
}: {
  hasActiveTask: boolean;
  hasApiKey: boolean;
  hasGeneratedUnitPlan: boolean;
  hasUsableBlueprint: boolean;
  latestTask?: {
    status: string;
    errorMessage?: string | null;
  };
}) {
  if (hasActiveTask) {
    return "AI 正在生成当前单元规划，完成后页面会自动刷新并填入表单。";
  }

  if (hasGeneratedUnitPlan) {
    return "最新 AI 草案已填入单元标题与五项规划内容。请检查、修改，再创建正式写作单元。";
  }

  if (!hasApiKey) {
    return "未配置 API Key，暂不能生成；仍可手动填写并创建写作单元。";
  }

  if (!hasUsableBlueprint) {
    return "请先在“蓝图”中确认核心前提、核心冲突和结局，再生成单元规划。";
  }

  if (latestTask?.status === "failed") {
    return `上次生成失败：${latestTask.errorMessage || "模型没有返回可用结果"}`;
  }

  if (latestTask?.status === "completed") {
    return "上次草案字段不完整，没有覆盖当前表单；可以重新生成。";
  }

  return "AI 会读取正式蓝图、系列连续性、设定、角色和前序单元，只生成当前单元的可编辑草案。";
}
