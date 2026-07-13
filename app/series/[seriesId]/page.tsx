import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookCopy,
  CheckCircle2,
  ExternalLink,
  Link2,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  UserRoundPlus,
  Users,
} from "lucide-react";
import {
  addProjectToShortStorySeries,
  createShortStorySeriesCharacter,
  moveShortStorySeriesEntry,
  removeProjectFromShortStorySeries,
  setShortStorySeriesCharacterStatus,
  updateShortStorySeriesEntry,
} from "@/app/series/actions";
import { SeriesCharacterForm } from "@/components/short-story-series/series-character-form";
import { formatDate, formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  shortStorySeriesCharacterStatusLabel,
  shortStorySeriesStatusLabel,
} from "@/lib/short-story-series/fields";

export const dynamic = "force-dynamic";

type SeriesDetailPageProps = {
  params: Promise<{
    seriesId: string;
  }>;
  searchParams?: Promise<{
    seriesError?: string;
  }>;
};

export default async function ShortStorySeriesDetailPage({
  params,
  searchParams,
}: SeriesDetailPageProps) {
  const { seriesId } = await params;
  const query = await searchParams;
  const [series, availableProjects] = await Promise.all([
    prisma.shortStorySeries.findUnique({
      where: {
        id: seriesId,
      },
      include: {
        entries: {
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          include: {
            project: {
              select: {
                id: true,
                title: true,
                genre: true,
                status: true,
                totalWordTarget: true,
                chapters: {
                  orderBy: {
                    chapterNumber: "asc",
                  },
                  select: {
                    status: true,
                    wordCount: true,
                  },
                },
              },
            },
          },
        },
        characters: {
          orderBy: [
            {
              status: "asc",
            },
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
      },
    }),
    prisma.project.findMany({
      where: {
        workType: "short_story",
        shortStorySeriesEntry: null,
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          title: "asc",
        },
      ],
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  if (!series) {
    notFound();
  }

  const confirmedStoryCount = series.entries.filter((entry) =>
    isConfirmedShortStory(entry.project.chapters),
  ).length;
  const activeCharacterCount = series.characters.filter(
    (character) => character.status === "active",
  ).length;

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href="/series"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回系列列表
      </Link>

      {query?.seriesError ? (
        <p className="rounded-md border border-ember-500/25 bg-ember-500/10 px-4 py-3 text-sm text-ember-500">
          {seriesErrorMessage(query.seriesError)}
        </p>
      ) : null}

      <header className="border-b border-ink-950/10 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              系列短故事 · {shortStorySeriesStatusLabel(series.status)}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {series.title}
            </h1>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-ink-700">
              {series.premise || "尚未填写系列定位。"}
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/series/${series.id}/edit`}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            编辑系列资料
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="系列篇目" value={`${series.entries.length} 篇`} />
        <StatTile
          label="正文已确认"
          value={`${confirmedStoryCount} / ${series.entries.length}`}
        />
        <StatTile label="持续登场人物" value={`${activeCharacterCount} 人`} />
      </section>

      <section className="border-t border-ink-950/10 pt-5">
        <div className="flex items-center gap-2">
          <BookCopy aria-hidden="true" className="h-5 w-5 text-signal-600" />
          <h2 className="text-lg font-semibold text-ink-950">共享连续性资料</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          这些内容只约束跨篇事实；每篇故事仍需在自己的蓝图中完成独立冲突闭环。
        </p>
        <dl className="mt-4 grid gap-x-6 gap-y-5 lg:grid-cols-2">
          <SeriesMemoryField label="共享世界观" value={series.sharedWorldview} />
          <SeriesMemoryField
            label="跨篇连续性规则"
            value={series.continuityRules}
          />
          <SeriesMemoryField
            label="复现人物 / 组织 / 技术"
            value={series.recurringElements}
          />
          <SeriesMemoryField label="长期谜团" value={series.longTermMysteries} />
          <SeriesMemoryField
            className="lg:col-span-2"
            label="后续推进方向"
            value={series.futureDirection}
          />
        </dl>
      </section>

      <section className="border-t border-ink-950/10 pt-5" id="series-stories">
        <div className="flex items-center gap-2">
          <Link2 aria-hidden="true" className="h-5 w-5 text-signal-600" />
          <h2 className="text-lg font-semibold text-ink-950">系列篇目</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          顺序用于表达推荐阅读次序，不会改变单篇项目内部的写作单元编号。
        </p>

        {series.entries.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-ink-950/15 px-4 py-6 text-sm text-ink-700">
            尚未加入短故事项目。
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {series.entries.map((entry, index) => {
              const confirmed = isConfirmedShortStory(entry.project.chapters);
              const confirmedUnits = entry.project.chapters.filter((chapter) =>
                ["final", "published"].includes(chapter.status),
              ).length;
              const wordCount = entry.project.chapters.reduce(
                (total, chapter) => total + (chapter.wordCount ?? 0),
                0,
              );

              return (
                <article
                  className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
                  key={entry.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal-500/10 text-sm font-semibold text-signal-700">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink-950">
                            {entry.project.title}
                          </h3>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                              confirmed
                                ? "border-signal-600/20 bg-signal-600/10 text-signal-700"
                                : "border-ink-950/10 bg-paper-50 text-ink-700"
                            }`}
                          >
                            {confirmed ? "正文已确认" : "创作中"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-700">
                          {entry.project.genre || "未设置题材"} · 已确认单元 {confirmedUnits}/
                          {entry.project.chapters.length} · {formatNumber(wordCount)} 字
                          {entry.project.totalWordTarget
                            ? ` / 目标 ${formatNumber(entry.project.totalWordTarget)}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <form
                        action={moveShortStorySeriesEntry.bind(
                          null,
                          series.id,
                          entry.id,
                          "up",
                        )}
                      >
                        <button
                          aria-label={`上移《${entry.project.title}》`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-950/10 text-ink-700 transition hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={index === 0}
                          title="上移"
                          type="submit"
                        >
                          <ArrowUp aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </form>
                      <form
                        action={moveShortStorySeriesEntry.bind(
                          null,
                          series.id,
                          entry.id,
                          "down",
                        )}
                      >
                        <button
                          aria-label={`下移《${entry.project.title}》`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-950/10 text-ink-700 transition hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={index === series.entries.length - 1}
                          title="下移"
                          type="submit"
                        >
                          <ArrowDown aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </form>
                      <Link
                        aria-label={`打开《${entry.project.title}》`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-950/10 text-ink-700 transition hover:bg-paper-100"
                        href={`/projects/${entry.project.id}`}
                        title="打开单篇项目"
                      >
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </Link>
                      <form
                        action={removeProjectFromShortStorySeries.bind(
                          null,
                          series.id,
                          entry.id,
                        )}
                      >
                        <button
                          aria-label={`从系列移除《${entry.project.title}》`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ember-500/20 text-ember-500 transition hover:bg-ember-500/10"
                          title="从系列移除"
                          type="submit"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>

                  <form
                    action={updateShortStorySeriesEntry.bind(
                      null,
                      series.id,
                      entry.id,
                    )}
                    className="mt-4 flex flex-col gap-2"
                  >
                    <label
                      className="text-xs font-semibold text-ink-800"
                      htmlFor={`continuity-note-${entry.id}`}
                    >
                      本篇对系列线的推进
                    </label>
                    <textarea
                      className="min-h-20 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15"
                      defaultValue={entry.continuityNote ?? ""}
                      id={`continuity-note-${entry.id}`}
                      name="continuityNote"
                      placeholder="记录本篇改变了哪些人物关系、认知或长期谜团；留空表示本篇只使用共享世界。"
                    />
                    <button
                      className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md border border-ink-950/15 px-3 py-1.5 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
                      type="submit"
                    >
                      <Save aria-hidden="true" className="h-3.5 w-3.5" />
                      保存推进备注
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        )}

        <form
          action={addProjectToShortStorySeries.bind(null, series.id)}
          className="mt-4 flex flex-col gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-2">
            <span className="text-sm font-medium text-ink-800">加入现有短故事</span>
            <select
              className="min-h-11 rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 outline-none focus:border-signal-500 focus:ring-4 focus:ring-signal-500/15"
              disabled={availableProjects.length === 0}
              name="projectId"
              required
            >
              {availableProjects.length === 0 ? (
                <option value="">没有可加入的短故事</option>
              ) : (
                <>
                  <option value="">选择一个未归属系列的项目</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={availableProjects.length === 0}
            type="submit"
          >
            <Link2 aria-hidden="true" className="h-4 w-4" />
            加入系列
          </button>
        </form>
      </section>

      <section
        className="border-t border-ink-950/10 pt-5"
        id="series-characters"
      >
        <div className="flex items-center gap-2">
          <Users aria-hidden="true" className="h-5 w-5 text-signal-600" />
          <h2 className="text-lg font-semibold text-ink-950">核心人物累计状态</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-ink-700">
          这里只维护跨篇连续性。单篇所需的角色细节仍在各自项目的角色库中确认。
        </p>

        {series.characters.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-ink-950/15 px-4 py-6 text-sm text-ink-700">
            尚未记录系列核心人物。
          </p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {series.characters.map((character) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
                key={character.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink-950">
                        {character.name}
                      </h3>
                      <span className="rounded-full border border-signal-600/20 bg-signal-600/10 px-2 py-0.5 text-[11px] font-semibold text-signal-700">
                        {shortStorySeriesCharacterStatusLabel(character.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-700">
                      {character.roleInSeries || "未设置系列职责"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      aria-label={`编辑${character.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-950/10 text-ink-700 transition hover:bg-paper-100"
                      href={`/series/${series.id}/characters/${character.id}/edit`}
                      title="编辑人物状态"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </Link>
                    <form
                      action={setShortStorySeriesCharacterStatus.bind(
                        null,
                        series.id,
                        character.id,
                        character.status === "active" ? "retired" : "active",
                      )}
                    >
                      <button
                        aria-label={
                          character.status === "active"
                            ? `标记${character.name}已退场`
                            : `恢复${character.name}持续登场`
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-950/10 text-ink-700 transition hover:bg-paper-100"
                        title={character.status === "active" ? "标记退场" : "恢复登场"}
                        type="submit"
                      >
                        {character.status === "active" ? (
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <RotateCcw aria-hidden="true" className="h-4 w-4" />
                        )}
                      </button>
                    </form>
                  </div>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <CharacterStateRow
                    label="累计状态"
                    value={character.accumulatedState}
                  />
                  <CharacterStateRow
                    label="关系状态"
                    value={character.relationshipState}
                  />
                  <CharacterStateRow
                    label="已知边界"
                    value={character.knownInformation}
                  />
                  <CharacterStateRow
                    label="复现规则"
                    value={character.recurringRules}
                  />
                </dl>
              </article>
            ))}
          </div>
        )}

        <details className="mt-4 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-950">
            <UserRoundPlus aria-hidden="true" className="h-4 w-4 text-signal-600" />
            新增系列核心人物
          </summary>
          <div className="mt-4 border-t border-ink-950/10 pt-4">
            <SeriesCharacterForm
              action={createShortStorySeriesCharacter.bind(null, series.id)}
              submitLabel="保存核心人物"
            />
          </div>
        </details>
      </section>

      <p className="border-t border-ink-950/10 pt-4 text-xs text-ink-700">
        系列资料更新：{formatDate(series.updatedAt)}。当前阶段不会自动从单篇正文提取或回写系列状态。
      </p>
    </div>
  );
}

function isConfirmedShortStory(
  chapters: ReadonlyArray<{ status: string }>,
) {
  return (
    chapters.length > 0 &&
    chapters.every((chapter) => ["final", "published"].includes(chapter.status))
  );
}

function seriesErrorMessage(error: string) {
  if (error === "invalid-project") {
    return "只能把短故事项目加入系列。";
  }
  if (error === "already-assigned") {
    return "这篇短故事已经归入其他系列，请先从原系列移除。";
  }
  if (error === "duplicate-character") {
    return "系列中已经存在同名核心人物，请编辑现有记录。";
  }
  return "操作没有完成，请检查输入后重试。";
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <p className="text-sm text-ink-700">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function SeriesMemoryField({
  className = "",
  label,
  value,
}: {
  className?: string;
  label: string;
  value?: string | null;
}) {
  return (
    <div className={className}>
      <dt className="text-sm font-semibold text-ink-950">{label}</dt>
      <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
        {value || "未填写"}
      </dd>
    </div>
  );
}

function CharacterStateRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-700">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap leading-6 text-ink-950">
        {value || "未填写"}
      </dd>
    </div>
  );
}
