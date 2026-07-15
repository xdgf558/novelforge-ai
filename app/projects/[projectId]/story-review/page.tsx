import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FilePenLine,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  generateShortStoryWholeReview,
  reopenShortStoryWholeReviewReport,
  resolveShortStoryWholeReviewReport,
} from "./actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { FormActionButton } from "@/components/form-action-button";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import {
  parseShortStoryWholeReviewOutput,
  shortStoryWholeReviewMinimumUnits,
  shortStoryWholeReviewTaskType,
} from "@/lib/ai/short-story-whole-review";
import { expireStaleShortStoryWholeReviewTasks } from "@/lib/ai/short-story-whole-review-task-maintenance";
import { aiTaskStatusLabel, isActiveAiTaskStatus } from "@/lib/ai/status";
import { chapterSourceMatches } from "@/lib/chapters/source-text";
import {
  continuityCategoryLabel,
  continuitySeverityLabel,
  continuityStatusLabel,
} from "@/lib/continuity-reports";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { hasShortStoryBlueprintContent } from "@/lib/short-stories/blueprint-fields";

export const dynamic = "force-dynamic";

type ShortStoryWholeReviewPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ review?: string }>;
};

export default async function ShortStoryWholeReviewPage({
  params,
  searchParams,
}: ShortStoryWholeReviewPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  await expireStaleShortStoryWholeReviewTasks(projectId);

  const [project, tasks, reports] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: projectId,
        workType: "short_story",
      },
      include: {
        shortStoryBlueprint: true,
        chapters: {
          orderBy: { chapterNumber: "asc" },
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            status: true,
            finalText: true,
            wordCount: true,
          },
        },
      },
    }),
    prisma.aiTask.findMany({
      where: {
        projectId,
        taskType: shortStoryWholeReviewTaskType,
      },
      include: {
        promptTemplate: {
          select: { name: true, version: true },
        },
        continuityReports: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.continuityReport.findMany({
      where: {
        projectId,
        aiTask: {
          is: { taskType: shortStoryWholeReviewTaskType },
        },
      },
      include: {
        chapter: {
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            finalText: true,
          },
        },
        aiTask: {
          select: {
            id: true,
            model: true,
            inputContextSummary: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!project) {
    notFound();
  }

  const confirmedUnits = project.chapters.filter(
    (unit) =>
      ["final", "published"].includes(unit.status) &&
      Boolean(unit.finalText?.trim()),
  );
  const confirmedWords = confirmedUnits.reduce(
    (total, unit) => total + (unit.wordCount || unit.finalText?.replace(/\s/g, "").length || 0),
    0,
  );
  const hasActiveTask = tasks.some((task) => isActiveAiTaskStatus(task.status));
  const canGenerate =
    hasConfiguredOpenAIKey() &&
    hasShortStoryBlueprintContent(project.shortStoryBlueprint) &&
    confirmedUnits.length >= shortStoryWholeReviewMinimumUnits &&
    !hasActiveTask;
  const openCount = reports.filter((report) => report.status === "open").length;
  const sortedReports = [...reports].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "open" ? -1 : 1;
    }

    return severityRank(right.severity) - severityRank(left.severity);
  });
  const notice = reviewNotice(resolvedSearchParams?.review);

  return (
    <div className="space-y-7">
      <AutoRefresh enabled={hasActiveTask} />

      <header className="border-b border-ink-950/10 pb-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
          href={`/projects/${project.id}`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回短故事创作台
        </Link>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">{project.title}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
              整篇审校
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
              把已确认单元放回同一篇故事中检查动机、顺序、重复、节奏、开篇承诺、反转铺垫和结局兑现。AI 只生成定位到单元的建议，不会自动改写定稿。
            </p>
          </div>
          <form action={generateShortStoryWholeReview.bind(null, project.id)}>
            <FormActionButton
              disabled={!canGenerate}
              icon="play"
              idleLabel={hasActiveTask ? "审校进行中" : "运行整篇审校"}
              pendingLabel="正在启动"
              statusText="整篇审校已启动，页面会自动刷新结果。"
            />
          </form>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="写作单元" value={`${confirmedUnits.length} / ${project.chapters.length} 个已确认`} />
        <Stat label="确认正文" value={`${formatNumber(confirmedWords)} 字`} />
        <Stat label="待处理建议" value={`${formatNumber(openCount)} 条`} />
        <Stat label="最近审校记录" value={`${formatNumber(tasks.length)} 次`} />
      </section>

      {notice ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm leading-6 ${
            notice.tone === "success"
              ? "border-signal-600/25 bg-signal-600/10 text-ink-800"
              : "border-amber-300/70 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}

      {!hasConfiguredOpenAIKey() ? (
        <ReadinessNote text="未配置 API Key，暂不能运行整篇审校。已有建议仍可继续处理。" />
      ) : !hasShortStoryBlueprintContent(project.shortStoryBlueprint) ? (
        <ReadinessNote text="请先建立正式短故事蓝图，整篇审校才能核对开篇承诺、反转链和必须兑现项。" />
      ) : confirmedUnits.length < shortStoryWholeReviewMinimumUnits ? (
        <ReadinessNote text={`至少需要 ${shortStoryWholeReviewMinimumUnits} 个带定稿正文且状态为“已定稿/已发布”的写作单元。`} />
      ) : null}

      <section className="border-t border-ink-950/10 pt-5">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-signal-600" />
          <div>
            <h2 className="text-base font-semibold text-ink-950">修改建议</h2>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              建议只提供修改目标和核对点。请进入对应单元手动修订，确认完成后再标记处理。
            </p>
          </div>
        </div>

        {sortedReports.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-ink-950/20 bg-white p-6 text-sm leading-6 text-ink-700">
            还没有整篇审校建议。完成至少两个写作单元并建立正式蓝图后，可以运行第一次检查。
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedReports.map((report) => {
              const stale = Boolean(
                report.sourceTextHash &&
                  !chapterSourceMatches(report.sourceTextHash, report.chapter?.finalText),
              );

              return (
                <article
                  className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
                  id={`suggestion-${report.id}`}
                  key={report.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                        <span className="rounded-md bg-paper-100 px-2.5 py-1">
                          {continuityStatusLabel(report.status)}
                        </span>
                        <span className="rounded-md bg-paper-100 px-2.5 py-1">
                          {continuitySeverityLabel(report.severity)}
                        </span>
                        <span className="rounded-md bg-paper-100 px-2.5 py-1">
                          {continuityCategoryLabel(report.category)}
                        </span>
                        {stale ? (
                          <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700">
                            来源已过期
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-ink-950">
                        {report.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-ink-700">
                        {report.description}
                      </p>
                      {report.chapter ? (
                        <p className="mt-3 text-sm font-semibold text-signal-700">
                          目标单元 {report.chapter.chapterNumber}《{report.chapter.title}》
                        </p>
                      ) : null}
                    </div>

                    <div className="flex min-w-64 flex-col gap-2">
                      {report.chapter ? (
                        <Link
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                          href={`/projects/${project.id}/chapters/${report.chapter.id}/edit`}
                        >
                          <FilePenLine aria-hidden="true" className="h-4 w-4" />
                          手动修改该单元
                        </Link>
                      ) : null}
                      {report.status === "open" ? (
                        <form
                          action={resolveShortStoryWholeReviewReport.bind(
                            null,
                            project.id,
                            report.id,
                          )}
                          className="space-y-2"
                        >
                          <textarea
                            className="min-h-20 w-full rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                            maxLength={1000}
                            name="resolutionNote"
                            placeholder="处理备注（可选）"
                          />
                          <button
                            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
                            type="submit"
                          >
                            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                            标记已处理
                          </button>
                        </form>
                      ) : (
                        <form
                          action={reopenShortStoryWholeReviewReport.bind(
                            null,
                            project.id,
                            report.id,
                          )}
                        >
                          <button
                            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                            type="submit"
                          >
                            <RotateCcw aria-hidden="true" className="h-4 w-4" />
                            重新打开
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Detail label="正文证据" value={report.evidence} />
                    <Detail label="审校依据" value={report.conflictingMemory} />
                    <Detail label="修改目标" value={report.suggestedFix} />
                  </div>

                  {stale ? (
                    <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
                      目标单元的定稿正文已变化。本建议保留作历史参考，处理前应重新运行整篇审校。
                    </p>
                  ) : null}
                  {report.resolutionNote ? (
                    <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm leading-6 text-ink-700">
                      处理备注：{report.resolutionNote}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-ink-950/10 pt-5">
        <h2 className="text-base font-semibold text-ink-950">最近审校记录</h2>
        <p className="mt-1 text-xs leading-5 text-ink-700">
          每次调用都会保留模型、提示词版本、输入摘要和原始 JSON，便于比较不同轮次。
        </p>
        {tasks.length === 0 ? (
          <p className="mt-4 text-sm text-ink-700">还没有整篇审校任务。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {tasks.map((task) => {
              const result = parseShortStoryWholeReviewOutput(task.outputText);
              const openIssues = task.continuityReports.filter(
                (report) => report.status === "open",
              ).length;

              return (
                <article
                  className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
                  key={task.id}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                    <span className="rounded-md bg-paper-100 px-2.5 py-1">
                      {aiTaskStatusLabel(task.status)}
                    </span>
                    <span>{formatDate(task.createdAt)}</span>
                    <span>{task.continuityReports.length} 条建议</span>
                    {openIssues > 0 ? <span>{openIssues} 条待处理</span> : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink-950">
                    {task.model}
                    {task.promptTemplate
                      ? ` / ${task.promptTemplate.name} v${task.promptTemplate.version}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-700">
                    {task.inputContextSummary}
                  </p>
                  {task.status === "completed" && result.summary ? (
                    <div className="mt-3 rounded-md bg-paper-50 px-3 py-2 text-sm leading-6 text-ink-700">
                      <p>{result.summary}</p>
                      {result.priority ? (
                        <p className="mt-2 font-medium text-ink-950">
                          优先处理：{result.priority}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {task.status === "completed" && result.viewpointAudit.checked ? (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink-950/10 pt-3 text-xs font-semibold text-ink-700">
                      <span>
                        视角违规 {formatNumber(result.viewpointAudit.viewpointViolationCount)} 处
                      </span>
                      <span>
                        其中越权信息泄露 {formatNumber(result.viewpointAudit.unauthorizedKnowledgeLeakCount)} 处
                      </span>
                    </div>
                  ) : null}
                  {task.errorMessage ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-700">
                      {task.errorMessage}
                    </p>
                  ) : null}
                  {task.outputText ? (
                    <details className="mt-3 border-t border-ink-950/10 pt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-ink-700">
                        查看模型原始输出
                      </summary>
                      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-ink-700">
                        {task.outputText}
                      </pre>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md bg-paper-50 p-3">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-800">
        {value || "未提供"}
      </p>
    </div>
  );
}

function ReadinessNote({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </p>
  );
}

function reviewNotice(value?: string) {
  if (value === "started" || value === "active") {
    return {
      tone: "success" as const,
      text:
        value === "started"
          ? "整篇审校已在后台运行，完成后会自动显示建议。"
          : "已有整篇审校任务正在运行，本次没有重复调用模型。",
    };
  }

  if (value === "missing-blueprint") {
    return { tone: "warning" as const, text: "缺少正式短故事蓝图，未启动审校。" };
  }

  if (value === "insufficient-units") {
    return {
      tone: "warning" as const,
      text: `至少需要 ${shortStoryWholeReviewMinimumUnits} 个已确认写作单元，未启动审校。`,
    };
  }

  return null;
}

function severityRank(value: string) {
  return { low: 0, medium: 1, high: 2, critical: 3 }[value] ?? 0;
}
