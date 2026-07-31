import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  PencilLine,
  RotateCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import {
  applyContinuityReportFix,
  generateContinuityFixPatch,
  ignoreContinuityFixPatch,
  markContinuityFixPatchOrganized,
  reopenContinuityReport,
  resolveContinuityReport,
} from "@/app/projects/[projectId]/continuity/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { FormActionButton } from "@/components/form-action-button";
import {
  continuityFixPatchTaskType,
  readContinuityFixPatchReportId,
} from "@/lib/ai/continuity-fix-patches";
import { expireStaleContinuityFixPatchTasks } from "@/lib/ai/continuity-fix-patch-task-maintenance";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import { shortStoryWholeReviewTaskType } from "@/lib/ai/short-story-whole-review";
import {
  continuityCategoryLabel,
  continuitySeverityLabel,
  continuityStatusLabel,
} from "@/lib/continuity-reports";
import {
  describeContinuityReplacementFix,
  getContinuityReplacements,
  parseContinuityReplacementFix,
} from "@/lib/continuity-fixes";
import { formatDate, formatNumber } from "@/lib/format";
import { chapterSourceMatches } from "@/lib/chapters/source-text";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ContinuityPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    fix?: string;
    patch?: string;
    reportId?: string;
    status?: string;
  }>;
};

export default async function ContinuityPage({
  params,
  searchParams,
}: ContinuityPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const fixMessage = continuityFixMessage(resolvedSearchParams?.fix);
  const patchMessage = continuityPatchMessage(resolvedSearchParams?.patch);
  const statusFilter =
    resolvedSearchParams?.status === "resolved" ? "resolved" : "open";

  await expireStaleContinuityFixPatchTasks(projectId);

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      continuityReports: {
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
              taskType: true,
              createdAt: true,
            },
          },
        },
        orderBy: [
          {
            status: "asc",
          },
          {
            severity: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      },
      aiTasks: {
        where: {
          taskType: continuityFixPatchTaskType,
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
        ],
        take: 100,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const openCount = project.continuityReports.filter(
    (report) => report.status === "open",
  ).length;
  const resolvedCount = project.continuityReports.filter(
    (report) => report.status === "resolved",
  ).length;
  const highRiskCount = project.continuityReports.filter((report) =>
    ["high", "critical"].includes(report.severity),
  ).length;
  const patchTasksByReportId = new Map<string, typeof project.aiTasks>();

  project.aiTasks.forEach((task) => {
    const reportId = readContinuityFixPatchReportId(task.inputJson);

    if (!reportId) {
      return;
    }

    const tasks = patchTasksByReportId.get(reportId) ?? [];
    tasks.push(task);
    patchTasksByReportId.set(reportId, tasks);
  });

  const hasActivePatchTask = project.aiTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const filteredReports = project.continuityReports.filter(
    (report) => report.status === statusFilter,
  );
  const selectedReport =
    filteredReports.find(
      (report) => report.id === resolvedSearchParams?.reportId,
    ) ?? filteredReports[0];

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasActivePatchTask} />

      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href={`/projects/${project.id}`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目
      </Link>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ember-500/10 text-ember-500">
            <ShieldAlert aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-signal-600">
              {project.title}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              连续性检查报告
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              AI 只生成风险报告和修复建议，不会自动修改正式设定、角色、时间线、伏笔或章节正文。处理结果由作者确认。
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatTile label="待处理" value={formatNumber(openCount)} />
        <StatTile label="已处理" value={formatNumber(resolvedCount)} />
        <StatTile label="高风险/严重" value={formatNumber(highRiskCount)} />
      </section>

      {fixMessage ? (
        <section
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 ${
            fixMessage.tone === "success"
              ? "border-signal-600/25 bg-signal-600/10 text-ink-800"
              : "border-ember-500/25 bg-ember-500/10 text-ink-800"
          }`}
          role="status"
        >
          <fixMessage.Icon
            aria-hidden="true"
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              fixMessage.tone === "success"
                ? "text-signal-600"
                : "text-ember-500"
            }`}
          />
          <div>
            <p className="font-semibold text-ink-950">{fixMessage.title}</p>
            <p>{fixMessage.description}</p>
          </div>
        </section>
      ) : null}

      {patchMessage ? (
        <section
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 ${
            patchMessage.tone === "success"
              ? "border-signal-600/25 bg-signal-600/10 text-ink-800"
              : "border-ember-500/25 bg-ember-500/10 text-ink-800"
          }`}
          role="status"
        >
          <patchMessage.Icon
            aria-hidden="true"
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              patchMessage.tone === "success"
                ? "text-signal-600"
                : "text-ember-500"
            }`}
          />
          <div>
            <p className="font-semibold text-ink-950">{patchMessage.title}</p>
            <p>{patchMessage.description}</p>
          </div>
        </section>
      ) : null}

      {project.continuityReports.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white p-8 text-sm text-ink-700 shadow-panel">
          <h2 className="text-base font-semibold text-ink-950">
            还没有连续性报告
          </h2>
          <p className="mt-2 leading-6">
            打开已保存定稿正文的章节，在“连续性检查”面板中运行检查后，问题会汇总到这里。
          </p>
        </section>
      ) : filteredReports.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white p-6 text-sm text-ink-700 shadow-panel">
          当前筛选下没有报告。切换到
          <Link
            className="mx-1 font-semibold text-signal-600 hover:underline"
            href={continuityReportHref(
              project.id,
              statusFilter === "open" ? "resolved" : "open",
            )}
          >
            {statusFilter === "open" ? "已处理" : "待处理"}
          </Link>
          查看其他记录。
        </section>
      ) : (
        <section className="nf-review-workspace">
          <aside className="nf-review-list">
            <div className="nf-review-filters" aria-label="连续性报告状态筛选">
              <Link
                className={statusFilter === "open" ? "is-active" : undefined}
                href={continuityReportHref(project.id, "open")}
              >
                待处理 <span>{openCount}</span>
              </Link>
              <Link
                className={
                  statusFilter === "resolved" ? "is-active" : undefined
                }
                href={continuityReportHref(project.id, "resolved")}
              >
                已处理 <span>{resolvedCount}</span>
              </Link>
            </div>
            <div className="nf-review-list-items">
              {filteredReports.map((report) => (
                <Link
                  aria-current={
                    selectedReport?.id === report.id ? "page" : undefined
                  }
                  className={
                    selectedReport?.id === report.id ? "is-active" : undefined
                  }
                  href={continuityReportHref(
                    project.id,
                    statusFilter,
                    report.id,
                  )}
                  key={report.id}
                >
                  <span>
                    {continuitySeverityLabel(report.severity)} ·{" "}
                    {continuityCategoryLabel(report.category)}
                  </span>
                  <strong>{report.title}</strong>
                  <small>
                    {report.chapter
                      ? `第 ${report.chapter.chapterNumber} 章`
                      : "整篇报告"}
                    {" · "}
                    {formatDate(report.createdAt)}
                  </small>
                </Link>
              ))}
            </div>
          </aside>

          <div className="nf-review-detail">
          {selectedReport ? [selectedReport].map((report) => {
            const isWholeStoryReview =
              report.aiTask?.taskType === shortStoryWholeReviewTaskType;
            const isStale = Boolean(
              report.sourceTextHash &&
                !chapterSourceMatches(
                  report.sourceTextHash,
                  report.chapter?.finalText,
                ),
            );
            const replacementFix = isWholeStoryReview
              ? null
              : parseContinuityReplacementFix(report.suggestedFix, {
                  description: report.description,
                  evidence: report.evidence,
                });
            const manualFixHref = report.chapter
              ? buildManualContinuityFixHref({
                  chapterId: report.chapter.id,
                  projectId: project.id,
                  replacementText: replacementFix
                    ? getContinuityReplacements(replacementFix)[0]?.from
                    : null,
                  fallbackText:
                    report.evidence ?? report.suggestedFix ?? report.description,
                })
              : null;

            return (
              <article
                id={`report-${report.id}`}
                className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
                key={report.id}
              >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                    <span className="rounded-md bg-paper-100 px-2.5 py-1">
                      {continuityStatusLabel(report.status)}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-1 ${
                        report.severity === "critical" ||
                        report.severity === "high"
                          ? "bg-red-50 text-red-700"
                          : "bg-paper-100 text-ink-700"
                      }`}
                    >
                      {continuitySeverityLabel(report.severity)}
                    </span>
                    <span className="rounded-md bg-paper-100 px-2.5 py-1">
                      {continuityCategoryLabel(report.category)}
                    </span>
                    {isStale ? (
                      <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700">
                        来源已过期
                      </span>
                    ) : null}
                    <span>{formatDate(report.createdAt)}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-ink-950">
                    {report.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink-700">
                    {report.description}
                  </p>
                  {report.chapter ? (
                    <Link
                      className="mt-3 inline-flex text-sm font-semibold text-signal-600 hover:underline"
                      href={`/projects/${project.id}/chapters/${report.chapter.id}`}
                    >
                      第 {formatNumber(report.chapter.chapterNumber)} 章《
                      {report.chapter.title}》
                    </Link>
                  ) : null}
                </div>

                {report.status === "open" ? (
                  <div className="min-w-72 space-y-3">
                    {isStale ? (
                      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
                        章节定稿已在本报告生成后修改。请重新运行连续性检查；旧报告不能再用于一键修复或生成补丁。
                      </p>
                    ) : replacementFix && report.chapter ? (
                      <form
                        action={applyContinuityReportFix.bind(
                          null,
                          project.id,
                          report.id,
                        )}
                        className="rounded-md border border-signal-600/20 bg-signal-600/10 p-3"
                      >
                        <p className="text-xs font-semibold text-signal-700">
                          可一键修复定稿正文
                        </p>
                        <p className="mt-2 text-xs leading-5 text-ink-700">
                          {describeContinuityReplacementFix(replacementFix)}
                          ，并保存章节快照。
                        </p>
                        <button
                          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-signal-600/30 bg-signal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-signal-700"
                          type="submit"
                        >
                          <Wrench aria-hidden="true" className="h-4 w-4" />
                          一键修复正文
                        </button>
                      </form>
                    ) : (
                      <p className="rounded-md bg-paper-50 px-3 py-2 text-xs leading-5 text-ink-700">
                        这条建议需要手动处理：系统只会自动执行明确的“将 A
                        改为 B”替换。
                      </p>
                    )}

                    {manualFixHref ? (
                      <Link
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        href={manualFixHref}
                      >
                        <PencilLine aria-hidden="true" className="h-4 w-4" />
                        去定稿正文定位
                      </Link>
                    ) : null}

                    <form
                      action={resolveContinuityReport.bind(
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
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        type="submit"
                      >
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        标记已处理
                      </button>
                    </form>
                  </div>
                ) : (
                  <form
                    action={reopenContinuityReport.bind(null, project.id, report.id)}
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

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <DetailBlock label="证据" value={report.evidence} />
                <DetailBlock label="冲突记忆" value={report.conflictingMemory} />
                <DetailBlock label="建议修复" value={report.suggestedFix} />
              </div>

              {isWholeStoryReview ? (
                <p className="mt-4 rounded-md border border-signal-600/20 bg-signal-600/10 px-3 py-2 text-xs leading-5 text-ink-800">
                  这条建议来自短故事整篇审校，只允许作者进入目标单元手动修订；系统不会一键改写或继续生成自动补丁。
                </p>
              ) : (
                <ContinuityFixPatchPanel
                  canGenerate={
                    report.status === "open" && Boolean(report.chapter) && !isStale
                  }
                  projectId={project.id}
                  reportId={report.id}
                  tasks={patchTasksByReportId.get(report.id) ?? []}
                />
              )}

              {report.aiTask ? (
                <p className="mt-4 text-xs leading-5 text-ink-700">
                  来源任务：{report.aiTask.model} /{" "}
                  {report.aiTask.inputContextSummary} /{" "}
                  {formatDate(report.aiTask.createdAt)}
                </p>
              ) : null}

              {report.resolutionNote ? (
                <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm leading-6 text-ink-700">
                  处理备注：{report.resolutionNote}
                </p>
              ) : null}
              </article>
            );
          }) : null}
          </div>
        </section>
      )}
    </div>
  );
}

type ContinuityFixPatchTask = {
  id: string;
  status: string;
  adoptionState: string;
  model: string;
  inputContextSummary: string;
  outputText?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  promptTemplate?: {
    name: string;
    version: number;
  } | null;
};

function ContinuityFixPatchPanel({
  canGenerate,
  projectId,
  reportId,
  tasks,
}: {
  canGenerate: boolean;
  projectId: string;
  reportId: string;
  tasks: ContinuityFixPatchTask[];
}) {
  const hasActiveTask = tasks.some((task) => isActiveAiTaskStatus(task.status));

  return (
    <section className="mt-4 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-600/10 text-signal-600">
            <Bot aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-950">
              AI 修复候选补丁
            </h3>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              生成可审阅的查找/替换建议或改写片段。候选不会自动写入正文，作者整理后再标记处理。
            </p>
          </div>
        </div>

        {canGenerate ? (
          <form action={generateContinuityFixPatch.bind(null, projectId, reportId)}>
            <FormActionButton
              disabled={hasActiveTask}
              icon="play"
              idleLabel={hasActiveTask ? "补丁生成中" : "生成候选补丁"}
              pendingLabel="正在生成"
              statusText="正在提交修复候选补丁任务，页面会保持当前位置并自动刷新结果。"
            />
          </form>
        ) : (
          <p className="rounded-md bg-white px-3 py-2 text-xs leading-5 text-ink-700">
            已处理报告或缺少关联章节时不能继续生成候选。
          </p>
        )}
      </div>

      {hasActiveTask ? (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs leading-5 text-ink-700">
          当前报告已有候选补丁任务在后台运行，完成前不会重复调用模型。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-ink-950/15 bg-white px-3 py-2 text-xs leading-5 text-ink-700">
          还没有候选补丁。适合用于时间线错位、角色信息源不合理、伏笔回收方式需要改写这类无法直接一键替换的问题。
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {tasks.map((task) => (
            <article
              className="rounded-md border border-ink-950/10 bg-white p-3 text-sm"
              key={task.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                <span className="rounded-md bg-paper-100 px-2.5 py-1">
                  {aiTaskStatusLabel(task.status)}
                </span>
                <span className="rounded-md bg-paper-100 px-2.5 py-1">
                  {continuityPatchAdoptionLabel(task.adoptionState)}
                </span>
                <span>{formatDate(task.createdAt)}</span>
              </div>
              <p className="mt-3 font-semibold text-ink-950">
                {task.model} /{" "}
                {task.promptTemplate?.name ?? "连续性修复候选补丁"} v
                {task.promptTemplate?.version ?? 1}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-700">
                {task.inputContextSummary}
              </p>
              {task.status === "completed" &&
              task.adoptionState === "not_reviewed" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <form
                    action={markContinuityFixPatchOrganized.bind(
                      null,
                      projectId,
                      task.id,
                    )}
                  >
                    <FormActionButton
                      icon="save"
                      idleLabel="标记已整理"
                      pendingLabel="正在标记"
                      statusText="正在把这份候选补丁标记为已整理。"
                    />
                  </form>
                  <form
                    action={ignoreContinuityFixPatch.bind(
                      null,
                      projectId,
                      task.id,
                    )}
                  >
                    <FormActionButton
                      icon="save"
                      idleLabel="忽略候选"
                      pendingLabel="正在忽略"
                      statusText="正在把这份候选补丁标记为忽略。"
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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <p className="text-sm text-ink-700">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-md bg-paper-50 p-3">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-800">
        {value || "未提供"}
      </p>
    </div>
  );
}

function continuityFixMessage(fix?: string | null) {
  if (fix === "applied") {
    return {
      Icon: CheckCircle2,
      description:
        "已按报告建议修复章节定稿正文，创建新的章节快照，并将该连续性报告标记为已处理。",
      title: "一键修复已完成",
      tone: "success" as const,
    };
  }

  if (fix === "unsupported") {
    return {
      Icon: ShieldAlert,
      description:
        "这条建议没有明确的“将 A 改为 B”替换结构，需要进入章节编辑页手动处理。",
      title: "暂不能自动修复",
      tone: "warning" as const,
    };
  }

  if (fix === "not-found") {
    return {
      Icon: ShieldAlert,
      description:
        "报告中的原始文字没有在当前定稿正文中找到，可能已经被手动修改过。",
      title: "未找到可替换文本",
      tone: "warning" as const,
    };
  }

  if (fix === "missing-chapter") {
    return {
      Icon: ShieldAlert,
      description: "这条报告没有关联到可修改的章节正文，请手动核对。",
      title: "缺少关联章节",
      tone: "warning" as const,
    };
  }

  if (fix === "already-resolved") {
    return {
      Icon: ShieldAlert,
      description: "这条报告已经处理完成，如需重新修复，请先重新打开报告。",
      title: "报告已处理",
      tone: "warning" as const,
    };
  }

  if (fix === "stale-report") {
    return {
      Icon: ShieldAlert,
      description:
        "生成这条报告后，章节定稿正文已经修改。为避免把旧建议套到新正文上，请重新运行连续性检查。",
      title: "连续性报告已过期",
      tone: "warning" as const,
    };
  }

  return null;
}

function continuityPatchMessage(patch?: string | null) {
  if (patch === "stale-report") {
    return {
      Icon: ShieldAlert,
      description:
        "生成这条报告后，章节定稿正文已经修改。请先重新运行连续性检查，再生成修复候选。",
      title: "连续性报告已过期",
      tone: "warning" as const,
    };
  }

  if (patch === "started") {
    return {
      Icon: Bot,
      description:
        "已提交 AI 修复候选补丁任务。候选只会写入任务记录，不会自动修改章节正文。",
      title: "候选补丁生成中",
      tone: "success" as const,
    };
  }

  if (patch === "active") {
    return {
      Icon: ShieldAlert,
      description: "这条报告已有候选补丁任务正在运行，请等待当前任务完成。",
      title: "候选补丁已在生成",
      tone: "warning" as const,
    };
  }

  if (patch === "organized") {
    return {
      Icon: CheckCircle2,
      description:
        "已把这份候选补丁标记为已整理。报告本身是否处理完成仍由你手动确认。",
      title: "候选补丁已整理",
      tone: "success" as const,
    };
  }

  if (patch === "ignored") {
    return {
      Icon: CheckCircle2,
      description: "已忽略这份候选补丁，不会修改任何正文或正式记忆。",
      title: "候选补丁已忽略",
      tone: "success" as const,
    };
  }

  if (patch === "missing-text") {
    return {
      Icon: ShieldAlert,
      description: "关联章节没有可用于生成补丁的定稿、精修或草稿正文。",
      title: "缺少章节正文",
      tone: "warning" as const,
    };
  }

  if (patch === "missing-chapter") {
    return {
      Icon: ShieldAlert,
      description: "这条报告没有关联到可读取的章节，请手动核对。",
      title: "缺少关联章节",
      tone: "warning" as const,
    };
  }

  if (patch === "already-resolved") {
    return {
      Icon: ShieldAlert,
      description: "这条报告已经处理完成，如需继续生成候选，请先重新打开报告。",
      title: "报告已处理",
      tone: "warning" as const,
    };
  }

  if (patch === "already-reviewed") {
    return {
      Icon: ShieldAlert,
      description: "这份候选补丁已经被整理或忽略，页面状态已刷新。",
      title: "候选补丁已处理",
      tone: "warning" as const,
    };
  }

  return null;
}

function continuityPatchAdoptionLabel(adoptionState?: string | null) {
  if (adoptionState === "adopted") {
    return "已整理";
  }

  if (adoptionState === "rejected") {
    return "已忽略";
  }

  return aiTaskAdoptionLabel(adoptionState);
}

function continuityReportHref(
  projectId: string,
  status: "open" | "resolved",
  reportId?: string,
) {
  const query = new URLSearchParams({
    status,
  });

  if (reportId) {
    query.set("reportId", reportId);
  }

  return `/projects/${projectId}/continuity?${query.toString()}`;
}

function buildManualContinuityFixHref({
  chapterId,
  fallbackText,
  projectId,
  replacementText,
}: {
  chapterId: string;
  fallbackText?: string | null;
  projectId: string;
  replacementText?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("focusField", "finalText");

  const findText = buildManualFixFindText(replacementText || fallbackText);

  if (findText) {
    params.set("findText", findText);
  }

  return `/projects/${projectId}/chapters/${chapterId}/edit?${params.toString()}#finalText`;
}

function buildManualFixFindText(value?: string | null) {
  const cleaned = (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^["“”「」『』'‘’]+|["“”「」『』'‘’]+$/g, "")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned.length > 180 ? cleaned.slice(0, 180).trim() : cleaned;
}
