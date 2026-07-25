import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  BookOpenText,
  FileText,
  Flag,
  GitBranch,
  Layers3,
  Pencil,
  Route,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  createOutline,
  deleteOutline,
  generateEndingPlanDraft,
  generateOutlineDraft,
  ignoreEndingPlanTask,
  markEndingPlanTaskOrganized,
} from "@/app/projects/[projectId]/outlines/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { AiBudgetNotice } from "@/components/ai/ai-budget-notice";
import { FormActionButton } from "@/components/form-action-button";
import { OutlineAiGenerateForm } from "@/components/outlines/outline-ai-generate-form";
import { OutlineDraftCopyButton } from "@/components/outlines/outline-draft-copy-button";
import { OutlineSaveButton } from "@/components/outlines/outline-save-button";
import { SkipEndingPlanCheckbox } from "@/components/outlines/skip-ending-plan-checkbox";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import {
  calculateEndingReadiness,
  endingPlanningTaskType,
  endingStageLabel,
  type EndingReadinessSnapshot,
} from "@/lib/ai/ending-planning";
import {
  isUsableEndingPlanTask,
  readEndingPlanPlanningWindow,
  resolveEndingPlanWindowApplicability,
} from "@/lib/ai/ending-plan-reference";
import { expireStaleOutlineAiTasks } from "@/lib/ai/outline-task-maintenance";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import { readAiConnectionSettings } from "@/lib/ai/local-config";
import { formatDate, formatNumber } from "@/lib/format";
import {
  outlineLevelLabel,
  outlineLevels,
  outlineRangeLabel,
  outlineStatusLabel,
  outlineValidationErrorMessages,
  type OutlineLevel,
  type OutlineLike,
  type OutlineValidationErrorCode,
} from "@/lib/outline-fields";
import {
  calculateOutlineProgress,
  resolveOutlineLifecycleStatus,
  type OutlineProgress,
} from "@/lib/outline-progress";
import { inferNextTargetChapterNumber } from "@/lib/outlines/ai-tasks";
import {
  findNextUnitPlanningReminder,
  type NextUnitPlanningReminder,
} from "@/lib/outlines/unit-lifecycle";
import { prisma } from "@/lib/prisma";
import { storylineStatusLabel, storylineTypeLabel } from "@/lib/storyline-fields";

export const dynamic = "force-dynamic";

type OutlinesPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    outlineError?: string;
    outlineSaved?: string;
    outlineTarget?: string;
  }>;
};

export default async function OutlinesPage({
  params,
  searchParams,
}: OutlinesPageProps) {
  const { projectId } = await params;
  const query = (await searchParams) ?? {};

  await expireStaleOutlineAiTasks(projectId);

  const outlinePageData = await Promise.all([
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        outlines: {
          include: {
            storylineOutlines: {
              include: {
                storyline: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    status: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: [
            {
              level: "asc",
            },
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
        chapters: {
          orderBy: {
            chapterNumber: "asc",
          },
          select: {
            chapterNumber: true,
            goal: true,
            title: true,
            status: true,
            wordCount: true,
          },
        },
        foreshadows: {
          select: {
            content: true,
            status: true,
            importance: true,
            expectedResolveChapter: true,
          },
        },
        aiTasks: {
          where: {
            taskType: "outline_generation",
          },
          include: {
            promptTemplate: {
              select: {
                name: true,
                version: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    }),
    prisma.aiTask.findMany({
      where: {
        projectId,
        taskType: endingPlanningTaskType,
      },
      include: {
        promptTemplate: {
          select: {
            name: true,
            version: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      take: 3,
    }),
    prisma.aiTask.findFirst({
      where: {
        projectId,
        taskType: endingPlanningTaskType,
        status: "completed",
      },
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        taskType: true,
        status: true,
        adoptionState: true,
        outputText: true,
        inputJson: true,
      },
    }),
  ]);
  const [project, endingPlanTasks, latestCompletedEndingPlanTask] =
    outlinePageData;

  if (!project) {
    notFound();
  }

  const aiSettings = readAiConnectionSettings();
  const outlineErrorMessage =
    outlineValidationErrorMessages[
      query.outlineError as OutlineValidationErrorCode
    ];
  const savedOutlineLevel = outlineLevels.includes(
    query.outlineSaved as OutlineLevel,
  )
    ? (query.outlineSaved as OutlineLevel)
    : null;
  const progressByOutlineId = new Map(
    project.outlines.map((outline) => [
      outline.id,
      calculateOutlineProgress(outline, project.chapters),
    ]),
  );
  const lifecycleOutlines = project.outlines.map((outline) => ({
    ...outline,
    status: resolveOutlineLifecycleStatus(
      outline,
      progressByOutlineId.get(outline.id)!,
    ),
  }));
  const groupedOutlines = {
    volume: lifecycleOutlines.filter((outline) => outline.level === "volume"),
    unit: lifecycleOutlines.filter((outline) => outline.level === "unit"),
    chapter: lifecycleOutlines.filter((outline) => outline.level === "chapter"),
  };
  const defaultTargetChapterNumber = inferNextTargetChapterNumber(
    project.chapters,
    project.outlines,
  );
  const hasActiveOutlineTask = project.aiTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const outlineTasks = project.aiTasks;
  const defaultOutlineTargetLevel =
    outlineTargetLevelFromQuery(query.outlineTarget) ??
    outlineLevelFromTaskSummary(outlineTasks[0]?.inputContextSummary) ??
    "chapter";
  const hasActiveEndingPlanTask = endingPlanTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const latestUsableEndingPlanTask =
    latestCompletedEndingPlanTask &&
    isUsableEndingPlanTask(latestCompletedEndingPlanTask)
      ? latestCompletedEndingPlanTask
      : null;
  const latestEndingPlanWindow = readEndingPlanPlanningWindow(
    latestUsableEndingPlanTask?.inputJson,
  );
  const expiredEndingPlanReference =
    latestEndingPlanWindow &&
    resolveEndingPlanWindowApplicability(
      latestEndingPlanWindow,
      defaultTargetChapterNumber,
    ) === "expired"
      ? {
          nextChapterNumber: defaultTargetChapterNumber,
          validThroughChapterNumber:
            latestEndingPlanWindow.validThroughChapterNumber,
        }
      : null;
  const endingReadiness = calculateEndingReadiness({
    project,
    chapters: project.chapters,
    outlines: lifecycleOutlines,
    foreshadows: project.foreshadows,
  });
  const nextUnitReminder = findNextUnitPlanningReminder({
    chapters: project.chapters,
    outlines: project.outlines,
    readyToFinish: endingReadiness.stage === "ready_to_finish",
  });

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasActiveOutlineTask || hasActiveEndingPlanTask} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            大纲模块
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            管理卷大纲、剧情单元大纲和章节大纲。章节节拍生成会读取匹配当前章节的卷、单元和章节大纲，帮助长篇连载保持主线连续。
          </p>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoTile
          icon={Layers3}
          label="卷大纲"
          value={`${groupedOutlines.volume.length} 条`}
        />
        <InfoTile
          icon={Route}
          label="剧情单元"
          value={`${groupedOutlines.unit.length} 条`}
        />
        <InfoTile
          icon={FileText}
          label="章节大纲"
          value={`${groupedOutlines.chapter.length} 条`}
        />
      </section>

      {outlineErrorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {outlineErrorMessage}
        </div>
      ) : null}

      {savedOutlineLevel ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          已保存{outlineLevelLabel(savedOutlineLevel)}，下方列表已更新。
        </div>
      ) : null}

      <OutlineAiPanel
        defaultTargetChapterNumber={defaultTargetChapterNumber}
        generateAction={generateOutlineDraft.bind(null, project.id)}
        hasActiveTask={hasActiveOutlineTask}
        hasApiKey={aiSettings.hasApiKey}
        initialTargetLevel={defaultOutlineTargetLevel}
        tasks={outlineTasks}
      />

      <EndingPlanningPanel
        expiredReference={expiredEndingPlanReference}
        generateAction={generateEndingPlanDraft.bind(null, project.id)}
        hasActiveTask={hasActiveEndingPlanTask}
        hasApiKey={aiSettings.hasApiKey}
        projectId={project.id}
        readiness={endingReadiness}
        tasks={endingPlanTasks}
      />
      {nextUnitReminder ? (
        <NextUnitPlanningPanel
          generateAction={generateOutlineDraft.bind(null, project.id)}
          hasActiveTask={hasActiveOutlineTask}
          hasApiKey={aiSettings.hasApiKey}
          reminder={nextUnitReminder}
        />
      ) : null}
      <AiBudgetNotice projectId={project.id} />

      <section
        className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
        id="quick-create-outlines"
      >
        <div>
          <h2 className="text-base font-semibold text-ink-950">快速新增大纲</h2>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            先记录标题、章节范围和目标；进入编辑页后可以补全冲突、爽点、伏笔和钩子。
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <QuickCreateOutlineForm
            action={createOutline.bind(null, project.id)}
            level="volume"
          />
          <QuickCreateOutlineForm
            action={createOutline.bind(null, project.id)}
            level="unit"
          />
          <QuickCreateOutlineForm
            action={createOutline.bind(null, project.id)}
            level="chapter"
          />
        </div>
      </section>

      <OutlineGroup
        emptyText="还没有卷大纲。先定义本卷目标、冲突、高潮和预计章节数。"
        icon={Layers3}
        outlines={groupedOutlines.volume}
        progressByOutlineId={progressByOutlineId}
        projectId={project.id}
        title="卷大纲"
        visibleLimit={1}
      />
      <OutlineGroup
        emptyText="还没有剧情单元大纲。可以把一段连续剧情拆成若干单元。"
        icon={Route}
        outlines={groupedOutlines.unit}
        progressByOutlineId={progressByOutlineId}
        projectId={project.id}
        title="剧情单元大纲"
        visibleLimit={1}
      />
      <OutlineGroup
        emptyText="还没有章节大纲。章节节拍生成会优先读取匹配章节号的大纲。"
        icon={FileText}
        outlines={groupedOutlines.chapter}
        progressByOutlineId={progressByOutlineId}
        projectId={project.id}
        title="章节大纲"
        visibleLimit={1}
      />
    </div>
  );
}

function OutlineAiPanel({
  defaultTargetChapterNumber,
  generateAction,
  hasActiveTask,
  hasApiKey,
  initialTargetLevel,
  tasks,
}: {
  defaultTargetChapterNumber: number;
  generateAction: (formData: FormData) => Promise<void>;
  hasActiveTask: boolean;
  hasApiKey: boolean;
  initialTargetLevel: OutlineLevel;
  tasks: readonly {
    id: string;
    status: string;
    adoptionState: string;
    createdAt: Date;
    model: string;
    inputContextSummary: string;
    outputText: string | null;
    errorMessage: string | null;
    promptTemplate?: {
      name: string;
      version: number;
    } | null;
  }[];
}) {
  const canGenerate = hasApiKey && !hasActiveTask;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI 大纲草案
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-ink-950">
            生成可审阅的大纲规划
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
            AI 只输出草案并写入任务记录；正式卷大纲、剧情单元和章节大纲仍由作者手动创建或编辑。
          </p>
        </div>

        <OutlineAiGenerateForm
          action={generateAction}
          canGenerate={canGenerate}
          defaultTargetChapterNumber={defaultTargetChapterNumber}
          hasActiveTask={hasActiveTask}
          initialTargetLevel={initialTargetLevel}
        />
      </div>

      {!hasApiKey ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有大纲草案任务仍可查看。
        </p>
      ) : null}

      {hasActiveTask ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前已有大纲生成任务在后台运行，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-4 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有大纲草案任务</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近任务，包含模型、模板版本、状态和输出。作者可以把合适内容整理进正式大纲。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <article
              className="rounded-lg border border-ink-950/10 bg-paper-50 p-3 text-sm"
              key={task.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                    <span className="rounded-md bg-white px-2.5 py-1">
                      {aiTaskStatusLabel(task.status)}
                    </span>
                    <span className="rounded-md bg-white px-2.5 py-1">
                      {aiTaskAdoptionLabel(task.adoptionState)}
                    </span>
                    <span>{formatDate(task.createdAt)}</span>
                  </div>
                  <p className="mt-3 font-semibold text-ink-950">
                    {task.model} / {task.promptTemplate?.name ?? "大纲草案"} v
                    {task.promptTemplate?.version ?? 1}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-700">
                    {task.inputContextSummary}
                  </p>
                </div>
                {task.status === "completed" && task.outputText?.trim() ? (
                  <OutlineDraftCopyButton
                    inputContextSummary={task.inputContextSummary}
                    outputText={task.outputText}
                  />
                ) : null}
              </div>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-ink-950/5 p-3 text-xs leading-5 text-ink-800">
                {task.outputText || task.errorMessage || "任务尚未产生输出。"}
              </pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function outlineTargetLevelFromQuery(value?: string | null) {
  return outlineLevels.includes(value as OutlineLevel)
    ? (value as OutlineLevel)
    : null;
}

function outlineLevelFromTaskSummary(summary?: string | null) {
  if (!summary) {
    return null;
  }

  if (summary.includes("章节大纲生成")) {
    return "chapter";
  }

  if (summary.includes("剧情单元大纲生成")) {
    return "unit";
  }

  if (summary.includes("卷大纲生成")) {
    return "volume";
  }

  return null;
}

function NextUnitPlanningPanel({
  generateAction,
  hasActiveTask,
  hasApiKey,
  reminder,
}: {
  generateAction: (formData: FormData) => Promise<void>;
  hasActiveTask: boolean;
  hasApiKey: boolean;
  reminder: NextUnitPlanningReminder;
}) {
  const canGenerate = hasApiKey && !hasActiveTask;

  return (
    <section
      className="rounded-lg border border-signal-600/25 bg-white p-4 shadow-panel"
      id="next-unit-planning"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Route aria-hidden="true" className="h-4 w-4" />
            下一剧情单元
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-ink-950">
            当前剧情单元已全部完成
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            已完成 {formatNumber(reminder.completedUnitCount)} 个剧情单元，作品尚未达到可完结状态。建议从第 {formatNumber(reminder.nextChapterNumber)} 章开始规划下一单元。
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            系统不会自动创建正式大纲。这里仅生成可审阅草案，作者确认后再复制到大纲表单保存。
          </p>
          <Link
            className="mt-2 inline-flex text-xs font-semibold text-signal-700 transition hover:text-signal-600"
            href="#quick-create-outlines"
          >
            手动新增剧情单元
          </Link>
        </div>

        <PreserveScrollForm
          action={generateAction}
          className="flex flex-col items-start gap-2"
          preserveKey="next-unit-outline-generation"
          statusText="已开始生成下一剧情单元草案，页面会自动刷新结果。"
        >
          <input name="targetLevel" type="hidden" value="unit" />
          <input
            name="targetChapterNumber"
            type="hidden"
            value={reminder.nextChapterNumber}
          />
          <SkipEndingPlanCheckbox />
          <FormActionButton
            disabled={!canGenerate}
            icon="play"
            idleLabel="生成下一单元草案"
            pendingLabel="正在生成草案"
            statusText={`正在从第 ${reminder.nextChapterNumber} 章起规划下一剧情单元。`}
            variant="dark"
          />
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，仍可使用上方入口手动新增剧情单元。
        </p>
      ) : null}

      {hasActiveTask ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前已有大纲草案任务运行中，完成后可再生成下一单元。
        </p>
      ) : null}
    </section>
  );
}

function EndingPlanningPanel({
  expiredReference,
  generateAction,
  hasActiveTask,
  hasApiKey,
  projectId,
  readiness,
  tasks,
}: {
  expiredReference: {
    nextChapterNumber: number;
    validThroughChapterNumber: number;
  } | null;
  generateAction: () => Promise<void>;
  hasActiveTask: boolean;
  hasApiKey: boolean;
  projectId: string;
  readiness: EndingReadinessSnapshot;
  tasks: readonly {
    id: string;
    status: string;
    adoptionState: string;
    createdAt: Date;
    model: string;
    inputContextSummary: string;
    outputText: string | null;
    errorMessage: string | null;
    promptTemplate?: {
      name: string;
      version: number;
    } | null;
  }[];
}) {
  const canGenerate = hasApiKey && !hasActiveTask;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
      id="ending-planning"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Flag aria-hidden="true" className="h-4 w-4" />
            终局规划 / 收尾检查
          </div>
          <h2 className="mt-1.5 text-base font-semibold text-ink-950">
            判断是否该开始收束
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
            系统会结合总目标字数、章节状态、未回收伏笔和大纲进度给出本地判断；AI
            只生成可审阅的收尾规划草案，不会自动修改正式大纲、伏笔池或时间线。最近一份已完成且未被忽略的规划会自动纳入后续大纲生成。
          </p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
            系统只在目标章节位于规划生成点之后、且未超出本地估算射程时引用；也可在生成大纲时选择本次不引用。“标记已整理”后仍会继续参考，标记“忽略”后则完全停止引用。
          </p>
        </div>

        <PreserveScrollForm
          action={generateAction}
          preserveKey="ending-planning-generation"
          statusText="已提交终局规划任务，AI 正在后台生成草案。"
        >
          <FormActionButton
            disabled={!canGenerate}
            icon="play"
            idleLabel="生成收尾规划草案"
            pendingLabel="正在生成规划"
            statusText="正在读取大纲、伏笔、角色弧线和章节进度。"
            variant="dark"
          />
        </PreserveScrollForm>
      </div>

      <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        <EndingMetric
          label="字数进度"
          value={
            readiness.progressPercent == null
              ? "未设置"
              : `${readiness.progressPercent}%`
          }
          detail={
            readiness.targetWords
              ? `${formatNumber(readiness.currentWords)} / ${formatNumber(readiness.targetWords)} 字`
              : `${formatNumber(readiness.currentWords)} 字`
          }
        />
        <EndingMetric
          label="章节进度"
          value={`${formatNumber(readiness.chapterCount)} 章`}
          detail={`定稿 ${formatNumber(readiness.finalChapterCount)} / 发布 ${formatNumber(
            readiness.publishedChapterCount,
          )}`}
        />
        <EndingMetric
          label="未回收伏笔"
          value={`${formatNumber(readiness.unresolvedForeshadowCount)} 条`}
          detail={`高重要度 ${formatNumber(
            readiness.highImportanceUnresolvedForeshadowCount,
          )} 条`}
        />
        <EndingMetric
          label="大纲状态"
          value={`${formatNumber(readiness.activeOutlineCount)} 进行中`}
          detail={`已完成 ${formatNumber(readiness.completedOutlineCount)} 条`}
        />
        <EndingMetric
          label="本地判断"
          value={endingStageLabel(readiness.stage)}
          detail={readiness.recommendation}
        />
      </div>

      {expiredReference ? (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          <strong>终局规划已超出建议射程。</strong> 最新规划建议参考至第{" "}
          {formatNumber(expiredReference.validThroughChapterNumber)} 章；当前下一章是第{" "}
          {formatNumber(expiredReference.nextChapterNumber)} 章，后续大纲不会再自动引用。
          请重新生成收尾规划，更新剩余章节和伏笔回收安排。
        </p>
      ) : null}

      {!hasApiKey ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能生成终局规划草案；本地收尾信号仍可参考。
        </p>
      ) : null}

      {hasActiveTask ? (
        <p className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前已有终局规划任务在后台运行，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-4 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有终局规划任务</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近草案，包含模型、模板版本、状态、建议参考章节范围和输出；适用范围内会自动作为后续大纲草案的收束参考。作者仍可把合适内容整理进正式卷大纲、剧情单元大纲或伏笔回收计划。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <article
              className="rounded-lg border border-ink-950/10 bg-paper-50 p-3 text-sm"
              key={task.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                <span className="rounded-md bg-white px-2.5 py-1">
                  {aiTaskStatusLabel(task.status)}
                </span>
                <span className="rounded-md bg-white px-2.5 py-1">
                  {aiTaskAdoptionLabel(task.adoptionState)}
                </span>
                <span>{formatDate(task.createdAt)}</span>
              </div>
              <p className="mt-3 font-semibold text-ink-950">
                {task.model} / {task.promptTemplate?.name ?? "终局规划草案"} v
                {task.promptTemplate?.version ?? 1}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-700">
                {task.inputContextSummary}
              </p>
              {task.status === "completed" &&
              task.adoptionState === "not_reviewed" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form
                    action={markEndingPlanTaskOrganized.bind(
                      null,
                      projectId,
                      task.id,
                    )}
                  >
                    <FormActionButton
                      icon="save"
                      idleLabel="标记已整理"
                      pendingLabel="正在标记"
                      statusText="正在把这份终局规划草案标记为已整理。"
                    />
                  </form>
                  <form
                    action={ignoreEndingPlanTask.bind(null, projectId, task.id)}
                  >
                    <FormActionButton
                      icon="save"
                      idleLabel="忽略"
                      pendingLabel="正在忽略"
                      statusText="正在把这份终局规划草案标记为忽略。"
                    />
                  </form>
                </div>
              ) : null}
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-ink-950/5 p-3 text-xs leading-5 text-ink-800">
                {task.outputText || task.errorMessage || "任务尚未产生输出。"}
              </pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EndingMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-3">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink-950">{value}</p>
      <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-ink-700">
        {detail}
      </p>
    </div>
  );
}

function QuickCreateOutlineForm({
  action,
  level,
}: {
  action: (formData: FormData) => Promise<void>;
  level: OutlineLevel;
}) {
  const isChapter = level === "chapter";
  const isUnit = level === "unit";
  const titlePlaceholder =
    level === "volume"
      ? "例如：第一卷 县城起势"
      : level === "unit"
        ? "例如：培训班破局"
        : "例如：第 3 章 抢设备";

  return (
    <form
      action={action}
      className="rounded-lg border border-ink-950/10 p-3"
      data-outline-level={level}
    >
      <input name="level" type="hidden" value={level} />
      <input name="status" type="hidden" value="planned" />
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-950">
        <BookOpenText aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {outlineLevelLabel(level)}
      </div>
      <div className="mt-3 grid gap-2.5">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
          标题
          <input
            className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
            maxLength={180}
            name="title"
            placeholder={titlePlaceholder}
            required
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            {isChapter ? "章节号" : "起始章节"}
            <input
              className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
              min={1}
              name={isChapter ? "chapterNumber" : "startChapter"}
              required={isChapter}
              type="number"
            />
          </label>
          {isChapter ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
              预计字数
              <input
                className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
                min={1}
                name="expectedWords"
                type="number"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
              结束章节
              <input
                className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
                min={1}
                name="endChapter"
                type="number"
              />
            </label>
          )}
        </div>
        {isUnit ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            所属卷号
            <input
              className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
              min={1}
              name="volumeNumber"
              type="number"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
          目标
          <textarea
            className="min-h-16 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm leading-5 text-ink-950 outline-none"
            name="goal"
            placeholder="这部分要完成的剧情功能。"
            rows={2}
          />
        </label>
      </div>
      <OutlineSaveButton label={outlineLevelLabel(level)} />
    </form>
  );
}

function OutlineGroup({
  emptyText,
  icon: Icon,
  outlines,
  progressByOutlineId,
  projectId,
  title,
  visibleLimit,
}: {
  emptyText: string;
  icon: LucideIcon;
  outlines: readonly OutlineWithStorylines[];
  progressByOutlineId: ReadonlyMap<string, OutlineProgress>;
  projectId: string;
  title: string;
  visibleLimit?: number;
}) {
  const visibleOutlines = visibleLimit ? outlines.slice(-visibleLimit) : outlines;
  const hiddenOutlines = visibleLimit ? outlines.slice(0, -visibleLimit) : [];
  const hiddenCount = Math.max(0, outlines.length - visibleOutlines.length);

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
          <h2 className="text-base font-semibold text-ink-950">{title}</h2>
        </div>
        {hiddenCount > 0 ? (
          <p className="text-xs font-medium text-ink-600">
            仅显示最新 {visibleOutlines.length} 条，已自动隐藏 {hiddenCount} 条历史大纲。
          </p>
        ) : null}
      </div>

      {outlines.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-4 text-sm text-ink-700">
          {emptyText}
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-lg border border-ink-950/10 bg-paper-50">
            {visibleOutlines.map((outline) => (
              <OutlineCard
                key={outline.id}
                outline={outline}
                progress={outline.id ? progressByOutlineId.get(outline.id) : undefined}
                projectId={projectId}
              />
            ))}
          </div>
          {hiddenCount > 0 ? (
            <details className="mt-3 rounded-lg border border-ink-950/10 bg-paper-50 px-3 py-2 text-sm text-ink-800">
              <summary className="cursor-pointer font-semibold text-ink-900">
                展开历史{title}（{hiddenCount} 条）
              </summary>
              <div className="mt-3 overflow-hidden rounded-lg border border-ink-950/10 bg-white">
                {hiddenOutlines.map((outline) => (
                  <OutlineCard
                    key={outline.id}
                    outline={outline}
                    progress={
                      outline.id ? progressByOutlineId.get(outline.id) : undefined
                    }
                    projectId={projectId}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

function OutlineCard({
  outline,
  progress,
  projectId,
}: {
  outline: OutlineWithStorylines;
  progress?: OutlineProgress;
  projectId: string;
}) {
  return (
    <article className="border-b border-ink-950/10 bg-paper-50 px-4 py-3 last:border-b-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-700">
            <span className="rounded-md bg-white px-2.5 py-1">
              {outlineLevelLabel(outline.level)}
            </span>
            <span className="rounded-md bg-white px-2.5 py-1">
              {outlineStatusLabel(outline.status)}
            </span>
            <span>{outlineRangeLabel(outline)}</span>
          </div>
          <h3 className="mt-2 truncate text-base font-semibold text-ink-950">
            {outline.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-700">
            {outline.goal || outline.mainConflict || outline.coreEvents || "未填写目标或核心事件。"}
          </p>
          {progress ? <OutlineProgressLine progress={progress} /> : null}
          {outline.storylineOutlines && outline.storylineOutlines.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-ink-700">
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-signal-700">
                <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
                关联故事线
              </span>
              {outline.storylineOutlines.map((item) => (
                <Link
                  className="rounded-md bg-white px-2 py-1 transition hover:text-signal-700"
                  href={`/projects/${projectId}/storylines?editId=${item.storyline.id}#storyline-${item.storyline.id}`}
                  key={item.storyline.id}
                >
                  {item.storyline.name} · {storylineTypeLabel(item.storyline.type)}
                  · {storylineStatusLabel(item.storyline.status)}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-ink-950/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${projectId}/outlines/${outline.id}/edit`}
          >
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            编辑
          </Link>
          <form action={deleteOutline.bind(null, projectId, outline.id ?? "")}>
            <button
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              type="submit"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              删除
            </button>
          </form>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs text-ink-700 sm:grid-cols-2">
        <OutlineField label="目标" value={outline.goal} />
        <OutlineField label="冲突" value={outline.mainConflict ?? outline.chapterConflict} />
        <OutlineField label="核心事件" value={outline.coreEvents} />
        <OutlineField
          label="爽点"
          value={outline.pleasureDesign ?? outline.chapterPleasurePoint}
        />
        <OutlineField label="章末钩子" value={outline.endingHook} />
        <OutlineField label="预计字数" value={formatNumber(outline.expectedWords)} />
      </dl>
      <p className="mt-3 text-xs text-ink-700">
        更新：{outline.updatedAt ? formatDate(outline.updatedAt) : "未记录"}
      </p>
    </article>
  );
}

type OutlineWithStorylines = OutlineLike & {
  storylineOutlines?: {
    storyline: {
      id: string;
      name: string;
      type: string;
      status: string;
    };
  }[];
};

function OutlineProgressLine({ progress }: { progress: OutlineProgress }) {
  const totalText = progress.expectedChapters
    ? `${progress.createdChapters}/${progress.expectedChapters}`
    : `${progress.createdChapters}`;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink-700">
      <span className="rounded-md bg-white px-2 py-1">
        已创建 {totalText}
      </span>
      <span className="rounded-md bg-white px-2 py-1">
        已定稿 {progress.completedChapters}
      </span>
      <span className="rounded-md bg-white px-2 py-1">
        已发布 {progress.publishedChapters}
      </span>
    </div>
  );
}

function OutlineField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <dt className="text-xs font-semibold text-ink-700">{label}</dt>
      <dd className="mt-0.5 line-clamp-2 leading-5 text-ink-800">{value}</dd>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-3 shadow-panel">
      <div className="flex items-center gap-2 text-xs text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold text-ink-950">{value}</p>
    </div>
  );
}
