"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileCode2,
  FileText,
  Sparkles,
} from "lucide-react";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import { resolveWechatLayoutInitialChapterId } from "@/components/publish/wechat-layout-selection";
import {
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import { parseWechatLayoutCandidateOutput } from "@/lib/ai/wechat-layout-candidates";
import {
  buildWechatLayoutExport,
  defaultWechatEndingFollowHook,
  defaultWechatOpeningGuide,
  defaultWechatPublishTitle,
  selectWechatLayoutSource,
  wechatLayoutTemplateOptions,
  type WechatLayoutChapter,
  type WechatLayoutTemplate,
} from "@/lib/wechat-layout-export";

export type WechatLayoutChapterOption = WechatLayoutChapter;

type WechatLayoutCandidateTask = {
  chapterId?: string | null;
  createdAt: string;
  errorMessage?: string | null;
  id: string;
  inputContextSummary: string;
  model: string;
  outputText?: string | null;
  promptTemplate?: {
    key?: string;
    name: string;
    version: number;
  } | null;
  status: string;
};

type WechatLayoutExportPanelProps = {
  candidateTasks: readonly WechatLayoutCandidateTask[];
  chapters: WechatLayoutChapterOption[];
  generateAction: (chapterId: string) => Promise<void>;
  hasApiKey: boolean;
  initialChapterId?: string | null;
  projectTitle: string;
};

export function WechatLayoutExportPanel({
  candidateTasks,
  chapters,
  generateAction,
  hasApiKey,
  initialChapterId,
  projectTitle,
}: WechatLayoutExportPanelProps) {
  const defaultChapterId = resolveWechatLayoutInitialChapterId(
    chapters,
    initialChapterId,
  );
  const [selectedChapterId, setSelectedChapterId] = useState(defaultChapterId);
  const [template, setTemplate] = useState<WechatLayoutTemplate>("body");
  const [authorName, setAuthorName] = useState("");
  const selectedChapter =
    chapters.find((chapter) => chapter.id === selectedChapterId) ?? chapters[0];
  const [publishTitle, setPublishTitle] = useState(
    selectedChapter ? defaultWechatPublishTitle(selectedChapter) : "",
  );
  const [openingGuide, setOpeningGuide] = useState(
    selectedChapter
      ? defaultWechatOpeningGuide({ chapter: selectedChapter, projectTitle })
      : "",
  );
  const [endingFollowHook, setEndingFollowHook] = useState(
    defaultWechatEndingFollowHook(),
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const previewRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSelectedChapterId(defaultChapterId);
  }, [defaultChapterId]);

  useEffect(() => {
    if (!selectedChapter) {
      return;
    }

    setPublishTitle(defaultWechatPublishTitle(selectedChapter));
    setOpeningGuide(
      defaultWechatOpeningGuide({ chapter: selectedChapter, projectTitle }),
    );
    setEndingFollowHook(defaultWechatEndingFollowHook());
  }, [projectTitle, selectedChapter]);

  const layoutExport = useMemo(() => {
    if (!selectedChapter) {
      return null;
    }

    return buildWechatLayoutExport({
      authorName,
      chapter: selectedChapter,
      endingFollowHook,
      openingGuide,
      projectTitle,
      publishTitle,
      template,
    });
  }, [
    authorName,
    endingFollowHook,
    openingGuide,
    projectTitle,
    publishTitle,
    selectedChapter,
    template,
  ]);
  const selectedCandidateTasks = useMemo(
    () =>
      selectedChapter
        ? candidateTasks.filter((task) => task.chapterId === selectedChapter.id)
        : [],
    [candidateTasks, selectedChapter],
  );
  const latestCandidateTask = selectedCandidateTasks[0] ?? null;
  const latestCompletedCandidateTask =
    selectedCandidateTasks.find(
      (task) => task.status === "completed" && task.outputText?.trim(),
    ) ?? null;
  const hasActiveCandidateTask = selectedCandidateTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const generatedCandidate = parseWechatLayoutCandidateOutput(
    latestCompletedCandidateTask?.outputText,
  );
  const canGenerateCandidate =
    Boolean(hasApiKey && selectedChapter && layoutExport?.source) &&
    !hasActiveCandidateTask;
  const filenameBase = safeFilename(
    `${projectTitle || "novelforge"}-${
      selectedChapter?.chapterNumber
        ? `chapter-${selectedChapter.chapterNumber}`
        : "chapter"
    }-wechat`,
  );

  function applyGeneratedCandidate(
    field: "all" | "title" | "opening" | "ending",
  ) {
    if (!generatedCandidate) {
      return;
    }

    if (
      (field === "all" || field === "title") &&
      generatedCandidate.selectedTitle
    ) {
      setPublishTitle(generatedCandidate.selectedTitle);
    }

    if (
      (field === "all" || field === "opening") &&
      generatedCandidate.openingGuide
    ) {
      setOpeningGuide(generatedCandidate.openingGuide);
    }

    if (
      (field === "all" || field === "ending") &&
      generatedCandidate.endingFollowHook
    ) {
      setEndingFollowHook(generatedCandidate.endingFollowHook);
    }
  }

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

  function download(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (chapters.length === 0) {
    return (
      <section
        className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
        id="wechat-layout-export"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
          <FileText aria-hidden="true" className="h-4 w-4" />
          公众号排版导出
        </div>
        <h2 className="mt-2 text-base font-semibold text-ink-950">
          只排版，不改文
        </h2>
        <p className="mt-2 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-4 text-sm leading-6 text-ink-700">
          还没有可导出的章节。保存草稿、精修正文或定稿正文后，这里会按“精修正文 → 定稿正文 → 草稿正文”的顺序自动读取。
        </p>
      </section>
    );
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id="wechat-layout-export"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <FileText aria-hidden="true" className="h-4 w-4" />
            公众号排版导出
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink-950">
            只排版，不改文
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-700">
            自动读取精修正文、定稿正文或草稿正文，整理段落空行、分节标题和重复章标题。默认只排版、不改文；开头和结尾可在这里单独生成候选后手动套用。
          </p>
        </div>
        <div className="rounded-md border border-signal-600/20 bg-paper-50 px-3 py-2 text-xs leading-5 text-ink-700">
          当前来源：
          <span className="font-semibold text-ink-950">
            {layoutExport?.source?.label ?? "无正文"}
          </span>
          {layoutExport ? ` / ${layoutExport.wordCount.toLocaleString()} 字` : ""}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(170px,220px)]">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">章节</span>
          <select
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
            onChange={(event) => setSelectedChapterId(event.target.value)}
            value={selectedChapterId}
          >
            {chapters.map((chapter) => {
              const source = selectWechatLayoutSource(chapter);

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
          <span className="text-xs font-semibold text-ink-700">模板类型</span>
          <select
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
            onChange={(event) =>
              setTemplate(event.target.value as WechatLayoutTemplate)
            }
            value={template}
          >
            {wechatLayoutTemplateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">作者署名</span>
          <input
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="完整发布版使用"
            value={authorName}
          />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1.5 lg:col-span-2">
          <span className="text-xs font-semibold text-ink-700">发布标题</span>
          <input
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950"
            onChange={(event) => setPublishTitle(event.target.value)}
            value={publishTitle}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">开头引导语</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950"
            onChange={(event) => setOpeningGuide(event.target.value)}
            value={openingGuide}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-700">结尾追更钩子</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950"
            onChange={(event) => setEndingFollowHook(event.target.value)}
            value={endingFollowHook}
          />
        </label>
      </div>

      <div className="space-y-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950">
              AI 生成开头 / 结尾候选
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              直接根据当前章节来源生成标题、开头引导语和结尾追更钩子。结果只进入任务记录，点击套用才会填入上方表单。
            </p>
            {latestCandidateTask ? (
              <p className="mt-2 text-xs leading-5 text-ink-700">
                最近任务：{aiTaskStatusLabel(latestCandidateTask.status)} /{" "}
                {latestCandidateTask.model}
                {latestCandidateTask.promptTemplate
                  ? ` / ${latestCandidateTask.promptTemplate.name} v${latestCandidateTask.promptTemplate.version}`
                  : ""}{" "}
                / {formatLocalDate(latestCandidateTask.createdAt)}
              </p>
            ) : null}
          </div>

          <PreserveScrollForm
            action={
              selectedChapter
                ? generateAction.bind(null, selectedChapter.id)
                : undefined
            }
            preserveKey={`wechat-layout-candidate-${selectedChapter?.id ?? "none"}`}
            statusText="已开始生成公众号开头/结尾候选，页面会留在当前位置并自动刷新结果。"
          >
            <button
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                canGenerateCandidate
                  ? "bg-ink-950 text-white hover:bg-ink-800"
                  : "cursor-not-allowed border border-ink-950/10 bg-white text-ink-600"
              }`}
              disabled={!canGenerateCandidate}
              type="submit"
            >
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              {hasActiveCandidateTask ? "生成中" : "生成候选"}
            </button>
          </PreserveScrollForm>
        </div>

        {!hasApiKey ? (
          <p className="rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700">
            未配置 API Key，暂不能生成新候选；已有候选仍可套用。
          </p>
        ) : null}

        {hasActiveCandidateTask ? (
          <p className="rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700">
            当前章节的排版候选正在后台生成，完成前不会重复发起模型调用。
          </p>
        ) : null}

        {latestCandidateTask?.status === "failed" ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
            候选生成失败：
            {latestCandidateTask.errorMessage || "模型调用未返回可用结果。"}
          </p>
        ) : null}

        {generatedCandidate ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <CandidatePreview
              actionLabel="套用标题"
              label="标题候选"
              onApply={() => applyGeneratedCandidate("title")}
              value={
                generatedCandidate.selectedTitle ||
                generatedCandidate.titleCandidates.join("\n")
              }
            />
            <CandidatePreview
              actionLabel="套用开头"
              label="开头引导语"
              onApply={() => applyGeneratedCandidate("opening")}
              value={generatedCandidate.openingGuide}
            />
            <CandidatePreview
              actionLabel="套用结尾"
              label="结尾追更钩子"
              onApply={() => applyGeneratedCandidate("ending")}
              value={generatedCandidate.endingFollowHook}
            />
            <div className="lg:col-span-3">
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                onClick={() => applyGeneratedCandidate("all")}
                type="button"
              >
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                一键套用标题、开头和结尾
              </button>
            </div>
          </div>
        ) : latestCompletedCandidateTask ? (
          <p className="rounded-md bg-white px-3 py-2 text-sm leading-6 text-ink-700">
            最近候选任务已完成，但输出无法解析为标题、开头或结尾字段，请展开任务记录检查模型输出。
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-ink-950/10 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-950">排版预览</p>
            <p className="mt-1 text-xs leading-5 text-ink-700">
              {wechatLayoutTemplateOptions.find((item) => item.value === template)
                ?.description ?? ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              disabled={!layoutExport?.plainText}
              onClick={copyCurrentText}
              type="button"
            >
              {copyState === "copied" ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Clipboard aria-hidden="true" className="h-4 w-4" />
              )}
              {copyState === "copied" ? "已复制" : "一键复制正文"}
            </button>
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-700"
              disabled={!layoutExport?.plainText}
              onClick={() =>
                layoutExport
                  ? download(
                      `${filenameBase}.txt`,
                      layoutExport.plainText,
                      "text/plain;charset=utf-8",
                    )
                  : undefined
              }
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              TXT
            </button>
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-700"
              disabled={!layoutExport?.markdown}
              onClick={() =>
                layoutExport
                  ? download(
                      `${filenameBase}.md`,
                      layoutExport.markdown,
                      "text/markdown;charset=utf-8",
                    )
                  : undefined
              }
              type="button"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              Markdown
            </button>
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-700"
              disabled={!layoutExport?.html}
              onClick={() =>
                layoutExport
                  ? download(
                      `${filenameBase}.html`,
                      layoutExport.html,
                      "text/html;charset=utf-8",
                    )
                  : undefined
              }
              type="button"
            >
              <FileCode2 aria-hidden="true" className="h-4 w-4" />
              HTML
            </button>
          </div>
        </div>
        {copyState === "failed" ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            复制失败，已为你选中预览框内容，请手动按 Cmd+C 复制。
          </p>
        ) : null}
        <textarea
          className="mt-3 min-h-72 w-full resize-y rounded-md border border-ink-950/10 bg-paper-50 p-3 font-mono text-xs leading-6 text-ink-800 outline-none"
          ref={previewRef}
          readOnly
          value={layoutExport?.plainText ?? ""}
        />
      </div>
    </section>
  );
}

function CandidatePreview({
  actionLabel,
  label,
  onApply,
  value,
}: {
  actionLabel: string;
  label: string;
  onApply: () => void;
  value: string;
}) {
  return (
    <div className="rounded-md border border-ink-950/10 bg-white p-3">
      <p className="text-xs font-semibold text-ink-700">{label}</p>
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-ink-800">
        {value || "未生成"}
      </p>
      <button
        className="mt-3 inline-flex min-h-8 items-center rounded-md border border-ink-950/15 bg-paper-50 px-2.5 py-1.5 text-xs font-semibold text-ink-800 transition hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!value}
        onClick={onApply}
        type="button"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function formatLocalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}

function safeFilename(value: string) {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return cleaned || "wechat-layout-export";
}
