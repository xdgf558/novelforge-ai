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
  copyPromptTemplateVersion,
  resetPromptTemplateToDefault,
  syncDefaultPromptTemplates,
  togglePromptTemplateStatus,
} from "@/app/projects/[projectId]/ai/actions";
import { PromptTemplateCopyButton } from "@/components/ai/prompt-template-copy-button";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { aiTaskAdoptionLabel, aiTaskStatusLabel } from "@/lib/ai/status";
import { readAiConnectionSettings } from "@/lib/ai/local-config";
import {
  projectAiTaskRetentionLimit,
  pruneProjectAiTasks,
} from "@/lib/ai/task-retention";
import {
  aiBudgetWarning,
  formatUsageNumber,
  loadProjectAiUsageSummary,
  type AiUsageBreakdownRow,
} from "@/lib/ai/usage";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AiWorkspacePageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    templateError?: string;
    templateStatus?: string;
  }>;
};

export default async function AiWorkspacePage({
  params,
  searchParams,
}: AiWorkspacePageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      title: true,
      aiDailyTokenBudget: true,
    },
  });

  if (!project) {
    notFound();
  }

  await pruneProjectAiTasks(projectId);

  const [templates, tasks, taskCount, usageSummary] = await Promise.all([
    prisma.aiPromptTemplate.findMany({
      where: {
        projectId,
        key: {
          not: "cover_image_generation",
        },
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          id: "desc",
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
    loadProjectAiUsageSummary(projectId),
  ]);

  const aiSettings = readAiConnectionSettings();
  const budgetWarning = aiBudgetWarning({
    budget: project.aiDailyTokenBudget,
    tokenTotal: usageSummary.totals.tokenTotal,
  });
  const visibleTemplateLimit = 3;
  const visibleTaskLimit = 3;
  const visibleTemplates = templates.slice(0, visibleTemplateLimit);
  const hiddenTemplates = templates.slice(visibleTemplateLimit);
  const visibleTasks = tasks.slice(0, visibleTaskLimit);
  const hiddenTasks = tasks.slice(visibleTaskLimit);

  const renderTemplateCard = (template: (typeof templates)[number]) => (
    <article
      className="rounded-lg border border-ink-950/10 bg-paper-50 p-3 text-sm"
      key={template.id}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-semibold text-ink-950">
              {template.name}
            </h3>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-ink-700">
              v{template.version}
            </span>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-ink-700">
              {template.status === "active" ? "启用" : "停用"}
            </span>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-ink-700">
              {template.outputFormat}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-ink-700">
            {template.key} / {template.taskType}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <form
            action={copyPromptTemplateVersion.bind(
              null,
              project.id,
              template.id,
            )}
          >
            <button
              className="inline-flex min-h-8 items-center rounded-md border border-ink-950/15 bg-white px-2.5 py-1 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
              type="submit"
            >
              复制新版
            </button>
          </form>
          <form
            action={togglePromptTemplateStatus.bind(
              null,
              project.id,
              template.id,
            )}
          >
            <button
              className="inline-flex min-h-8 items-center rounded-md border border-ink-950/15 bg-white px-2.5 py-1 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
              type="submit"
            >
              {template.status === "active" ? "停用" : "启用"}
            </button>
          </form>
          <form
            action={resetPromptTemplateToDefault.bind(
              null,
              project.id,
              template.id,
            )}
          >
            <button
              className="inline-flex min-h-8 items-center rounded-md border border-ink-950/15 bg-white px-2.5 py-1 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
              type="submit"
            >
              恢复默认
            </button>
          </form>
        </div>
      </div>

      <details className="mt-3 rounded-md border border-ink-950/10 bg-white p-3">
        <summary className="cursor-pointer text-xs font-semibold text-ink-800">
          查看 / 复制模板全文
        </summary>
        <div className="mt-3 space-y-3">
          <PromptTemplateCopyButton text={formatPromptTemplateText(template)} />
          <TemplateBlock label="System" value={template.systemPrompt} />
          <TemplateBlock label="User" value={template.userPrompt} />
          <TemplateBlock
            label="Context Notes"
            value={template.contextNotes || "未设置"}
          />
          <TemplateBlock
            label="Response Schema"
            value={template.responseSchema || "未设置"}
          />
        </div>
      </details>
    </article>
  );

  const renderTaskRows = (taskItems: typeof tasks) =>
    taskItems.map((task) => (
      <div
        className="grid gap-2 px-3 py-3 text-sm lg:grid-cols-[88px_minmax(0,1fr)_84px_126px] lg:items-start"
        key={task.id}
      >
        <div>
          <span className="rounded-md bg-paper-100 px-2 py-1 text-xs font-semibold text-ink-700">
            {aiTaskStatusLabel(task.status)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-950">{task.taskType}</p>
          <p className="mt-1 truncate text-xs text-ink-700">
            {task.model}
            {task.promptTemplate
              ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
              : ""}
            {task.chapter
              ? ` / 第 ${task.chapter.chapterNumber} 章 ${task.chapter.title}`
              : ""}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-700">
            {task.outputText || task.errorMessage || task.inputContextSummary}
          </p>
        </div>
        <div className="text-xs font-semibold text-ink-700">
          {aiTaskAdoptionLabel(task.adoptionState)}
        </div>
        <div className="text-xs leading-5 text-ink-700">
          {formatDate(task.createdAt)}
        </div>
      </div>
    ));

  return (
    <div className="space-y-5">
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
            管理提示词模板和 AI
            调用审计记录。后续大纲草案、人物生成、人物关系草案、章节节拍、草稿、正文精修、摘要、连续性检查和公众号排版候选都会从这里追踪。
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile icon={Bot} label="默认模型" value={aiSettings.model} />
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
        <InfoTile icon={FileClock} label="任务记录" value={`${taskCount} 条`} />
      </section>

      <WorkspaceTabs
        ariaLabel="AI 任务工作区"
        tabs={[
          {
            id: "ai-usage",
            label: "用量概览",
            meta: `${usageSummary.totals.callCount} 次`,
            content: (
              <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-ink-950">
                      今日 AI 用量
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-700">
                      {usageSummary.dateKey}{" "}
                      的聚合统计独立于最近任务保留，用于查看调用次数和 token
                      消耗。
                    </p>
                  </div>
                  <div className="rounded-md bg-paper-50 px-3 py-2 text-xs font-semibold text-ink-700">
                    提醒阈值：
                    {project.aiDailyTokenBudget
                      ? `${formatUsageNumber(project.aiDailyTokenBudget)} token`
                      : "未设置"}
                  </div>
                </div>

                {budgetWarning ? (
                  <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                    {budgetWarning}
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <UsageTile
                    label="调用次数"
                    value={`${usageSummary.totals.callCount} 次`}
                  />
                  <UsageTile
                    label="输入 token"
                    value={formatUsageNumber(usageSummary.totals.tokenInput)}
                  />
                  <UsageTile
                    label="输出 token"
                    value={formatUsageNumber(usageSummary.totals.tokenOutput)}
                  />
                  <UsageTile
                    label="总 token"
                    value={formatUsageNumber(usageSummary.totals.tokenTotal)}
                  />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <UsageBreakdown
                    title="按任务类型"
                    rows={usageSummary.byTaskType}
                  />
                  <UsageBreakdown title="按模型" rows={usageSummary.byModel} />
                </div>
              </section>
            ),
          },
          {
            id: "prompt-templates",
            label: "提示词模板",
            meta: `${templates.length} 个`,
            content: (
              <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-ink-950">
                      提示词模板
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-ink-700">
                      当前项目已保存 {templates.length} 个模板版本，默认展示最新{" "}
                      {Math.min(templates.length, visibleTemplateLimit)} 个。
                    </p>
                  </div>
                </div>

                {templates.length === 0 ? (
                  <EmptyState
                    title="还没有提示词模板"
                    body="同步默认模板后，后续 AI 阶段会按模板版本记录每次调用。"
                  />
                ) : (
                  <div className="mt-4 space-y-3">
                    {templateMessage(resolvedSearchParams) ? (
                      <p className="rounded-md border border-signal-600/20 bg-signal-600/10 px-3 py-2 text-sm text-ink-800">
                        {templateMessage(resolvedSearchParams)}
                      </p>
                    ) : null}

                    {visibleTemplates.map(renderTemplateCard)}

                    {hiddenTemplates.length > 0 ? (
                      <details className="rounded-lg border border-ink-950/10 bg-paper-50 p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-ink-800">
                          展开历史模板（{hiddenTemplates.length} 个）
                        </summary>
                        <div className="mt-3 space-y-3">
                          {hiddenTemplates.map(renderTemplateCard)}
                        </div>
                      </details>
                    ) : null}
                  </div>
                )}
              </section>
            ),
          },
          {
            id: "recent-ai-tasks",
            label: "最近任务",
            meta: `${taskCount} 条`,
            content: (
              <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
                <div>
                  <h2 className="text-base font-semibold text-ink-950">
                    最近任务
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-ink-700">
                    最近 {projectAiTaskRetentionLimit} 条 AI
                    任务记录会保留状态、模型、模板版本和输出摘要；默认展示最新{" "}
                    {Math.min(tasks.length, visibleTaskLimit)} 条，其余折叠。
                  </p>
                </div>

                {tasks.length === 0 ? (
                  <EmptyState
                    title="还没有 AI 任务"
                    body="记录本地检查会创建一条不调用外部模型的审计记录。"
                  />
                ) : (
                  <div className="mt-4 overflow-hidden rounded-lg border border-ink-950/10">
                    <div className="grid grid-cols-[88px_minmax(0,1fr)_84px_126px] border-b border-ink-950/10 bg-paper-50 px-3 py-2 text-xs font-semibold text-ink-800 max-lg:hidden">
                      <div>状态</div>
                      <div>任务</div>
                      <div>审阅</div>
                      <div>时间</div>
                    </div>

                    <div className="divide-y divide-ink-950/10">
                      {renderTaskRows(visibleTasks)}
                    </div>

                    {hiddenTasks.length > 0 ? (
                      <details className="border-t border-ink-950/10 bg-paper-50">
                        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink-800">
                          展开历史任务（{hiddenTasks.length} 条）
                        </summary>
                        <div className="divide-y divide-ink-950/10 bg-white">
                          {renderTaskRows(hiddenTasks)}
                        </div>
                      </details>
                    ) : null}
                  </div>
                )}
              </section>
            ),
          },
        ]}
      />
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
    <div className="min-w-0 rounded-lg border border-ink-950/10 bg-white p-3 shadow-panel">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-2 break-all text-base font-semibold leading-6 text-ink-950">
        {value}
      </p>
    </div>
  );
}

function UsageTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-2.5">
      <p className="text-xs font-medium text-ink-700">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function UsageBreakdown({
  rows,
  title,
}: {
  rows: readonly AiUsageBreakdownRow[];
  title: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-3">
      <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-700">今天还没有已完成调用。</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.slice(0, 8).map((row) => (
            <div
              className="grid gap-2 rounded-md bg-white px-3 py-2 text-xs text-ink-700 sm:grid-cols-[minmax(0,1fr)_56px_92px]"
              key={row.label}
            >
              <span className="truncate font-semibold text-ink-950">
                {row.label}
              </span>
              <span>{row.callCount} 次</span>
              <span>{formatUsageNumber(row.tokenTotal)} token</span>
            </div>
          ))}
        </div>
      )}
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

function TemplateBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-paper-50 p-3 text-xs leading-5 text-ink-800">
        {value}
      </pre>
    </div>
  );
}

function formatPromptTemplateText(template: {
  contextNotes: string | null;
  name: string;
  outputFormat: string;
  responseSchema: string | null;
  systemPrompt: string;
  taskType: string;
  userPrompt: string;
  version: number;
}) {
  return [
    `# ${template.name} v${template.version}`,
    `taskType: ${template.taskType}`,
    `outputFormat: ${template.outputFormat}`,
    "",
    "## System",
    template.systemPrompt,
    "",
    "## User",
    template.userPrompt,
    "",
    "## Context Notes",
    template.contextNotes || "未设置",
    "",
    "## Response Schema",
    template.responseSchema || "未设置",
  ].join("\n");
}

function templateMessage(params?: {
  templateError?: string;
  templateStatus?: string;
}) {
  if (params?.templateError === "lastActive") {
    return "每个模板 key 至少需要保留一个启用版本，不能停用最后一个 active 模板。";
  }

  if (params?.templateError === "noDefault") {
    return "这个模板没有可恢复的默认版本。";
  }

  if (params?.templateStatus === "copied") {
    return "已复制为新的模板版本，后续同 key 的 AI 调用会优先使用启用的最高版本。";
  }

  if (params?.templateStatus === "toggled") {
    return "模板状态已更新。";
  }

  if (params?.templateStatus === "reset") {
    return "模板已恢复为内置默认内容。";
  }

  return "";
}
