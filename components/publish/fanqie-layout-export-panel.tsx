"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
} from "lucide-react";
import { resolveFanqieLayoutInitialChapterId } from "@/components/publish/fanqie-layout-selection";
import {
  buildFanqieLayoutExport,
  fanqieLayoutTemplateOptions,
  selectFanqieLayoutSource,
  type FanqieLayoutChapter,
  type FanqieLayoutTemplate,
  type FanqieSourceKind,
} from "@/lib/fanqie-layout-export";
import { createStoredTextZip } from "@/lib/stored-zip";

export type FanqieLayoutChapterOption = FanqieLayoutChapter;

type FanqieLayoutExportPanelProps = {
  chapters: FanqieLayoutChapterOption[];
  initialChapterId?: string | string[] | null;
  projectTitle: string;
};

const sourceOptions: {
  description: string;
  label: string;
  value: FanqieSourceKind;
}[] = [
  {
    description: "优先使用精修正文，其次定稿正文，最后草稿正文。",
    label: "自动：精修 → 定稿 → 草稿",
    value: "auto",
  },
  {
    description: "只读取草稿正文。",
    label: "草稿正文",
    value: "draft",
  },
  {
    description: "只读取定稿正文。",
    label: "定稿正文",
    value: "final",
  },
  {
    description: "只读取精修正文。",
    label: "精修正文",
    value: "polished",
  },
];

const targetWordCountOptions = [
  { label: "3000 字", value: "3000" },
  { label: "4000 字", value: "4000" },
  { label: "5000 字", value: "5000" },
  { label: "自定义", value: "custom" },
] as const;

export function FanqieLayoutExportPanel({
  chapters,
  initialChapterId,
  projectTitle,
}: FanqieLayoutExportPanelProps) {
  const defaultChapterId = resolveFanqieLayoutInitialChapterId(
    chapters,
    initialChapterId,
  );
  const [selectedChapterId, setSelectedChapterId] = useState(defaultChapterId);
  const [sourceKind, setSourceKind] = useState<FanqieSourceKind>("auto");
  const [template, setTemplate] = useState<FanqieLayoutTemplate>("body");
  const [targetWordPreset, setTargetWordPreset] = useState("4000");
  const [customTargetWordCount, setCustomTargetWordCount] = useState("4000");
  const [includeTitle, setIncludeTitle] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const targetWordCount =
    targetWordPreset === "custom"
      ? Number(customTargetWordCount)
      : Number(targetWordPreset);
  const selectedChapter =
    chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0];
  const layoutExport = useMemo(() => {
    if (!selectedChapter) {
      return null;
    }

    return buildFanqieLayoutExport({
      chapter: selectedChapter,
      includeTitle,
      projectTitle,
      sourceKind,
      targetWordCount,
      template,
    });
  }, [
    includeTitle,
    projectTitle,
    selectedChapter,
    sourceKind,
    targetWordCount,
    template,
  ]);
  const selectedTemplateOption =
    fanqieLayoutTemplateOptions.find((option) => option.value === template) ??
    fanqieLayoutTemplateOptions[0];
  const selectedSourceOption =
    sourceOptions.find((option) => option.value === sourceKind) ??
    sourceOptions[0];
  const previewDescription = includeTitle
    ? "包含章节标题，适合需要标题与正文一起复制的手动粘贴场景。"
    : selectedTemplateOption.description;
  const isSplitTemplate = template === "split_txt";
  const canExport = Boolean(layoutExport?.plainText.trim());
  const canDownloadSplitZip = Boolean(
    isSplitTemplate && layoutExport?.splitParts.length,
  );

  useEffect(() => {
    setSelectedChapterId(defaultChapterId);
  }, [defaultChapterId]);

  async function copyCurrentText() {
    if (!layoutExport) {
      return;
    }

    try {
      await navigator.clipboard.writeText(layoutExport.plainText);
      markCopyState("copied");
      return;
    } catch {
      const preview = previewRef.current;

      if (preview) {
        preview.focus();
        preview.select();
      }
    }

    try {
      if (document.execCommand("copy")) {
        markCopyState("copied");
        return;
      }
    } catch {
      // Fall through to the manual-copy hint below.
    }

    markCopyState("failed");
  }

  function markCopyState(state: "copied" | "failed") {
    setCopyState(state);
    window.setTimeout(() => setCopyState("idle"), 2200);
  }

  function downloadText() {
    if (!layoutExport?.plainText) {
      return;
    }

    download(
      `${layoutExport.filenameBase}.txt`,
      layoutExport.plainText,
      "text/plain;charset=utf-8",
    );
  }

  function downloadSplitZip() {
    if (!layoutExport?.splitParts.length) {
      return;
    }

    const zip = createStoredTextZip([
      {
        content: layoutExport.manifest,
        path: "拆分清单.md",
      },
      ...layoutExport.splitParts.map((part) => ({
        content: part.body,
        path: part.fileName,
      })),
    ]);

    download(
      `${layoutExport.filenameBase}-split.zip`,
      zip,
      "application/zip",
    );
  }

  if (chapters.length === 0) {
    return (
      <section
        className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
        id="fanqie-layout-export"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
          <FileText aria-hidden="true" className="h-4 w-4" />
          番茄小说导出
        </div>
        <h2 className="mt-2 text-base font-semibold text-ink-950">
          正文粘贴版
        </h2>
        <p className="mt-2 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-4 text-sm leading-6 text-ink-700">
          还没有可导出的章节。保存草稿、精修正文或定稿正文后，这里会按“精修正文 → 定稿正文 → 草稿正文”的顺序自动读取。
        </p>
      </section>
    );
  }

  return (
    <section
      className="min-w-0 space-y-3 rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
      id="fanqie-layout-export"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <FileText aria-hidden="true" className="h-4 w-4" />
            番茄小说导出
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            {selectedTemplateOption.label}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            自动读取章节正文并做确定性格式整理，只生成可复制和下载的番茄正文，不改写章节、不写回正式正文，也不自动上传。
          </p>
        </div>
        <div className="w-full rounded-md border border-signal-600/20 bg-paper-50 px-3 py-2 text-xs leading-5 text-ink-700 xl:w-auto xl:max-w-56">
          当前来源：
          <span className="font-semibold text-ink-950">
            {layoutExport?.source?.label ?? "无正文"}
          </span>
          {layoutExport ? ` / ${layoutExport.wordCount.toLocaleString()} 字` : ""}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">章节</span>
          <select
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
            onChange={(event) => setSelectedChapterId(event.target.value)}
            value={selectedChapterId}
          >
            {chapters.map((chapter) => {
              const source = selectFanqieLayoutSource(chapter);

              return (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.chapterNumber ? `第 ${chapter.chapterNumber} 章 ` : ""}
                  {chapter.title} / {source?.label ?? "无正文"}
                </option>
              );
            })}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">正文来源</span>
          <select
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
            onChange={(event) =>
              setSourceKind(event.target.value as FanqieSourceKind)
            }
            value={sourceKind}
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">导出模板</span>
          <select
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
            onChange={(event) =>
              setTemplate(event.target.value as FanqieLayoutTemplate)
            }
            value={template}
          >
            {fanqieLayoutTemplateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">目标字数</span>
          <div className="flex gap-2">
            <select
              className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
              onChange={(event) => setTargetWordPreset(event.target.value)}
              value={targetWordPreset}
            >
              {targetWordCountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {targetWordPreset === "custom" ? (
              <input
                className="min-h-10 w-24 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
                inputMode="numeric"
                min={500}
                onChange={(event) => setCustomTargetWordCount(event.target.value)}
                type="number"
                value={customTargetWordCount}
              />
            ) : null}
          </div>
        </label>

        <label className="flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-paper-50 px-3 py-2 text-sm text-ink-800">
          <input
            checked={includeTitle}
            className="h-4 w-4 rounded border-ink-950/20"
            onChange={(event) => setIncludeTitle(event.target.checked)}
            type="checkbox"
          />
          正文内包含标题
        </label>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <InfoBlock label="导出模板" value={selectedTemplateOption.label} />
        <InfoBlock label="来源规则" value={selectedSourceOption.description} />
        <InfoBlock
          label="目标字数"
          value={`${displayTargetWordCount(targetWordCount)} 字 / 允许约 20% 浮动`}
        />
        <InfoBlock
          label="标题策略"
          value={includeTitle ? "正文开头包含章节标题" : "正文默认不含章节标题"}
        />
      </div>

      <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950">导出校验</p>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              校验只提示，不会阻止复制或下载；没有正文时除外。
            </p>
          </div>
          <p className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
            {layoutExport?.validation.sourceLabel ?? "无正文"} /{" "}
            {layoutExport?.validation.wordCount.toLocaleString() ?? 0} 字
            {isSplitTemplate && layoutExport?.validation.splitCount
              ? ` / ${layoutExport.validation.splitCount} 个 TXT`
              : ""}
          </p>
        </div>

        {layoutExport?.validation.messages.length ? (
          <ul className="mt-3 space-y-2">
            {layoutExport.validation.messages.map((message) => (
              <li
                className="flex gap-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700"
                key={message}
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-amber-600"
                />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex gap-2 rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700">
            <CheckCircle2
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-signal-600"
            />
            当前导出没有检测到需要提示的格式风险。
          </p>
        )}
      </div>

      <div className="rounded-lg border border-ink-950/10 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-950">正文预览</p>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              {previewDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canExport}
              onClick={copyCurrentText}
              type="button"
            >
              {copyState === "copied" ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Clipboard aria-hidden="true" className="h-4 w-4" />
              )}
              {copyState === "copied" ? "已复制" : "复制正文"}
            </button>
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-700"
              disabled={!canExport}
              onClick={downloadText}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {isSplitTemplate ? "下载单章 TXT" : "下载 TXT"}
            </button>
            {isSplitTemplate ? (
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-signal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-signal-700 disabled:cursor-not-allowed disabled:bg-signal-600/50"
                disabled={!canDownloadSplitZip}
                onClick={downloadSplitZip}
                type="button"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                下载拆分 ZIP
              </button>
            ) : null}
          </div>
        </div>

        {copyState === "failed" ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            复制失败，已为你选中预览框内容，请手动按 Cmd+C 复制。
          </p>
        ) : null}

        {!canExport ? (
          <p className="mt-3 rounded-md border border-dashed border-ink-950/20 bg-paper-50 px-3 py-3 text-sm leading-6 text-ink-700">
            当前来源没有正文。请选择其他来源，或先在章节编辑页保存草稿、精修正文或定稿正文。
          </p>
        ) : null}

        <textarea
          className="mt-3 min-h-56 w-full resize-y rounded-md border border-ink-950/10 bg-paper-50 p-3 font-mono text-xs leading-6 text-ink-800 outline-none"
          readOnly
          ref={previewRef}
          value={layoutExport?.plainText ?? ""}
        />
      </div>

      {isSplitTemplate && layoutExport ? (
        <div className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-950">拆分清单</p>
              <p className="mt-1 text-xs leading-5 text-ink-700">
                ZIP 会包含拆分清单和每个 TXT 文件。正文文件默认不含标题，除非勾选“正文内包含标题”。
              </p>
            </div>
            <p className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
              {layoutExport.splitParts.length} 个文件
            </p>
          </div>

          {layoutExport.splitParts.length ? (
            <div className="mt-3 grid gap-2">
              {layoutExport.splitParts.map((part) => (
                <div
                  className="grid gap-2 rounded-md bg-white px-3 py-2 text-sm text-ink-800 sm:grid-cols-[minmax(160px,1fr)_auto_auto]"
                  key={part.fileName}
                >
                  <span className="font-semibold text-ink-950">
                    第 {part.chapterNumber} 章《{part.title}》
                  </span>
                  <span>{part.wordCount.toLocaleString()} 字</span>
                  <span className="font-mono text-xs text-ink-600">
                    {part.fileName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-ink-950/20 bg-white px-3 py-3 text-sm leading-6 text-ink-700">
              当前来源没有可拆分正文。请选择其他来源，或先保存章节正文。
            </p>
          )}

          {layoutExport.manifest ? (
            <pre className="mt-3 max-h-56 overflow-auto rounded-md border border-ink-950/10 bg-white p-3 text-xs leading-6 text-ink-800">
              {layoutExport.manifest}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-ink-950/10 bg-paper-50 px-3 py-2">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink-950">
        {value || "未设置"}
      </p>
    </div>
  );
}

function download(filename: string, content: BlobPart, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function displayTargetWordCount(value: number) {
  if (!Number.isFinite(value)) {
    return 4000;
  }

  return Math.min(20000, Math.max(500, Math.round(value)));
}
