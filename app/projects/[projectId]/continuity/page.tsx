import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import {
  applyContinuityReportFix,
  reopenContinuityReport,
  resolveContinuityReport,
} from "@/app/projects/[projectId]/continuity/actions";
import {
  continuityCategoryLabel,
  continuitySeverityLabel,
  continuityStatusLabel,
} from "@/lib/continuity-reports";
import {
  describeContinuityReplacementFix,
  parseContinuityReplacementFix,
} from "@/lib/continuity-fixes";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ContinuityPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    fix?: string;
  }>;
};

export default async function ContinuityPage({
  params,
  searchParams,
}: ContinuityPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const fixMessage = continuityFixMessage(resolvedSearchParams?.fix);
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

  return (
    <div className="space-y-6">
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

      {project.continuityReports.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white p-8 text-sm text-ink-700 shadow-panel">
          <h2 className="text-base font-semibold text-ink-950">
            还没有连续性报告
          </h2>
          <p className="mt-2 leading-6">
            打开已保存定稿正文的章节，在“连续性检查”面板中运行检查后，问题会汇总到这里。
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {project.continuityReports.map((report) => {
            const replacementFix = parseContinuityReplacementFix(
              report.suggestedFix,
              {
                description: report.description,
                evidence: report.evidence,
              },
            );

            return (
              <article
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
                    {replacementFix && report.chapter ? (
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
          })}
        </section>
      )}
    </div>
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

  return null;
}
