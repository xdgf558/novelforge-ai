"use client";

import { Loader2, UploadCloud } from "lucide-react";
import { useFormStatus } from "react-dom";

type PublishSubmitButtonProps = {
  disabled?: boolean;
  idleLabel: string;
  pendingLabel?: string;
};

export function PublishSubmitButton({
  disabled = false,
  idleLabel,
  pendingLabel = "正在发送...",
}: PublishSubmitButtonProps) {
  const { pending } = useFormStatus();
  const Icon = pending ? Loader2 : UploadCloud;
  const isDisabled = disabled || pending;
  const disabledClass = pending ? "cursor-wait" : "cursor-not-allowed";

  return (
    <div className="space-y-2">
      <button
        aria-busy={pending}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
          isDisabled
            ? `${disabledClass} border border-ink-950/15 bg-paper-50 text-ink-700`
            : "bg-ink-950 text-white hover:bg-ink-800"
        }`}
        disabled={isDisabled}
        type="submit"
      >
        <Icon
          aria-hidden="true"
          className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
        />
        {pending ? pendingLabel : idleLabel}
      </button>
      {pending ? (
        <p className="text-xs leading-5 text-ink-700" role="status">
          正在提交到 Station Cat，完成后页面会自动刷新显示结果。
        </p>
      ) : null}
    </div>
  );
}
