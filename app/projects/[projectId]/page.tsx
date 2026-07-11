import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  Bot,
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

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
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

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目列表
      </Link>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
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
              {project.status === "active" ? "进行中" : "已归档"}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <InfoTile label="目标读者" value={project.targetAudience || "未设置"} />
        <InfoTile label="连载平台" value={project.platform || "未设置"} />
        <InfoTile label="总字数目标" value={formatNumber(project.totalWordTarget)} />
        <InfoTile
          label="单章字数"
          value={formatWordRange(project.chapterWordMin, project.chapterWordMax)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/settings`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <BookMarked aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                总设定档
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                维护题材、主线、世界观、人物规则、文风和发布约束。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/characters`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
              <Users aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                角色库
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.characters} 个角色，{project._count.characterVersions} 个角色快照。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/characters/network`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <Network aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                人物关系网络
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.characterRelationships} 条人物关系，用于追踪同盟、冲突和隐秘信息。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/chapters`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <FileText aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                章节编辑器
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.chapters} 个章节，{project._count.chapterVersions} 个章节快照。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/outlines`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
              <Layers3 aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                大纲模块
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.outlines} 条卷、剧情单元和章节大纲。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/storylines`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <GitBranch aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                多故事线
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.storylines} 条主线、支线、角色线或伏笔线。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/settings/history`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ember-500/10 text-ember-500">
              <History aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                设定历史
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.settingVersions} 个设定快照。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/ai`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
              <Bot aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                AI 任务
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.aiPromptTemplates} 个模板，{project._count.aiTasks} 条任务。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/pending-updates`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ember-500/10 text-ember-500">
              <ListChecks aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                待审更新
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                {pendingUpdateSummary(pendingUpdateStats)}
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/memory`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                结构化记忆
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                世界规则 {project._count.worldRules} 条，伏笔 {project._count.foreshadows} 条，时间线 {project._count.timelineEvents} 条。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/continuity`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ember-500/10 text-ember-500">
              <ShieldAlert aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                连续性报告
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                {project._count.continuityReports} 条检查问题，处理前不会自动修改记忆。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/publish`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <Send aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                发布与导出
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                公众号排版导出、Station Cat 同步材料和项目备份集中管理。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/audiobook`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
              <Headphones aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                有声小说导出
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.audioExports} 条有声导出记录，可生成本地分段音频。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/acceptance`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
              <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                MVP 验收
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                对照完整创作链路检查项目、AI 任务、待审更新、连续性报告和导出能力。
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-950">公众号定位</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
            {project.wechatPositioning || "暂无公众号定位。"}
          </p>
        </div>

        <div className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink-950">项目状态</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="状态" value={project.status === "active" ? "进行中" : "已归档"} />
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
      href: `/projects/${project.id}/blueprint`,
      icon: MapPinned,
      title: "故事蓝图",
      detail: project.shortStoryBlueprint
        ? `已确认 · ${project._count.shortStoryBlueprintVersions} 个版本`
        : "待建立开篇、反转与结局闭环",
    },
    {
      href: `/projects/${project.id}/settings`,
      icon: BookMarked,
      title: "设定库",
      detail: "作品定位、人物驱动、冲突与风格约束",
    },
    {
      href: `/projects/${project.id}/chapters`,
      icon: NotebookTabs,
      title: "写作单元",
      detail: `已建立 ${project._count.chapters} 个内部单元`,
    },
    {
      href: `/projects/${project.id}/characters`,
      icon: Users,
      title: "角色",
      detail: `已保存 ${project._count.characters} 个角色`,
    },
    {
      href: `/projects/${project.id}/story-review`,
      icon: ShieldAlert,
      title: "整篇审校",
      detail: `${project._count.continuityReports} 条连续性建议`,
    },
    {
      href: `/projects/${project.id}/manuscript`,
      icon: FileDown,
      title: "成稿导出",
      detail: "组装完整正文并导出 TXT / Markdown",
    },
    {
      href: `/projects/${project.id}/memory`,
      icon: ShieldCheck,
      title: "结构化记忆",
      detail: `规则 ${project._count.worldRules} · 伏笔 ${project._count.foreshadows} · 时间线 ${project._count.timelineEvents}`,
    },
    {
      href: `/projects/${project.id}/ai`,
      icon: Bot,
      title: "AI 任务",
      detail: `已记录 ${project._count.aiTasks} 条任务`,
    },
  ];

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目列表
      </Link>

      <header className="border-b border-ink-950/10 pb-5">
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
              {project.status === "active" ? "进行中" : "已归档"}
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoTile label="目标读者" value={project.targetAudience || "未设置"} />
        <InfoTile label="发布平台" value={project.platform || "未设置"} />
        <InfoTile label="总字数目标" value={formatNumber(project.totalWordTarget)} />
        <InfoTile
          label="写作单元字数"
          value={formatWordRange(project.chapterWordMin, project.chapterWordMax)}
        />
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink-950">创作资料</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workspaceLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel transition hover:border-signal-500/45 hover:bg-paper-50"
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" className="h-5 w-5 text-signal-600" />
                <h3 className="mt-3 text-sm font-semibold text-ink-950">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-ink-700">
                  {item.detail}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="border-t border-ink-950/10 pt-4">
          <h2 className="text-base font-semibold text-ink-950">发布定位</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
            {project.wechatPositioning || "暂无发布定位。"}
          </p>
        </div>

        <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
          <h2 className="text-sm font-semibold text-ink-950">项目状态</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="作品类型" value={projectWorkTypeLabel(project.workType)} />
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

function pendingUpdateSummary({
  approved,
  pending,
  rejected,
  total,
}: {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}) {
  if (total === 0) {
    return "暂无建议，AI 提取后会先进入待审核列表。";
  }

  if (pending === 0) {
    return `全部建议已处理：已批准 ${approved} 条，已拒绝 ${rejected} 条。`;
  }

  return `待审核 ${pending} 条，已批准 ${approved} 条，已拒绝 ${rejected} 条。`;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <p className="text-sm text-ink-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
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
