"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Upload,
} from "lucide-react";
import type { ShortStorySeriesDocumentImportState } from "@/app/series/import/actions";
import { SeriesForm } from "@/components/short-story-series/series-form";

const initialState: ShortStorySeriesDocumentImportState = {
  status: "idle",
  message: "",
};

type SeriesDocumentImportProps = {
  createAction: (formData: FormData) => Promise<void>;
  importAction: (
    previousState: ShortStorySeriesDocumentImportState,
    formData: FormData,
  ) => Promise<ShortStorySeriesDocumentImportState>;
};

export function SeriesDocumentImport({
  createAction,
  importAction,
}: SeriesDocumentImportProps) {
  const [state, formAction, pending] = useActionState(
    importAction,
    initialState,
  );

  return (
    <div className="space-y-7">
      <header>
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
          href="/series"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回系列列表
        </Link>
        <p className="text-sm font-semibold text-signal-600">本地读取</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
          导入系列创作文档
        </h1>
      </header>

      <form action={formAction} className="space-y-4">
        <label className="block rounded-lg border border-dashed border-ink-950/20 bg-white p-5 shadow-panel transition focus-within:border-signal-500 focus-within:ring-4 focus-within:ring-signal-500/10">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink-950">
            <FileText aria-hidden="true" className="h-5 w-5 text-signal-600" />
            DOCX 创作圣经
          </span>
          <input
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="mt-4 block w-full text-sm text-ink-700 file:mr-4 file:rounded-md file:border-0 file:bg-ink-950 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
            name="document"
            required
            type="file"
          />
          <span className="mt-3 block text-xs text-ink-700">
            最大 10 MB。正文、标题、列表和表格只在本机读取。
          </span>
        </label>

        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-wait disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Upload aria-hidden="true" className="h-4 w-4" />
          )}
          {pending ? "正在读取文档" : "读取并生成草稿"}
        </button>
      </form>

      {state.status === "error" ? (
        <p className="flex items-start gap-2 rounded-md border border-ember-500/25 bg-ember-500/10 px-4 py-3 text-sm text-ember-500">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {state.message}
        </p>
      ) : null}

      {state.draft ? (
        <div className="space-y-6 border-t border-ink-950/10 pt-6">
          <div className="flex flex-col gap-3 border-b border-ink-950/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-signal-600">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                {state.message}
              </p>
              <p className="mt-2 break-all text-sm text-ink-700">
                {state.draft.sourceFileName}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-ink-700 sm:grid-cols-3">
              <Stat label="栏目" value={state.draft.stats.sectionCount} />
              <Stat label="表格" value={state.draft.stats.tableCount} />
              <Stat label="正文字符" value={state.draft.stats.characterCount} />
            </dl>
          </div>

          {state.draft.warnings.length > 0 ? (
            <div className="space-y-2 rounded-md border border-ember-500/25 bg-ember-500/10 px-4 py-3 text-sm text-ink-800">
              {state.draft.warnings.map((warning) => (
                <p className="flex items-start gap-2" key={warning}>
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-ember-500"
                  />
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          <SeriesForm
            action={createAction}
            initialValues={state.draft.values}
            key={`${state.draft.sourceFileName}:${state.draft.stats.characterCount}:${state.draft.values.title}`}
            submitLabel="确认并创建系列"
            subtitle="文档内容已经按系列资料栏目带入；保存前可以直接删改。确认后才会成为正式系列记忆。"
            title="审阅导入草稿"
          />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <dt>{label}</dt>
      <dd className="font-semibold text-ink-950">{value.toLocaleString("zh-CN")}</dd>
    </div>
  );
}
