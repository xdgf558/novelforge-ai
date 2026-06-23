"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileCode2,
  FileText,
  Sparkles,
} from "lucide-react";
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

export type WechatLayoutChapterOption = WechatLayoutChapter & {
  latestPublishPackage?: {
    commentGuide?: string | null;
    endingQuestion?: string | null;
    nextChapterPreview?: string | null;
    openingGuide?: string | null;
    selectedTitle?: string | null;
  } | null;
};

type WechatLayoutExportPanelProps = {
  chapters: WechatLayoutChapterOption[];
  projectTitle: string;
};

export function WechatLayoutExportPanel({
  chapters,
  projectTitle,
}: WechatLayoutExportPanelProps) {
  const defaultChapterId = chapters[chapters.length - 1]?.id ?? "";
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
  const [copied, setCopied] = useState(false);

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
  const latestPackage = selectedChapter?.latestPublishPackage ?? null;
  const hasAiCandidate = Boolean(
    latestPackage?.selectedTitle ||
      latestPackage?.openingGuide ||
      latestPackage?.endingQuestion ||
      latestPackage?.nextChapterPreview ||
      latestPackage?.commentGuide,
  );
  const filenameBase = safeFilename(
    `${projectTitle || "novelforge"}-${
      selectedChapter?.chapterNumber
        ? `chapter-${selectedChapter.chapterNumber}`
        : "chapter"
    }-wechat`,
  );

  function applyAiCandidate() {
    if (!latestPackage || !selectedChapter) {
      return;
    }

    if (latestPackage.selectedTitle?.trim()) {
      setPublishTitle(latestPackage.selectedTitle.trim());
    }

    if (latestPackage.openingGuide?.trim()) {
      setOpeningGuide(latestPackage.openingGuide.trim());
    }

    const followParts = [
      latestPackage.endingQuestion
        ? `互动问题：${latestPackage.endingQuestion.trim()}`
        : "",
      latestPackage.nextChapterPreview
        ? `下章预告：${latestPackage.nextChapterPreview.trim()}`
        : "",
      latestPackage.commentGuide?.trim() ?? "",
    ].filter(Boolean);

    if (followParts.length > 0) {
      setEndingFollowHook(followParts.join("\n\n"));
    }
  }

  async function copyCurrentText() {
    if (!layoutExport) {
      return;
    }

    await navigator.clipboard.writeText(layoutExport.plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
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
      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
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
    <section className="space-y-4 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
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
            自动读取精修正文、定稿正文或草稿正文，整理段落空行、分节标题和重复章标题。AI 增强只作为候选，套用后仍由你确认再复制或导出。
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

      <div className="flex flex-col gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-950">AI 增强候选</p>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            可套用当前章节最近的 AI 发布包装标题、开头和结尾候选；套用只是填入表单，不会改正文。
          </p>
        </div>
        <button
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
            hasAiCandidate
              ? "border border-ink-950/15 bg-white text-ink-800 hover:bg-paper-100"
              : "cursor-not-allowed border border-ink-950/10 bg-white text-ink-600"
          }`}
          disabled={!hasAiCandidate}
          onClick={applyAiCandidate}
          type="button"
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          {hasAiCandidate ? "套用候选" : "暂无候选"}
        </button>
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
              {copied ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Clipboard aria-hidden="true" className="h-4 w-4" />
              )}
              {copied ? "已复制" : "一键复制正文"}
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
        <textarea
          className="mt-3 min-h-72 w-full resize-y rounded-md border border-ink-950/10 bg-paper-50 p-3 font-mono text-xs leading-6 text-ink-800 outline-none"
          readOnly
          value={layoutExport?.plainText ?? ""}
        />
      </div>
    </section>
  );
}

function safeFilename(value: string) {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return cleaned || "wechat-layout-export";
}
