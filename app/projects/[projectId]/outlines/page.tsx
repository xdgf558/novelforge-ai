import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  BookOpenText,
  FileText,
  Layers3,
  Pencil,
  Route,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  createOutline,
  deleteOutline,
  generateOutlineDraft,
} from "@/app/projects/[projectId]/outlines/actions";
import { AutoRefresh } from "@/components/auto-refresh";
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
  outlineLevelOptions,
  outlineRangeLabel,
  outlineStatusLabel,
  outlineValidationErrorMessages,
  type OutlineLevel,
  type OutlineLike,
  type OutlineValidationErrorCode,
} from "@/lib/outline-fields";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OutlinesPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    outlineError?: string;
  }>;
};

export default async function OutlinesPage({
  params,
  searchParams,
}: OutlinesPageProps) {
  const { projectId } = await params;
  const query = (await searchParams) ?? {};

  await expireStaleOutlineAiTasks(projectId);

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      outlines: {
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
  });

  if (!project) {
    notFound();
  }

  const aiSettings = readAiConnectionSettings();
  const outlineErrorMessage =
    outlineValidationErrorMessages[
      query.outlineError as OutlineValidationErrorCode
    ];
  const groupedOutlines = {
    volume: project.outlines.filter((outline) => outline.level === "volume"),
    unit: project.outlines.filter((outline) => outline.level === "unit"),
    chapter: project.outlines.filter((outline) => outline.level === "chapter"),
  };
  const hasActiveOutlineTask = project.aiTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasActiveOutlineTask} />
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

      <section className="grid gap-4 md:grid-cols-3">
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

      <OutlineAiPanel
        generateAction={generateOutlineDraft.bind(null, project.id)}
        hasActiveTask={hasActiveOutlineTask}
        hasApiKey={aiSettings.hasApiKey}
        tasks={project.aiTasks}
      />

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div>
          <h2 className="text-base font-semibold text-ink-950">快速新增大纲</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            先记录标题、章节范围和目标；进入编辑页后可以补全冲突、爽点、伏笔和钩子。
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
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
        projectId={project.id}
        title="卷大纲"
      />
      <OutlineGroup
        emptyText="还没有剧情单元大纲。可以把一段连续剧情拆成若干单元。"
        icon={Route}
        outlines={groupedOutlines.unit}
        projectId={project.id}
        title="剧情单元大纲"
      />
      <OutlineGroup
        emptyText="还没有章节大纲。章节节拍生成会优先读取匹配章节号的大纲。"
        icon={FileText}
        outlines={groupedOutlines.chapter}
        projectId={project.id}
        title="章节大纲"
      />
    </div>
  );
}

function OutlineAiPanel({
  generateAction,
  hasActiveTask,
  hasApiKey,
  tasks,
}: {
  generateAction: (formData: FormData) => Promise<void>;
  hasActiveTask: boolean;
  hasApiKey: boolean;
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
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
            AI 大纲草案
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            生成可审阅的大纲规划
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            AI 只输出草案并写入任务记录；正式卷大纲、剧情单元和章节大纲仍由作者手动创建或编辑。
          </p>
        </div>

        <form action={generateAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            目标层级
            <select
              className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
              defaultValue="chapter"
              name="targetLevel"
            >
              {outlineLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
            章节条目数
            <input
              className="min-h-10 w-28 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
              defaultValue={10}
              max={30}
              min={1}
              name="chapterCount"
              type="number"
            />
          </label>
          <button
            className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              canGenerate
                ? "bg-ink-950 text-white hover:bg-ink-800"
                : "cursor-not-allowed border border-ink-950/15 bg-paper-100 text-ink-700"
            }`}
            disabled={!canGenerate}
            type="submit"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {hasActiveTask ? "生成中" : "生成大纲草案"}
          </button>
        </form>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有大纲草案任务仍可查看。
        </p>
      ) : null}

      {hasActiveTask ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前已有大纲生成任务在后台运行，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-950">还没有大纲草案任务</p>
          <p className="mt-2 leading-6">
            生成后会在这里显示最近任务，包含模型、模板版本、状态和输出。作者可以把合适内容整理进正式大纲。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => (
            <article
              className="rounded-lg border border-ink-950/10 bg-paper-50 p-4 text-sm"
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
                {task.model} / {task.promptTemplate?.name ?? "大纲草案"} v
                {task.promptTemplate?.version ?? 1}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-700">
                {task.inputContextSummary}
              </p>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-ink-950/5 p-3 text-xs leading-6 text-ink-800">
                {task.outputText || task.errorMessage || "任务尚未产生输出。"}
              </pre>
            </article>
          ))}
        </div>
      )}
    </section>
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
    <form action={action} className="rounded-lg border border-ink-950/10 p-4">
      <input name="level" type="hidden" value={level} />
      <input name="status" type="hidden" value="planned" />
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-950">
        <BookOpenText aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {outlineLevelLabel(level)}
      </div>
      <div className="mt-4 grid gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
          标题
          <input
            className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
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
              className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
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
                className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
                min={1}
                name="expectedWords"
                type="number"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
              结束章节
              <input
                className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
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
              className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
              min={1}
              name="volumeNumber"
              type="number"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
          目标
          <textarea
            className="min-h-24 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none"
            name="goal"
            placeholder="这部分要完成的剧情功能。"
          />
        </label>
      </div>
      <button
        className="mt-4 inline-flex min-h-10 items-center rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
        type="submit"
      >
        保存{outlineLevelLabel(level)}
      </button>
    </form>
  );
}

function OutlineGroup({
  emptyText,
  icon: Icon,
  outlines,
  projectId,
  title,
}: {
  emptyText: string;
  icon: LucideIcon;
  outlines: readonly OutlineLike[];
  projectId: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="h-5 w-5 text-signal-600" />
        <h2 className="text-base font-semibold text-ink-950">{title}</h2>
      </div>

      {outlines.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-5 text-sm text-ink-700">
          {emptyText}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {outlines.map((outline) => (
            <OutlineCard
              key={outline.id}
              outline={outline}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function OutlineCard({
  outline,
  projectId,
}: {
  outline: OutlineLike;
  projectId: string;
}) {
  return (
    <article className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
            <span className="rounded-md bg-white px-2.5 py-1">
              {outlineLevelLabel(outline.level)}
            </span>
            <span className="rounded-md bg-white px-2.5 py-1">
              {outlineStatusLabel(outline.status)}
            </span>
            <span>{outlineRangeLabel(outline)}</span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-ink-950">
            {outline.title}
          </h3>
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

      <dl className="mt-4 grid gap-3 text-sm text-ink-700">
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
      <p className="mt-4 text-xs text-ink-700">
        更新：{outline.updatedAt ? formatDate(outline.updatedAt) : "未记录"}
      </p>
    </article>
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
      <dd className="mt-1 whitespace-pre-wrap leading-6 text-ink-800">{value}</dd>
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
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold text-ink-950">{value}</p>
    </div>
  );
}
