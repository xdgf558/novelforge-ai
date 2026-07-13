import { notFound } from "next/navigation";
import {
  deleteShortStorySeries,
  updateShortStorySeries,
} from "@/app/series/actions";
import { SeriesForm } from "@/components/short-story-series/series-form";
import { prisma } from "@/lib/prisma";

type EditSeriesPageProps = {
  params: Promise<{
    seriesId: string;
  }>;
  searchParams?: Promise<{
    seriesError?: string;
  }>;
};

export default async function EditShortStorySeriesPage({
  params,
  searchParams,
}: EditSeriesPageProps) {
  const { seriesId } = await params;
  const query = await searchParams;
  const series = await prisma.shortStorySeries.findUnique({
    where: {
      id: seriesId,
    },
  });

  if (!series) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {query?.seriesError === "delete-confirmation" ? (
        <p className="rounded-md border border-red-400/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
          请输入 DELETE 后再删除系列。单篇项目不会被删除。
        </p>
      ) : null}

      <SeriesForm
        action={updateShortStorySeries.bind(null, series.id)}
        series={series}
        submitLabel="保存系列资料"
        subtitle="这里的内容是跨篇正式资料。当前阶段只接受作者手动保存，不会由 AI 自动改写。"
        title="编辑系列资料"
      />

      <section className="border-t border-red-400/20 pt-6">
        <h2 className="text-base font-semibold text-red-200">删除系列</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
          删除后会移除系列档案、篇目归属和系列人物状态，但不会删除任何短故事项目、正文或单篇正式记忆。
        </p>
        <form
          action={deleteShortStorySeries.bind(null, series.id)}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-sm font-medium text-ink-800">
              输入 DELETE 确认
            </span>
            <input
              className="min-h-11 rounded-md border border-red-400/30 bg-white px-3 text-sm text-ink-950 outline-none focus:ring-4 focus:ring-red-400/15"
              name="deleteConfirmation"
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-400/40 bg-red-950/20 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-950/35"
            type="submit"
          >
            删除系列
          </button>
        </form>
      </section>
    </div>
  );
}
