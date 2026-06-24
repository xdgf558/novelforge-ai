"use client";

import { useState } from "react";

export function PromptTemplateCopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"copied" | "failed" | "idle">("idle");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="inline-flex min-h-9 items-center rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
        onClick={copyText}
        type="button"
      >
        复制模板全文
      </button>
      {status === "copied" ? (
        <span className="text-xs font-semibold text-signal-700">已复制</span>
      ) : null}
      {status === "failed" ? (
        <span className="text-xs font-semibold text-red-700">
          复制失败，请手动选中文本。
        </span>
      ) : null}
    </div>
  );
}
