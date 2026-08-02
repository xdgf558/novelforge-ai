"use client";

import { useMemo, useState } from "react";
import { ClipboardPenLine } from "lucide-react";
import { parseOutlineDraftCopyResult } from "@/lib/outline-draft-copy";
import { storeOutlineDraftCopySuggestion } from "@/lib/outline-draft-copy-handoff";

type OutlineDraftCopyButtonProps = {
  inputContextSummary?: string | null;
  outputText?: string | null;
};

export function OutlineDraftCopyButton({
  inputContextSummary,
  outputText,
}: OutlineDraftCopyButtonProps) {
  const [feedback, setFeedback] = useState("");
  const parseResult = useMemo(
    () =>
      parseOutlineDraftCopyResult({
        inputContextSummary,
        outputText,
      }),
    [inputContextSummary, outputText],
  );
  const suggestion = parseResult.suggestion;

  const handleCopyToForm = () => {
    if (!suggestion) {
      setFeedback("没有识别到可填入的字段。");
      return;
    }

    try {
      storeOutlineDraftCopySuggestion(
        window.sessionStorage,
        window.location.pathname,
        suggestion,
      );
      setFeedback("正在打开正式大纲表单…");
      window.location.hash = "quick-create-outlines";
    } catch {
      setFeedback("无法暂存大纲草案，请刷新页面后重试。");
    }
  };

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
          suggestion
            ? "border-ink-950/15 bg-white text-ink-800 hover:bg-paper-100"
            : "cursor-not-allowed border-ink-950/10 bg-paper-100 text-ink-500"
        }`}
        disabled={!suggestion}
        onClick={handleCopyToForm}
        type="button"
      >
        <ClipboardPenLine aria-hidden="true" className="h-3.5 w-3.5" />
        复制到表单
      </button>
      {feedback ? (
        <p className="max-w-48 text-xs leading-5 text-ink-700">{feedback}</p>
      ) : parseResult.errorMessage ? (
        <p className="max-w-64 text-xs leading-5 text-amber-800">
          {parseResult.errorMessage}
        </p>
      ) : null}
    </div>
  );
}
