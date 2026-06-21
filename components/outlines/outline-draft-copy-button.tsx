"use client";

import { useMemo, useState } from "react";
import { ClipboardPenLine } from "lucide-react";
import {
  parseOutlineDraftCopySuggestion,
  type OutlineDraftCopySuggestion,
} from "@/lib/outline-draft-copy";
import { outlineLevelLabel } from "@/lib/outline-fields";

type OutlineDraftCopyButtonProps = {
  inputContextSummary?: string | null;
  outputText?: string | null;
};

export function OutlineDraftCopyButton({
  inputContextSummary,
  outputText,
}: OutlineDraftCopyButtonProps) {
  const [feedback, setFeedback] = useState("");
  const suggestion = useMemo(
    () =>
      parseOutlineDraftCopySuggestion({
        inputContextSummary,
        outputText,
      }),
    [inputContextSummary, outputText],
  );

  const handleCopyToForm = () => {
    if (!suggestion) {
      setFeedback("没有识别到可填入的字段。");
      return;
    }

    const form = document.querySelector<HTMLFormElement>(
      `form[data-outline-level="${suggestion.level}"]`,
    );

    if (!form) {
      setFeedback("没有找到对应的大纲表单。");
      return;
    }

    form.reset();
    fillOutlineForm(form, suggestion);
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    form.querySelector<HTMLInputElement>('[name="title"]')?.focus();
    setFeedback(`已填入${outlineLevelLabel(suggestion.level)}表单，请确认后保存。`);
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
      ) : null}
    </div>
  );
}

function fillOutlineForm(
  form: HTMLFormElement,
  suggestion: OutlineDraftCopySuggestion,
) {
  setFieldValue(form, "title", suggestion.title);
  setFieldValue(form, "goal", suggestion.goal);
  setFieldValue(form, "startChapter", suggestion.startChapter);
  setFieldValue(form, "endChapter", suggestion.endChapter);
  setFieldValue(form, "chapterNumber", suggestion.chapterNumber);
  setFieldValue(form, "expectedWords", suggestion.expectedWords);
  setFieldValue(form, "volumeNumber", suggestion.volumeNumber);
}

function setFieldValue(
  form: HTMLFormElement,
  name: string,
  value?: string | number,
) {
  if (value == null || value === "") {
    return;
  }

  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
  ) {
    field.value = String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
