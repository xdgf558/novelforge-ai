"use client";

import { useMemo, useState } from "react";
import { Clipboard, Download } from "lucide-react";

type CopyExportPanelProps = {
  title: string;
  content: string;
  filename: string;
  mimeType?: string;
  rows?: number;
};

export function CopyExportPanel({
  title,
  content,
  filename,
  mimeType = "text/markdown;charset=utf-8",
  rows = 10,
}: CopyExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const previewId = useMemo(
    () => `copy-export-${filename.replace(/[^a-z0-9_-]+/gi, "-")}`,
    [filename],
  );

  async function copyContent() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadContent() {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            onClick={copyContent}
            type="button"
          >
            <Clipboard aria-hidden="true" className="h-4 w-4" />
            {copied ? "已复制" : "复制"}
          </button>
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            onClick={downloadContent}
            type="button"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            下载
          </button>
        </div>
      </div>
      <textarea
        aria-label={title}
        className="mt-3 min-h-32 w-full resize-y rounded-md border border-ink-950/10 bg-paper-50 p-3 font-mono text-xs leading-6 text-ink-800 outline-none"
        id={previewId}
        readOnly
        rows={rows}
        value={content}
      />
    </div>
  );
}
