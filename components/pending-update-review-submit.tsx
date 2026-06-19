"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type PendingUpdateReviewSubmitProps = {
  variant: "approve" | "reject";
  testId: string;
};

export function PendingUpdateReviewSubmit({
  variant,
  testId,
}: PendingUpdateReviewSubmitProps) {
  const { pending } = useFormStatus();
  const isApprove = variant === "approve";
  const Icon = pending ? Loader2 : isApprove ? CheckCircle2 : XCircle;
  const idleLabel = isApprove ? "批准写入正式记忆" : "拒绝";
  const pendingLabel = isApprove ? "正在写入正式记忆..." : "正在拒绝...";
  const helperText = isApprove
    ? "正在写入正式记忆，完成后页面会自动刷新。"
    : "正在保存拒绝结果，完成后页面会自动刷新。";
  const className = isApprove
    ? "bg-ink-950 text-white hover:bg-ink-800 disabled:cursor-wait disabled:bg-ink-800/80"
    : "bg-red-700 text-white hover:bg-red-800 disabled:cursor-wait disabled:bg-red-700/75";

  return (
    <div className="space-y-2">
      <button
        aria-disabled={pending}
        className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition disabled:opacity-80 ${className}`}
        data-testid={testId}
        disabled={pending}
        type="submit"
      >
        <Icon
          aria-hidden="true"
          className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
        />
        {pending ? pendingLabel : idleLabel}
      </button>
      {pending ? (
        <p
          className="text-xs leading-5 text-ink-700"
          role="status"
          aria-live="polite"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
