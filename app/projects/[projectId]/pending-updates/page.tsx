import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FilePenLine,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  approveAutomaticForeshadowRecoveryBatch,
  approvePendingUpdate,
  rejectPendingUpdate,
} from "@/app/projects/[projectId]/pending-updates/actions";
import { PendingUpdateReviewSubmit } from "@/components/pending-update-review-submit";
import { FormActionButton } from "@/components/form-action-button";
import { formatDate } from "@/lib/format";
import { chapterSourceMatches } from "@/lib/chapters/source-text";
import {
  pendingUpdateRiskLabel,
  pendingUpdateStatusLabel,
  pendingUpdateTargetLabel,
  pendingUpdateTypeLabel,
} from "@/lib/pending-updates";
import { prisma } from "@/lib/prisma";
import {
  countAutomaticForeshadowRecoveryCandidates,
} from "@/lib/foreshadows/recovery-records";
import { parseAutomaticForeshadowRecoveryPayload } from "@/lib/foreshadows/recovery-audit";

export const dynamic = "force-dynamic";

type PendingUpdatesPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    approved?: string;
    page?: string;
    review?: string;
    skipped?: string;
    status?: string;
    updateId?: string;
  }>;
};

export default async function PendingUpdatesPage({
  params,
  searchParams,
}: PendingUpdatesPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const reviewMessage = pendingUpdateReviewMessage(resolvedSearchParams);
  const statusFilter = pendingUpdateStatusFilter(
    resolvedSearchParams?.status,
  );
  const page = positiveInt(resolvedSearchParams?.page);
  const pageSize = 30;
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

  const [
    updates,
    pendingCount,
    approvedCount,
    rejectedCount,
    automaticRecoveryCandidateCount,
    filteredCount,
  ] = await Promise.all([
    prisma.pendingUpdate.findMany({
      where: {
        projectId,
        status: statusFilter,
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pendingUpdate.count({
      where: {
        projectId,
        status: "pending",
      },
    }),
    prisma.pendingUpdate.count({
      where: {
        projectId,
        status: "approved",
      },
    }),
    prisma.pendingUpdate.count({
      where: {
        projectId,
        status: "rejected",
      },
    }),
    countAutomaticForeshadowRecoveryCandidates(projectId),
    prisma.pendingUpdate.count({
      where: {
        projectId,
        status: statusFilter,
      },
    }),
  ]);

  const selectedUpdate =
    updates.find((update) => update.id === resolvedSearchParams?.updateId) ??
    updates[0];
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

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
            设定更新待确认
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            AI 只能把章节中提取到的变化放进待审核列表。只有作者点击批准后，更新才会写入正式设定、角色档案、世界规则、伏笔或时间线。
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoTile label="待审核" value={`${pendingCount} 条`} />
        <InfoTile label="已批准" value={`${approvedCount} 条`} />
        <InfoTile label="已拒绝" value={`${rejectedCount} 条`} />
      </section>

      {reviewMessage ? (
        <section
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm leading-6 ${
            reviewMessage.tone === "success"
              ? "border-signal-600/25 bg-signal-600/10 text-ink-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          <reviewMessage.Icon
            aria-hidden="true"
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              reviewMessage.tone === "success"
                ? "text-signal-600"
                : "text-red-700"
            }`}
          />
          <div>
            <p className="font-semibold text-ink-950">{reviewMessage.title}</p>
            <p>{reviewMessage.description}</p>
          </div>
        </section>
      ) : null}

      {automaticRecoveryCandidateCount > 0 ? (
        <section
          className="rounded-lg border border-signal-500/25 bg-signal-500/5 p-4"
          id="automatic-foreshadow-recovery"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-signal-600">
                自动回收识别
              </p>
              <h2 className="mt-1 text-base font-semibold text-ink-950">
                {automaticRecoveryCandidateCount} 条高置信伏笔可确认回收
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
                这些候选已绑定正式伏笔、实际回收章节和当前定稿正文证据。批量确认后才会写入正式伏笔池；来源过期或目标已处理的候选会自动跳过。
              </p>
            </div>
            <form action={approveAutomaticForeshadowRecoveryBatch.bind(null, project.id)}>
              <FormActionButton
                icon="save"
                idleLabel="批量确认回收"
                pendingLabel="正在回收伏笔..."
                statusText="正在校验正文版本并写入实际回收章节。"
                variant="dark"
              />
            </form>
          </div>
        </section>
      ) : null}

      {updates.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white p-8 text-center shadow-panel">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-paper-100 text-ink-700">
            <FilePenLine aria-hidden="true" className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ink-950">
            还没有待确认更新
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-700">
            在章节详情页保存定稿正文后，可以触发 AI 提取待审核更新。
          </p>
        </section>
      ) : (
        <section className="nf-review-workspace">
          <aside className="nf-review-list">
            <div className="nf-review-filters" aria-label="更新状态筛选">
              {[
                ["pending", "待审核", pendingCount],
                ["approved", "已批准", approvedCount],
                ["rejected", "已拒绝", rejectedCount],
              ].map(([status, label, count]) => (
                <Link
                  aria-current={statusFilter === status ? "page" : undefined}
                  className={statusFilter === status ? "is-active" : undefined}
                  href={pendingUpdateHref(project.id, String(status), 1)}
                  key={String(status)}
                >
                  {label}
                  <span>{count}</span>
                </Link>
              ))}
            </div>

            <div className="nf-review-list-items">
              {updates.map((update) => (
                <Link
                  aria-current={
                    selectedUpdate?.id === update.id ? "page" : undefined
                  }
                  className={
                    selectedUpdate?.id === update.id ? "is-active" : undefined
                  }
                  href={pendingUpdateHref(
                    project.id,
                    statusFilter,
                    page,
                    update.id,
                  )}
                  key={update.id}
                >
                  <span>
                    {pendingUpdateTargetLabel(update.targetType)} ·{" "}
                    {pendingUpdateTypeLabel(update.updateType)}
                  </span>
                  <strong>{update.title}</strong>
                  <small>
                    {update.chapter
                      ? `第 ${update.chapter.chapterNumber} 章`
                      : "未关联章节"}
                    {" · "}
                    {formatDate(update.createdAt)}
                  </small>
                </Link>
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="nf-review-pagination">
                <Link
                  aria-disabled={page <= 1}
                  href={pendingUpdateHref(
                    project.id,
                    statusFilter,
                    Math.max(1, page - 1),
                  )}
                >
                  上一页
                </Link>
                <span>
                  {page}/{totalPages}
                </span>
                <Link
                  aria-disabled={page >= totalPages}
                  href={pendingUpdateHref(
                    project.id,
                    statusFilter,
                    Math.min(totalPages, page + 1),
                  )}
                >
                  下一页
                </Link>
              </div>
            ) : null}
          </aside>

          <div className="nf-review-detail">
          {selectedUpdate ? [selectedUpdate].map((update) => {
            const isPending = update.status === "pending";
            const isHighRisk = update.riskLevel === "high";
            const isStale = Boolean(
              update.sourceTextHash &&
                !chapterSourceMatches(
                  update.sourceTextHash,
                  update.chapter?.finalText,
                ),
            );
            const automaticRecovery =
              parseAutomaticForeshadowRecoveryPayload(update.payloadJson);
            const canApproveAsNewCharacter =
              update.targetType === "character" &&
              update.updateType !== "create" &&
              !update.targetId &&
              Boolean(update.targetName?.trim());

            return (
              <article
                className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
                key={update.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className="rounded-md bg-paper-100 px-2.5 py-1 text-ink-700">
                        {pendingUpdateStatusLabel(update.status)}
                      </span>
                      <span className="rounded-md bg-paper-100 px-2.5 py-1 text-ink-700">
                        {pendingUpdateTypeLabel(update.updateType)}
                      </span>
                      <span className="rounded-md bg-paper-100 px-2.5 py-1 text-ink-700">
                        {pendingUpdateTargetLabel(update.targetType)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 ${
                          isHighRisk
                            ? "bg-red-50 text-red-700"
                            : "bg-ember-500/10 text-ember-500"
                        }`}
                      >
                        {isHighRisk ? (
                          <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
                        ) : (
                          <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {pendingUpdateRiskLabel(update.riskLevel)}
                      </span>
                      {isStale ? (
                        <span className="rounded-md bg-red-50 px-2.5 py-1 text-red-700">
                          来源已过期
                        </span>
                      ) : null}
                      {automaticRecovery ? (
                        <span className="rounded-md bg-signal-500/10 px-2.5 py-1 text-signal-700">
                          自动识别 · {automaticRecovery.confidence === "high" ? "高置信" : "需复核"}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-ink-950">
                      {update.title}
                    </h2>
                    <dl className="mt-3 grid gap-2 text-sm text-ink-700 md:grid-cols-2">
                      <Row label="影响对象" value={update.targetName || "未指定"} />
                      <Row label="字段" value={update.fieldName || "未指定"} />
                      <Row
                        label="来源章节"
                        value={
                          update.chapter
                            ? `第 ${update.chapter.chapterNumber} 章 ${update.chapter.title}`
                            : "未关联章节"
                        }
                        href={
                          update.chapter
                            ? `/projects/${project.id}/chapters/${update.chapter.id}`
                            : undefined
                        }
                      />
                      <Row label="创建时间" value={formatDate(update.createdAt)} />
                      {update.appliedAt ? (
                        <Row label="处理时间" value={formatDate(update.appliedAt)} />
                      ) : null}
                    </dl>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <TextBlock label="建议内容" value={update.proposedContent} />
                  <div className="space-y-4">
                    <TextBlock label="提取原因" value={update.reason || "未提供"} />
                    <TextBlock label="原文证据" value={update.evidence || "未提供"} />
                  </div>
                </div>

                {update.aiTask ? (
                  <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-xs leading-5 text-ink-700">
                    AI 任务：{update.aiTask.model} / {update.aiTask.inputContextSummary}
                  </p>
                ) : null}

                {update.resolutionNote ? (
                  <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-xs leading-5 text-ink-700">
                    处理备注：{update.resolutionNote}
                  </p>
                ) : null}

                {!isPending ? (
                  <p className="mt-4 rounded-md border border-ink-950/10 bg-paper-50 px-3 py-2 text-sm leading-6 text-ink-800">
                    {update.status === "approved"
                      ? "已批准：该建议已写入正式记忆，并刷新了相关项目、章节和验收页面。"
                      : "已拒绝：该建议不会写入正式记忆。"}
                  </p>
                ) : null}

                {isPending ? (
                  isStale ? (
                    <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                      关联章节的定稿正文已在提取后修改。请重新提取更新；这条旧建议仍可拒绝，但不能再批准写入正式记忆。
                    </p>
                  ) : null
                ) : null}

                {isPending ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
                    <form
                      action={approvePendingUpdate.bind(null, project.id, update.id)}
                      className="space-y-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                    >
                      <label className="block text-sm font-semibold text-ink-950">
                        编辑后批准内容
                        <textarea
                          className="mt-2 min-h-36 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-900 outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                          defaultValue={update.proposedContent}
                          name="proposedContent"
                        />
                      </label>
                      <label className="block text-sm font-semibold text-ink-950">
                        批准备注
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
                          name="resolutionNote"
                          placeholder="可选：记录为什么批准或如何编辑"
                        />
                      </label>
                      {canApproveAsNewCharacter ? (
                        <label className="flex items-start gap-3 rounded-md border border-ember-500/30 bg-ember-500/10 px-3 py-3 text-sm leading-6 text-ink-800">
                          <input
                            className="mt-1 h-4 w-4 shrink-0 accent-signal-600"
                            name="createMissingCharacter"
                            type="checkbox"
                            value="1"
                          />
                          <span>
                            <strong className="block text-ink-950">
                              作为新角色批准
                            </strong>
                            当前没有唯一匹配的正式角色。勾选后会以“
                            {update.targetName}”创建角色档案，并把本条内容写入备注。
                          </span>
                        </label>
                      ) : null}
                      <PendingUpdateReviewSubmit
                        disabled={isStale}
                        testId={`approve-pending-update-${update.id}`}
                        variant="approve"
                      />
                    </form>

                    <form
                      action={rejectPendingUpdate.bind(null, project.id, update.id)}
                      className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4"
                    >
                      <label className="block text-sm font-semibold text-red-800">
                        拒绝原因
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm leading-6 text-ink-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200"
                          name="resolutionNote"
                          placeholder="可选：记录为什么不采纳"
                        />
                      </label>
                      <PendingUpdateReviewSubmit
                        testId={`reject-pending-update-${update.id}`}
                        variant="reject"
                      />
                    </form>
                  </div>
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

function pendingUpdateReviewMessage(searchParams?: {
  approved?: string;
  review?: string;
  skipped?: string;
}) {
  const review = searchParams?.review;

  if (review === "auto-recovery-approved") {
    const approvedCount = nonNegativeInt(searchParams?.approved);
    const skippedCount = nonNegativeInt(searchParams?.skipped);

    return {
      Icon: CheckCircle2,
      description: `已将 ${approvedCount} 条高置信候选写入正式伏笔池${skippedCount > 0 ? `，另有 ${skippedCount} 条因来源过期或目标已处理而跳过` : ""}。`,
      title: "已批量确认伏笔回收",
      tone: "success" as const,
    };
  }

  if (review === "approved") {
    return {
      Icon: CheckCircle2,
      description:
        "正式设定、角色、世界规则、伏笔或时间线已按该建议更新，相关页面也已刷新。",
      title: "已写入正式记忆",
      tone: "success" as const,
    };
  }

  if (review === "rejected") {
    return {
      Icon: XCircle,
      description: "该建议已标记为拒绝，不会影响正式故事记忆。",
      title: "已拒绝该建议",
      tone: "danger" as const,
    };
  }

  if (review === "stale-source") {
    return {
      Icon: ShieldAlert,
      description:
        "生成这条建议后，关联章节的定稿正文已经修改。请重新提取待审核更新，再审核新结果。",
      title: "建议来源已过期",
      tone: "danger" as const,
    };
  }

  if (review === "target-not-found") {
    return {
      Icon: ShieldAlert,
      description:
        "该建议要更新或回收现有记忆，但没有唯一匹配的正式记录。若它是首次登场角色，可在对应建议中勾选“作为新角色批准”；其他类型请重新提取或先手动处理目标。",
      title: "没有找到唯一目标",
      tone: "danger" as const,
    };
  }

  return null;
}

function nonNegativeInt(value?: string) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function positiveInt(value?: string) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function pendingUpdateStatusFilter(value?: string) {
  return value === "approved" || value === "rejected" ? value : "pending";
}

function pendingUpdateHref(
  projectId: string,
  status: string,
  page: number,
  updateId?: string,
) {
  const query = new URLSearchParams({
    page: String(page),
    status,
  });

  if (updateId) {
    query.set("updateId", updateId);
  }

  return `/projects/${projectId}/pending-updates?${query.toString()}`;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <p className="text-sm text-ink-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function Row({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: string;
}) {
  const content = href ? (
    <Link className="font-medium text-signal-600 hover:underline" href={href}>
      {value}
    </Link>
  ) : (
    value
  );

  return (
    <div>
      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
      <dd className="mt-1 text-ink-800">{content}</dd>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap rounded-md bg-paper-50 p-3 text-sm leading-6 text-ink-800">
        {value}
      </p>
    </div>
  );
}
