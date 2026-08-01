import Link from "next/link";
import { Archive, CheckCircle2, CircleAlert, FileCheck2 } from "lucide-react";
import { completeAndArchiveProject } from "@/app/projects/actions";
import { FormActionButton } from "@/components/form-action-button";
import { formatNumber } from "@/lib/format";
import type { ProjectCompletionReadiness } from "@/lib/projects/completion";

type ProjectCompletionPanelProps = {
  notice?: "already-finished" | "not-ready" | "unsupported" | null;
  projectId: string;
  readiness: ProjectCompletionReadiness;
  status: string;
};

export function ProjectCompletionPanel({
  notice,
  projectId,
  readiness,
  status,
}: ProjectCompletionPanelProps) {
  if (status === "completed") {
    return (
      <section
        className="nf-project-completion-panel"
        data-state="completed"
        aria-labelledby="project-completion-title"
      >
        <div className="nf-project-completion-icon" aria-hidden="true">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="nf-project-completion-eyebrow">作品状态</p>
          <h2 id="project-completion-title">作品已完结并收录至归档目录</h2>
          <p>
            已保留全部章节、设定、记忆与任务记录；需要继续创作时，可在项目编辑页恢复为连载。
          </p>
        </div>
        <Link className="nf-secondary-button" href="/?projectStatus=archived">
          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
          查看归档目录
        </Link>
      </section>
    );
  }

  if (status !== "active" || (!readiness.targetReached && !notice)) {
    return null;
  }

  const isReady = readiness.canCompleteAndArchive;
  const pendingReason = completionPendingReason(readiness);

  return (
    <section
      className="nf-project-completion-panel"
      data-state={isReady ? "ready" : "blocked"}
      aria-labelledby="project-completion-title"
    >
      <div className="nf-project-completion-icon" aria-hidden="true">
        {isReady ? (
          <FileCheck2 className="h-4 w-4" />
        ) : (
          <CircleAlert className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="nf-project-completion-eyebrow">完结归档</p>
        <h2 id="project-completion-title">
          {isReady
            ? "已满足完结条件"
            : readiness.targetReached
              ? "已达到字数目标，等待正式完结"
              : "完结条件已发生变化"}
        </h2>
        <p>
          确认正文 {formatNumber(readiness.confirmedWords)} / {formatNumber(readiness.targetWords)} 字
          ，{readiness.confirmedChapterCount} / {readiness.totalChapterCount} 章已确认。
        </p>
        {notice ? <p className="nf-project-completion-notice">{completionNotice(notice)}</p> : null}
        {!isReady ? <p className="nf-project-completion-notice">{pendingReason}</p> : null}
      </div>
      {isReady ? (
        <form
          action={completeAndArchiveProject.bind(null, projectId)}
          className="shrink-0"
        >
          <FormActionButton
            className="nf-project-completion-submit"
            icon="archive"
            idleLabel="完结并归档"
            pendingLabel="正在归档..."
            statusText="正在再次核验定稿正文与字数目标。"
            variant="primary"
          />
        </form>
      ) : null}
    </section>
  );
}

function completionPendingReason(readiness: ProjectCompletionReadiness) {
  const reasons = [];

  if (readiness.unsettledChapterCount > 0) {
    reasons.push(`${readiness.unsettledChapterCount} 章尚未定稿或发布`);
  }

  if (readiness.missingFinalTextCount > 0) {
    reasons.push(`${readiness.missingFinalTextCount} 章缺少定稿正文`);
  }

  return reasons.length > 0
    ? `完成这些检查后即可归档：${reasons.join("；")}。`
    : "完成条件已变化，请刷新后再试。";
}

function completionNotice(notice: NonNullable<ProjectCompletionPanelProps["notice"]>) {
  if (notice === "already-finished") {
    return "项目状态已发生变化，页面已按当前记录更新。";
  }

  if (notice === "unsupported") {
    return "只有长篇连载可以通过此流程完结归档。";
  }

  return "完成条件已发生变化。请确认所有章节均已定稿或发布，且确认正文字数达到目标后再试。";
}
