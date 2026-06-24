import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Database,
  FileClock,
  RefreshCw,
  ServerCog,
  Settings,
} from "lucide-react";
import {
  recordLocalAiReadinessCheck,
  syncDefaultPromptTemplates,
} from "@/app/projects/[projectId]/ai/actions";
import { aiTaskAdoptionLabel, aiTaskStatusLabel } from "@/lib/ai/status";
import { readAiConnectionSettings } from "@/lib/ai/local-config";
import {
  projectAiTaskRetentionLimit,
  pruneProjectAiTasks,
} from "@/lib/ai/task-retention";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AiWorkspacePageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function AiWorkspacePage({ params }: AiWorkspacePageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!project) {
    notFound();
  }

  await pruneProjectAiTasks(projectId);

  const [templates, tasks, taskCount] = await Promise.all([
    prisma.aiPromptTemplate.findMany({
      where: {
        projectId,
      },
      orderBy: [
        {
          taskType: "asc",
        },
        {
          key: "asc",
        },
        {
          version: "desc",
        },
      ],
    }),
    prisma.aiTask.findMany({
      where: {
        projectId,
      },
      include: {
        promptTemplate: {
          select: {
            name: true,
            version: true,
          },
        },
        chapter: {
          select: {
            chapterNumber: true,
            title: true,
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
      take: projectAiTaskRetentionLimit,
    }),
    prisma.aiTask.count({
      where: {
        projectId,
      },
    }),
  ]);

  const aiSettings = readAiConnectionSettings();

  return (
    <div className="space-y-6">
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
            AI 任务记录
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            管理提示词模板和 AI 调用审计记录。后续大纲草案、人物生成、人物关系草案、章节节拍、草稿、正文精修、摘要、连续性检查、公众号排版候选、发布包装和封面图生成都会从这里追踪。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href="/ai-settings"
          >
            <Settings aria-hidden="true" className="h-4 w-4" />
            配置接入
          </Link>
          <form action={syncDefaultPromptTemplates.bind(null, project.id)}>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              type="submit"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              同步默认模板
            </button>
          </form>
          <form action={recordLocalAiReadinessCheck.bind(null, project.id)}>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              type="submit"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              记录本地检查
            </button>
          </form>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <InfoTile
          icon={Bot}
          label="默认模型"
          value={aiSettings.model}
        />
        <InfoTile
          icon={Database}
          label="API Key"
          value={aiSettings.hasApiKey ? "已配置" : "未配置"}
        />
        <InfoTile
          icon={ServerCog}
          label="接口地址"
          value={aiSettings.baseUrl}
        />
        <InfoTile
          icon={FileClock}
          label="任务记录"
          value={`${taskCount} 条`}
        />
      </section>

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-950">
              Prompt Templates
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              当前项目已保存 {templates.length} 个模板版本。
            </p>
          </div>
        </div>

        {templates.length === 0 ? (
          <EmptyState
            title="还没有提示词模板"
            body="同步默认模板后，后续 AI 阶段会按模板版本记录每次调用。"
          />
        ) : (
          <div className="mt-5 overflow-hidden rounded-lg border border-ink-950/10">
            <div className="grid grid-cols-[1.2fr_1fr_80px_96px] border-b border-ink-950/10 bg-paper-50 px-4 py-3 text-sm font-semibold text-ink-800 max-lg:hidden">
              <div>模板</div>
              <div>任务类型</div>
              <div>版本</div>
              <div>格式</div>
            </div>

            <div className="divide-y divide-ink-950/10">
              {templates.map((template) => (
                <div
                  className="grid gap-2 px-4 py-4 text-sm lg:grid-cols-[1.2fr_1fr_80px_96px] lg:items-center"
                  key={template.id}
                >
                  <div>
                    <p className="font-semibold text-ink-950">{template.name}</p>
                    <p className="mt-1 text-xs text-ink-700">{template.key}</p>
                  </div>
                  <div className="text-ink-700">{template.taskType}</div>
                  <div className="text-ink-700">v{template.version}</div>
                  <div className="text-ink-700">{template.outputFormat}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div>
          <h2 className="text-base font-semibold text-ink-950">Recent Tasks</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            最近 {projectAiTaskRetentionLimit} 条 AI
            任务记录会保留状态、模型、模板版本和输出摘要；更早的已结束任务会自动清理。
          </p>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            title="还没有 AI 任务"
            body="记录本地检查会创建一条不调用外部模型的审计记录。"
          />
        ) : (
          <div className="mt-5 overflow-hidden rounded-lg border border-ink-950/10">
            <div className="grid grid-cols-[120px_1fr_120px_160px] border-b border-ink-950/10 bg-paper-50 px-4 py-3 text-sm font-semibold text-ink-800 max-lg:hidden">
              <div>状态</div>
              <div>任务</div>
              <div>审阅</div>
              <div>时间</div>
            </div>

            <div className="divide-y divide-ink-950/10">
              {tasks.map((task) => (
                <div
                  className="grid gap-2 px-4 py-4 text-sm lg:grid-cols-[120px_1fr_120px_160px] lg:items-start"
                  key={task.id}
                >
                  <div>
                    <span className="rounded-md bg-paper-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
                      {aiTaskStatusLabel(task.status)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-ink-950">{task.taskType}</p>
                    <p className="mt-1 text-xs text-ink-700">
                      {task.model}
                      {task.promptTemplate
                        ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                        : ""}
                      {task.chapter
                        ? ` / 第 ${task.chapter.chapterNumber} 章 ${task.chapter.title}`
                        : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-ink-700">
                      {task.outputText || task.errorMessage || task.inputContextSummary}
                    </p>
                  </div>
                  <div className="text-ink-700">
                    {aiTaskAdoptionLabel(task.adoptionState)}
                  </div>
                  <div className="text-ink-700">{formatDate(task.createdAt)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-3 text-lg font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-6 text-sm text-ink-700">
      <p className="font-semibold text-ink-950">{title}</p>
      <p className="mt-2 leading-6">{body}</p>
    </div>
  );
}
