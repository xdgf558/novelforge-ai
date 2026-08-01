import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  BookCopy,
  Bot,
  ChevronRight,
  ClipboardCheck,
  FileDown,
  FileText,
  GitBranch,
  Headphones,
  History,
  Layers3,
  ListChecks,
  MapPinned,
  Network,
  NotebookTabs,
  Pencil,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProjectCompletionPanel } from "@/components/projects/project-completion-panel";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber, formatWordRange } from "@/lib/format";
import {
  loadProjectActivitySummary,
  type ProjectActivitySummary,
} from "@/lib/project-activity";
import {
  isShortStoryProject,
  projectWorkTypeLabel,
} from "@/lib/projects/work-types";
import { calculateProjectCompletionReadiness } from "@/lib/projects/completion";
import { projectStatusLabel } from "@/lib/projects/status";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    completion?: string;
  }>;
};

type ProjectCompletionNotice = "already-finished" | "not-ready" | "unsupported";

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const [project, pendingUpdateGroups] = await Promise.all([
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        shortStoryBlueprint: {
          select: {
            id: true,
          },
        },
        shortStorySeriesEntry: {
          include: {
            series: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        chapters: {
          select: {
            finalText: true,
            status: true,
            wordCount: true,
          },
        },
        _count: {
          select: {
            settingVersions: true,
            shortStoryBlueprintVersions: true,
            characters: true,
            characterVersions: true,
            chapters: true,
            chapterVersions: true,
            outlines: true,
            storylines: true,
            characterRelationships: true,
            worldRules: true,
            foreshadows: true,
            timelineEvents: true,
            aiPromptTemplates: true,
            aiTasks: true,
            pendingUpdates: true,
            continuityReports: true,
            audioExports: true,
          },
        },
      },
    }),
    prisma.pendingUpdate.groupBy({
      by: ["status"],
      where: {
        projectId,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  if (!project) {
    notFound();
  }

  const pendingUpdateStats = summarizePendingUpdates(pendingUpdateGroups);
  const activitySummary = await loadProjectActivitySummary(project);

  if (isShortStoryProject(project.workType)) {
    return (
      <ShortStoryProjectDashboard
        activitySummary={activitySummary}
        project={project}
      />
    );
  }

  const completionReadiness = calculateProjectCompletionReadiness({
    chapters: project.chapters,
    totalWordTarget: project.totalWordTarget,
  });
  const completionNotice = resolveProjectCompletionNotice(
    resolvedSearchParams?.completion,
  );

  const workspaceGroups = [
    {
      id: "project-prepare",
      label: "准备",
      items: [
        {
          detail: "维护题材、主线、世界观、人物规则、文风和发布约束。",
          href: `/projects/${project.id}/settings`,
          icon: BookMarked,
          meta: `${project._count.settingVersions} 个历史版本`,
          title: "总设定档",
        },
        {
          detail: "管理正式角色档案、角色状态与历史快照。",
          href: `/projects/${project.id}/characters`,
          icon: Users,
          meta: `${project._count.characters} 个角色`,
          title: "角色库",
        },
        {
          detail: "追踪人物同盟、冲突、亲缘与隐秘信息。",
          href: `/projects/${project.id}/characters/network`,
          icon: Network,
          meta: `${project._count.characterRelationships} 条关系`,
          title: "人物关系网络",
        },
        {
          detail: "管理卷、剧情单元和章节大纲，并生成可审阅规划。",
          href: `/projects/${project.id}/outlines`,
          icon: Layers3,
          meta: `${project._count.outlines} 条大纲`,
          title: "大纲模块",
        },
        {
          detail: "维护主线、支线、角色线与伏笔线的推进范围。",
          href: `/projects/${project.id}/storylines`,
          icon: GitBranch,
          meta: `${project._count.storylines} 条故事线`,
          title: "多故事线",
        },
        {
          detail: "查看、比较并恢复作者确认过的设定快照。",
          href: `/projects/${project.id}/settings/history`,
          icon: History,
          meta: `${project._count.settingVersions} 个快照`,
          title: "设定历史",
        },
      ],
    },
    {
      id: "project-writing",
      label: "写作",
      items: [
        {
          detail: "进入章节工作流，处理节拍、草稿、精修与定稿。",
          href: `/projects/${project.id}/chapters`,
          icon: FileText,
          meta: `${project._count.chapters} 章`,
          title: "章节编辑器",
        },
        {
          detail: "查看模型路由、提示词模板和最近 AI 任务记录。",
          href: `/projects/${project.id}/ai`,
          icon: Bot,
          meta: `${project._count.aiTasks} 条任务`,
          title: "AI 任务",
        },
        {
          detail: "从作者确认的正文生成本地分段音频。",
          href: `/projects/${project.id}/audiobook`,
          icon: Headphones,
          meta: `${project._count.audioExports} 条导出`,
          title: "有声小说导出",
        },
      ],
    },
    {
      id: "project-review",
      label: "审校",
      items: [
        {
          detail: "逐条审核 AI 从正文中提取的设定、角色与伏笔变化。",
          href: `/projects/${project.id}/pending-updates`,
          icon: ListChecks,
          meta: `${pendingUpdateStats.pending} 条待审`,
          title: "待审更新",
        },
        {
          detail: "集中维护世界规则、伏笔池和正式时间线。",
          href: `/projects/${project.id}/memory`,
          icon: ShieldCheck,
          meta: `${project._count.worldRules + project._count.foreshadows + project._count.timelineEvents} 条记录`,
          title: "结构化记忆",
        },
        {
          detail: "审阅正文与正式记忆之间的冲突、风险与修复建议。",
          href: `/projects/${project.id}/continuity`,
          icon: ShieldAlert,
          meta: `${project._count.continuityReports} 条报告`,
          title: "连续性检查",
        },
        {
          detail: "对照完整创作链路检查本地 MVP 的关键能力。",
          href: `/projects/${project.id}/acceptance`,
          icon: ClipboardCheck,
          meta: "本地检查",
          title: "MVP 验收",
        },
      ],
    },
    {
      id: "project-publish",
      label: "发布",
      items: [
        {
          detail: "管理公众号排版、Station Cat 草稿同步与项目备份。",
          href: `/projects/${project.id}/publish`,
          icon: Send,
          meta: "作者确认后执行",
          title: "发布与导出",
        },
      ],
    },
  ];

  return (
    <div className="nf-project-dashboard nf-page-stack">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目列表
      </Link>

      <header className="nf-project-workspace-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              {project.genre || "未设置题材"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {project.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              {project.description || "暂无故事简介。"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-10 items-center rounded-md border border-ink-950/10 bg-paper-50 px-3 py-2 text-sm font-semibold text-ink-800">
              {projectWorkTypeLabel(project.workType)}
            </span>
            <span className="inline-flex min-h-10 items-center rounded-md border border-signal-600/20 bg-signal-600/10 px-3 py-2 text-sm font-semibold text-signal-700">
              {projectStatusLabel(project.status)}
            </span>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href={`/projects/${project.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              编辑
            </Link>
          </div>
        </div>
      </header>

      <section className="nf-project-stat-strip" aria-label="项目创作参数">
        <InfoTile label="目标读者" value={project.targetAudience || "未设置"} />
        <InfoTile label="连载平台" value={project.platform || "未设置"} />
        <InfoTile label="总字数目标" value={formatNumber(project.totalWordTarget)} />
        <InfoTile
          label="单章字数"
          value={formatWordRange(project.chapterWordMin, project.chapterWordMax)}
        />
      </section>

      <ProjectCompletionPanel
        notice={completionNotice}
        projectId={project.id}
        readiness={completionReadiness}
        status={project.status}
      />

      <WorkspaceTabs
        ariaLabel="长篇项目模块"
        tabs={workspaceGroups.map((group) => ({
          content: <ModuleIndex items={group.items} />,
          id: group.id,
          label: group.label,
          meta: `${group.items.length} 项`,
        }))}
      />

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="nf-section-panel lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-950">公众号定位</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
            {project.wechatPositioning || "暂无公众号定位。"}
          </p>
        </div>

        <div className="nf-section-panel">
          <h2 className="text-base font-semibold text-ink-950">项目状态</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="状态" value={projectStatusLabel(project.status)} />
            <Row label="更新频率" value={project.updateFrequency || "未设置"} />
            <Row label="项目创建" value={formatDate(activitySummary.projectCreatedAt)} />
            <Row
              label="首章创建"
              value={
                activitySummary.firstChapter
                  ? formatDate(activitySummary.firstChapter.createdAt)
                  : "未创建"
              }
            />
            <Row
              label="项目资料更新"
              value={formatDate(activitySummary.projectUpdatedAt)}
            />
            <Row label="最近活动" value={formatDate(activitySummary.latestActivityAt)} />
          </dl>
          <p className="mt-4 text-xs leading-5 text-ink-700">
            最近活动会统计章节、AI 任务、待审更新、连续性报告和发布记录；项目资料更新只表示标题、简介等基础信息变更。
          </p>
        </div>
      </section>
    </div>
  );
}

type ShortStoryDashboardProject = {
  id: string;
  title: string;
  workType: string;
  shortStoryBlueprint: {
    id: string;
  } | null;
  shortStorySeriesEntry: {
    series: {
      id: string;
      title: string;
      status: string;
    };
  } | null;
  genre: string | null;
  targetAudience: string | null;
  platform: string | null;
  totalWordTarget: number | null;
  chapterWordMin: number | null;
  chapterWordMax: number | null;
  description: string | null;
  wechatPositioning: string | null;
  status: string;
  _count: {
    characters: number;
    chapters: number;
    worldRules: number;
    foreshadows: number;
    timelineEvents: number;
    aiTasks: number;
    continuityReports: number;
    shortStoryBlueprintVersions: number;
  };
};

function ShortStoryProjectDashboard({
  activitySummary,
  project,
}: {
  activitySummary: ProjectActivitySummary;
  project: ShortStoryDashboardProject;
}) {
  const workspaceLinks = [
    {
      group: "prepare",
      href: project.shortStorySeriesEntry
        ? `/series/${project.shortStorySeriesEntry.series.id}`
        : "/series",
      icon: BookCopy,
      title: "系列归属",
      detail: project.shortStorySeriesEntry
        ? `已归入《${project.shortStorySeriesEntry.series.title}》`
        : "当前为独立短故事，可在系列页加入篇目",
    },
    {
      group: "prepare",
      href: `/projects/${project.id}/blueprint`,
      icon: MapPinned,
      title: "故事蓝图",
      detail: project.shortStoryBlueprint
        ? `已确认 · ${project._count.shortStoryBlueprintVersions} 个版本`
        : "待建立开篇、反转与结局闭环",
    },
    {
      group: "prepare",
      href: `/projects/${project.id}/settings`,
      icon: BookMarked,
      title: "设定库",
      detail: "作品定位、人物驱动、冲突与风格约束",
    },
    {
      group: "writing",
      href: `/projects/${project.id}/chapters`,
      icon: NotebookTabs,
      title: "写作单元",
      detail: `已建立 ${project._count.chapters} 个内部单元`,
    },
    {
      group: "prepare",
      href: `/projects/${project.id}/characters`,
      icon: Users,
      title: "角色",
      detail: `已保存 ${project._count.characters} 个角色`,
    },
    {
      group: "review",
      href: `/projects/${project.id}/story-review`,
      icon: ShieldAlert,
      title: "整篇审校",
      detail: `${project._count.continuityReports} 条连续性建议`,
    },
    {
      group: "publish",
      href: `/projects/${project.id}/manuscript`,
      icon: FileDown,
      title: "成稿导出",
      detail: "组装完整正文并导出 TXT / Markdown",
    },
    {
      group: "review",
      href: `/projects/${project.id}/memory`,
      icon: ShieldCheck,
      title: "结构化记忆",
      detail: `规则 ${project._count.worldRules} · 伏笔 ${project._count.foreshadows} · 时间线 ${project._count.timelineEvents}`,
    },
    {
      group: "writing",
      href: `/projects/${project.id}/ai`,
      icon: Bot,
      title: "AI 任务",
      detail: `已记录 ${project._count.aiTasks} 条任务`,
    },
  ];
  const workspaceGroups = [
    { id: "prepare", label: "准备" },
    { id: "writing", label: "写作" },
    { id: "review", label: "审校" },
    { id: "publish", label: "发布" },
  ].map((group) => ({
    ...group,
    items: workspaceLinks
      .filter((item) => item.group === group.id)
      .map((item) => ({
        ...item,
        meta: "进入",
      })),
  }));

  return (
    <div className="nf-project-dashboard nf-page-stack">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目列表
      </Link>

      <header className="nf-project-workspace-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              短故事 · {project.genre || "未设置题材"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {project.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              {project.description || "暂无故事简介。"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-10 items-center rounded-md border border-signal-600/20 bg-signal-600/10 px-3 py-2 text-sm font-semibold text-signal-700">
              {projectStatusLabel(project.status)}
            </span>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href={`/projects/${project.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              编辑
            </Link>
          </div>
        </div>
      </header>

      <section className="nf-project-stat-strip" aria-label="短故事创作参数">
        <InfoTile label="目标读者" value={project.targetAudience || "未设置"} />
        <InfoTile label="发布平台" value={project.platform || "未设置"} />
        <InfoTile label="总字数目标" value={formatNumber(project.totalWordTarget)} />
        <InfoTile
          label="写作单元字数"
          value={formatWordRange(project.chapterWordMin, project.chapterWordMax)}
        />
      </section>

      <WorkspaceTabs
        ariaLabel="短故事项目模块"
        tabs={workspaceGroups.map((group) => ({
          content: <ModuleIndex items={group.items} />,
          id: `short-story-${group.id}`,
          label: group.label,
          meta: `${group.items.length} 项`,
        }))}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="border-t border-ink-950/10 pt-4">
          <h2 className="text-base font-semibold text-ink-950">发布定位</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
            {project.wechatPositioning || "暂无发布定位。"}
          </p>
        </div>

        <div className="nf-section-panel">
          <h2 className="text-sm font-semibold text-ink-950">项目状态</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="作品类型" value={projectWorkTypeLabel(project.workType)} />
            <Row
              label="系列归属"
              value={
                project.shortStorySeriesEntry?.series.title || "独立短故事"
              }
            />
            <Row label="写作单元" value={`${project._count.chapters} 个`} />
            <Row label="项目创建" value={formatDate(activitySummary.projectCreatedAt)} />
            <Row label="最近活动" value={formatDate(activitySummary.latestActivityAt)} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function summarizePendingUpdates(
  groups: Array<{
    status: string;
    _count: {
      _all: number;
    };
  }>,
) {
  const stats = {
    approved: 0,
    pending: 0,
    rejected: 0,
    total: 0,
  };

  for (const group of groups) {
    const count = group._count._all;
    stats.total += count;

    if (group.status === "pending") {
      stats.pending = count;
    } else if (group.status === "approved") {
      stats.approved = count;
    } else if (group.status === "rejected") {
      stats.rejected = count;
    }
  }

  return stats;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="nf-project-stat">
      <p className="text-sm text-ink-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

type ModuleIndexItem = {
  detail: string;
  href: string;
  icon: LucideIcon;
  meta: string;
  title: string;
};

function ModuleIndex({ items }: { items: ModuleIndexItem[] }) {
  return (
    <div className="nf-module-index">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link className="nf-module-row" href={item.href} key={item.href}>
            <span className="nf-module-row-icon">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="nf-module-row-copy">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </span>
            <span className="nf-module-row-meta">{item.meta}</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        );
      })}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-700">{label}</dt>
      <dd className="text-right font-medium text-ink-950">{value}</dd>
    </div>
  );
}

function resolveProjectCompletionNotice(
  value?: string,
): ProjectCompletionNotice | null {
  return value === "already-finished" ||
    value === "not-ready" ||
    value === "unsupported"
    ? value
    : null;
}
