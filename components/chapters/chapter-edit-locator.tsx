"use client";

import { useEffect, useMemo, useState } from "react";

type ChapterEditLocatorProps = {
  fieldName?: string | null;
  findText?: string | null;
};

const fieldLabels: Record<string, string> = {
  beats: "章节节拍",
  draftText: "草稿正文",
  finalText: "定稿正文",
  goal: "章节目标",
  notes: "备注",
  polishedText: "精修正文",
};

export function ChapterEditLocator({
  fieldName,
  findText,
}: ChapterEditLocatorProps) {
  const targetField = normalizeFieldName(fieldName);
  const searchText = findText?.trim() ?? "";
  const [result, setResult] = useState<"found" | "focused" | "missing" | null>(
    null,
  );

  const label = useMemo(
    () => (targetField ? fieldLabels[targetField] ?? targetField : ""),
    [targetField],
  );

  useEffect(() => {
    if (!targetField) {
      return;
    }

    const element = document.getElementById(targetField);

    if (!(element instanceof HTMLTextAreaElement)) {
      setResult("missing");
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus();

    const range = findTextRange(element.value, searchText);

    if (range) {
      element.setSelectionRange(range.start, range.end);
      setResult("found");
      return;
    }

    setResult("focused");
  }, [targetField, searchText]);

  if (!targetField) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-signal-600/25 bg-signal-600/10 px-4 py-3 text-sm leading-6 text-ink-800"
      role="status"
    >
      <p className="font-semibold text-ink-950">连续性修复定位</p>
      <p className="mt-1">
        已跳转到{label || "目标字段"}
        {searchText ? "，并尝试定位报告中的原文片段。" : "。"}
      </p>
      {result === "found" ? (
        <p className="mt-1 text-xs text-ink-700">
          已选中匹配文本，你可以直接手动替换后保存章节快照。
        </p>
      ) : result === "focused" ? (
        <p className="mt-1 text-xs text-ink-700">
          已聚焦目标正文框，但没有自动找到完全匹配的原文；请按报告建议手动搜索附近内容。
        </p>
      ) : result === "missing" ? (
        <p className="mt-1 text-xs text-ink-700">
          未找到目标输入框，请返回连续性报告后重新进入。
        </p>
      ) : null}
    </div>
  );
}

function normalizeFieldName(fieldName?: string | null) {
  if (!fieldName || !(fieldName in fieldLabels)) {
    return null;
  }

  return fieldName;
}

function findTextRange(value: string, searchText: string) {
  const search = searchText.trim();

  if (!search) {
    return null;
  }

  const exactIndex = value.indexOf(search);

  if (exactIndex >= 0) {
    return {
      start: exactIndex,
      end: exactIndex + search.length,
    };
  }

  const compactSearch = compactWhitespace(search);

  if (compactSearch.length < 12) {
    return null;
  }

  const compactValue = compactWhitespace(value);
  const compactIndex = compactValue.indexOf(compactSearch);

  if (compactIndex < 0) {
    return null;
  }

  return mapCompactRangeToOriginal(value, compactIndex, compactSearch.length);
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, "");
}

function mapCompactRangeToOriginal(
  value: string,
  compactStart: number,
  compactLength: number,
) {
  let compactCursor = 0;
  let start = -1;
  let end = -1;

  for (let index = 0; index < value.length; index += 1) {
    if (/\s/.test(value[index] ?? "")) {
      continue;
    }

    if (compactCursor === compactStart) {
      start = index;
    }

    compactCursor += 1;

    if (compactCursor === compactStart + compactLength) {
      end = index + 1;
      break;
    }
  }

  if (start < 0 || end < 0) {
    return null;
  }

  return {
    start,
    end,
  };
}
