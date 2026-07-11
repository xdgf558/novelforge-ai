"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileDown,
} from "lucide-react";
import {
  buildShortStoryManuscriptExport,
  shortStoryManuscriptHeadingModeOptions,
  shortStorySigningWordMaximum,
  shortStorySigningWordMinimum,
  type ShortStoryManuscriptHeadingMode,
  type ShortStoryManuscriptUnit,
} from "@/lib/short-stories/manuscript-export";

type ManuscriptExportWorkspaceProps = {
  projectId: string;
  projectTitle: string;
  targetWordCount?: number | null;
  units: ShortStoryManuscriptUnit[];
};

export function ManuscriptExportWorkspace({
  projectId,
  projectTitle,
  targetWordCount,
  units,
}: ManuscriptExportWorkspaceProps) {
  const [headingMode, setHeadingMode] =
    useState<ShortStoryManuscriptHeadingMode>("none");
  const [copyState, setCopyState] = useState<
    "copied" | "failed" | "idle"
  >("idle");
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const manuscript = useMemo(
    () =>
      buildShortStoryManuscriptExport({
        headingMode,
        projectTitle,
        units,
      }),
    [headingMode, projectTitle, units],
  );
  const canExport = Boolean(manuscript.plainText.trim());

  async function copyManuscript() {
    if (!canExport) {
      return;
    }

    try {
      await navigator.clipboard.writeText(manuscript.plainText);
      markCopyState("copied");
      return;
    } catch {
      const preview = previewRef.current;

      preview?.focus();
      preview?.select();
    }

    try {
      if (document.execCommand("copy")) {
        markCopyState("copied");
        return;
      }
    } catch {
      // Fall through to the selected-text fallback.
    }

    markCopyState("failed");
  }

  function markCopyState(state: "copied" | "failed") {
    setCopyState(state);
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  function downloadManuscript(extension: "md" | "txt") {
    const content =
      extension === "md" ? manuscript.markdown : manuscript.plainText;

    if (!content.trim()) {
      return;
    }

    const mimeType =
      extension === "md"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8";
    downloadText(
      `${manuscript.filenameBase}.${extension}`,
      content,
      mimeType,
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="成稿单元"
          value={`${manuscript.includedUnits.length} / ${units.length} 个`}
        />
        <Stat
          label="成稿字数"
          value={`${manuscript.wordCount.toLocaleString("zh-CN")} 字`}
        />
        <Stat
          label="项目目标"
          value={
            targetWordCount
              ? `${targetWordCount.toLocaleString("zh-CN")} 字`
              : "未设置"
          }
        />
        <Stat
          label="番茄签约参考"
          value={`${shortStorySigningWordMinimum.toLocaleString("zh-CN")}–${shortStorySigningWordMaximum.toLocaleString("zh-CN")} 字`}
        />
      </section>

      <section className="border-t border-ink-950/10 pt-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
              <FileDown aria-hidden="true" className="h-4 w-4" />
              成稿结构
            </div>
            <h2 className="mt-2 text-base font-semibold text-ink-950">
              单元边界
            </h2>
          </div>
          <div
            aria-label="单元边界"
            className="grid w-full grid-cols-1 gap-1 rounded-md border border-ink-950/10 bg-paper-50 p-1 sm:grid-cols-3 lg:w-auto"
            role="tablist"
          >
            {shortStoryManuscriptHeadingModeOptions.map((option) => {
              const selected = headingMode === option.value;

              return (
                <button
                  aria-selected={selected}
                  className={`min-h-10 rounded px-3 py-2 text-sm font-semibold transition ${
                    selected
                      ? "bg-ink-950 text-white shadow-sm"
                      : "text-ink-700 hover:bg-white hover:text-ink-950"
                  }`}
                  key={option.value}
                  onClick={() => setHeadingMode(option.value)}
                  role="tab"
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-ink-700">
          {
            shortStoryManuscriptHeadingModeOptions.find(
              (option) => option.value === headingMode,
            )?.description
          }
        </p>
      </section>

      <section className="rounded-md border border-ink-950/10 bg-paper-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink-950">导出检查</h2>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              字数范围只作签约参考，不阻止本地导出。
            </p>
          </div>
          <RangeBadge
            above={manuscript.validation.isAboveSigningRange}
            below={manuscript.validation.isBelowSigningRange}
            within={manuscript.validation.isWithinSigningRange}
          />
        </div>

        {manuscript.validation.messages.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {manuscript.validation.messages.map((message) => (
              <li
                className="flex gap-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700"
                key={message}
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-amber-600"
                />
                {message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex gap-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700">
            <CheckCircle2
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-signal-600"
            />
            所有写作单元均已纳入，当前字数位于参考范围内。
          </p>
        )}

        {manuscript.omittedUnits.length > 0 ? (
          <details className="mt-3 border-t border-ink-950/10 pt-3">
            <summary className="cursor-pointer text-xs font-semibold text-ink-700">
              查看未纳入单元（{manuscript.omittedUnits.length}）
            </summary>
            <div className="mt-3 grid gap-2">
              {manuscript.omittedUnits.map((unit) => (
                <Link
                  className="flex flex-col gap-1 rounded-md bg-white px-3 py-2 text-sm text-ink-700 transition hover:text-signal-700 sm:flex-row sm:items-center sm:justify-between"
                  href={`/projects/${projectId}/chapters/${unit.id}/edit`}
                  key={unit.id}
                >
                  <span className="font-semibold text-ink-950">
                    单元 {unit.chapterNumber}《{unit.title}》
                  </span>
                  <span>{omittedReasonLabel(unit.reason)}</span>
                </Link>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      <section className="border-t border-ink-950/10 pt-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-950">完整正文</h2>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              复制和 TXT 不含作品名；Markdown 以作品名作为一级标题。上传番茄仍由作者手动完成。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canExport}
              onClick={copyManuscript}
              type="button"
            >
              {copyState === "copied" ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Clipboard aria-hidden="true" className="h-4 w-4" />
              )}
              {copyState === "copied" ? "已复制" : "复制全文"}
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canExport}
              onClick={() => downloadManuscript("txt")}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              下载 TXT
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-signal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-signal-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canExport}
              onClick={() => downloadManuscript("md")}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              下载 Markdown
            </button>
          </div>
        </div>

        {copyState === "failed" ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            自动复制失败，预览正文已选中，请手动复制。
          </p>
        ) : null}

        <textarea
          aria-label="完整短故事正文预览"
          className="mt-4 min-h-[32rem] w-full resize-y rounded-md border border-ink-950/10 bg-paper-50 p-4 font-mono text-sm leading-7 text-ink-800 outline-none"
          readOnly
          ref={previewRef}
          value={manuscript.plainText}
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-950/10 bg-white p-4 shadow-panel">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function RangeBadge({
  above,
  below,
  within,
}: {
  above: boolean;
  below: boolean;
  within: boolean;
}) {
  const label = within ? "范围内" : above ? "高于范围" : below ? "低于范围" : "待组装";

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
        within
          ? "bg-signal-600/10 text-signal-700"
          : "bg-amber-100 text-amber-900"
      }`}
    >
      {label}
    </span>
  );
}

function omittedReasonLabel(
  reason: "empty_after_cleanup" | "missing_final_text" | "not_confirmed",
) {
  return {
    empty_after_cleanup: "清理后没有可导出正文",
    missing_final_text: "缺少定稿正文",
    not_confirmed: "状态尚未定稿",
  }[reason];
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
