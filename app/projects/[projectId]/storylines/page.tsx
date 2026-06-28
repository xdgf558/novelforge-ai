import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowLeft,
  BookOpenText,
  GitBranch,
  Layers3,
  ListChecks,
  type LucideIcon,
  Pencil,
  Users,
} from "lucide-react";
import {
  archiveStoryline,
  createStoryline,
  updateStoryline,
} from "@/app/projects/[projectId]/storylines/actions";
import { FormActionButton } from "@/components/form-action-button";
import { formatDate, formatNumber } from "@/lib/format";
import { outlineLevelLabel, outlineRangeLabel } from "@/lib/outline-fields";
import {
  storylineStatusLabel,
  storylineStatusOptions,
  storylineTypeLabel,
  storylineTypeOptions,
  storylineValidationErrorMessages,
  type StorylineValidationErrorCode,
} from "@/lib/storyline-fields";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StorylinesPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    editId?: string;
    storylineError?: string;
    storylineSaved?: string;
  }>;
};

export default async function StorylinesPage({
  params,
  searchParams,
}: StorylinesPageProps) {
  const { projectId } = await params;
  const query = (await searchParams) ?? {};

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      storylines: {
        include: {
          characters: {
            include: {
              character: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          foreshadows: {
            include: {
              foreshadow: {
                select: {
                  id: true,
                  content: true,
                  status: true,
                  importance: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          chapters: {
            include: {
              chapter: {
                select: {
                  id: true,
                  chapterNumber: true,
                  title: true,
                  status: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          outlines: {
            include: {
              outline: {
                select: {
                  id: true,
                  level: true,
                  title: true,
                  status: true,
                  chapterNumber: true,
                  startChapter: true,
                  endChapter: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: [
          {
            status: "asc",
          },
          {
            updatedAt: "desc",
          },
        ],
      },
      characters: {
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          status: true,
          roleInStory: true,
          identity: true,
        },
      },
      foreshadows: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          content: true,
          status: true,
          importance: true,
          expectedResolveChapter: true,
        },
      },
      chapters: {
        orderBy: {
          chapterNumber: "asc",
        },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          status: true,
        },
      },
      outlines: {
        orderBy: [
          {
            level: "asc",
          },
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          level: true,
          title: true,
          status: true,
          chapterNumber: true,
          startChapter: true,
          endChapter: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const storylines = sortStorylines(project.storylines);
  const activeCount = storylines.filter((item) => item.status === "active").length;
  const completedCount = storylines.filter(
    (item) => item.status === "completed",
  ).length;
  const linkedChapterCount = new Set(
    storylines.flatMap((item) =>
      item.chapters.map((chapterLink) => chapterLink.chapterId),
    ),
  ).size;
  const errorMessage =
    storylineValidationErrorMessages[
      query.storylineError as StorylineValidationErrorCode
    ];
  const savedMessage = storylineSavedMessage(query.storylineSaved);

  return (
    <div className="space-y-6" id="storylines">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回项目
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            多故事线
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            手动维护主线、支线、角色线、商业线、反派线和伏笔线。AI
            后续可以读取这些结构，但不会自动改写正式故事线。
          </p>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <InfoTile icon={GitBranch} label="故事线" value={`${storylines.length} 条`} />
        <InfoTile icon={ListChecks} label="推进中" value={`${activeCount} 条`} />
        <InfoTile icon={Archive} label="已完成" value={`${completedCount} 条`} />
        <InfoTile
          icon={BookOpenText}
          label="关联章节"
          value={`${linkedChapterCount} 章`}
        />
      </section>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errorMessage}
        </div>
      ) : null}

      {savedMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {savedMessage}
        </div>
      ) : null}

      <details
        className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
        open={storylines.length === 0}
      >
        <summary className="cursor-pointer text-base font-semibold text-ink-950">
          新增故事线
          <span className="ml-2 text-xs font-normal text-ink-700">
            先建立线索，再关联章节、大纲、人物和伏笔
          </span>
        </summary>
        <div className="mt-4">
          <StorylineForm
            action={createStoryline.bind(null, project.id)}
            characters={project.characters}
            chapters={project.chapters}
            foreshadows={project.foreshadows}
            outlines={project.outlines}
            submitLabel="保存故事线"
          />
        </div>
      </details>

      <section className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
        <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
          <GitBranch aria-hidden="true" className="h-4 w-4" />
          故事线看板
        </div>
        <h2 className="mt-1.5 text-base font-semibold text-ink-950">
          正式故事线
        </h2>
        <p className="mt-1 text-xs leading-5 text-ink-700">
          这里是作者确认后的结构化故事线。章节生成不会自动写入这里，后续阶段只会读取这些关联作为上下文。
        </p>

        {storylines.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-ink-950/20 bg-paper-50 p-4 text-sm text-ink-700">
            还没有故事线。可以先创建“县城第一桶金主线”“罗文斌反派线”“谢勇信任线”等基础线。
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {storylines.map((storyline) => {
              const isEditing = query.editId === storyline.id;

              return (
                <article
                  className="rounded-lg border border-ink-950/10 bg-paper-50 p-3"
                  key={storyline.id}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-700">
                        <Badge>{storylineTypeLabel(storyline.type)}</Badge>
                        <Badge>{storylineStatusLabel(storyline.status)}</Badge>
                        <Badge>{storylineRangeLabel(storyline)}</Badge>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-ink-950">
                        {storyline.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-700">
                        {storyline.coreGoal || "暂未填写核心目标。"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                        href={`/projects/${project.id}/storylines?editId=${storyline.id}#storyline-${storyline.id}`}
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        编辑
                      </Link>
                      {storyline.status !== "archived" ? (
                        <form
                          action={archiveStoryline.bind(
                            null,
                            project.id,
                            storyline.id,
                          )}
                        >
                          <button
                            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                            type="submit"
                          >
                            <Archive aria-hidden="true" className="h-4 w-4" />
                            归档
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <CompactText label="当前进展" value={storyline.currentProgress} />
                    <CompactText label="备注" value={storyline.notes} />
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <RelationSummary
                      icon={Users}
                      label="关联人物"
                      values={storyline.characters.map(
                        (item) => item.character.name,
                      )}
                    />
                    <RelationSummary
                      icon={BookOpenText}
                      label="推进章节"
                      values={storyline.chapters.map((item) =>
                        chapterLabel(item.chapter),
                      )}
                    />
                    <RelationSummary
                      icon={Layers3}
                      label="关联大纲"
                      values={storyline.outlines.map((item) =>
                        outlineLabel(item.outline),
                      )}
                    />
                    <RelationSummary
                      icon={ListChecks}
                      label="关联伏笔"
                      values={storyline.foreshadows.map(
                        (item) => item.foreshadow.content,
                      )}
                    />
                  </div>

                  <p className="mt-3 text-xs text-ink-600">
                    更新：{formatDate(storyline.updatedAt)}
                  </p>

                  {isEditing ? (
                    <div
                      className="mt-4 rounded-lg border border-ink-950/10 bg-white p-3"
                      id={`storyline-${storyline.id}`}
                    >
                      <h4 className="text-sm font-semibold text-ink-950">
                        编辑故事线
                      </h4>
                      <div className="mt-3">
                        <StorylineForm
                          action={updateStoryline.bind(
                            null,
                            project.id,
                            storyline.id,
                          )}
                          characters={project.characters}
                          chapters={project.chapters}
                          foreshadows={project.foreshadows}
                          outlines={project.outlines}
                          storyline={storyline}
                          submitLabel="保存修改"
                        />
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StorylineForm({
  action,
  characters,
  chapters,
  foreshadows,
  outlines,
  storyline,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  characters: readonly CharacterOption[];
  chapters: readonly ChapterOption[];
  foreshadows: readonly ForeshadowOption[];
  outlines: readonly OutlineOption[];
  storyline?: StorylineWithRelations;
  submitLabel: string;
}) {
  const selectedCharacterIds = new Set(
    storyline?.characters.map((item) => item.characterId) ?? [],
  );
  const selectedForeshadowIds = new Set(
    storyline?.foreshadows.map((item) => item.foreshadowId) ?? [],
  );
  const selectedChapterIds = new Set(
    storyline?.chapters.map((item) => item.chapterId) ?? [],
  );
  const selectedOutlineIds = new Set(
    storyline?.outlines.map((item) => item.outlineId) ?? [],
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm font-semibold text-ink-800 xl:col-span-2">
          <span>故事线名称</span>
          <input
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.name}
            maxLength={160}
            name="name"
            required
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-ink-800">
          <span>类型</span>
          <select
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.type ?? "mainline"}
            name="type"
          >
            {storylineTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-semibold text-ink-800">
          <span>状态</span>
          <select
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.status ?? "active"}
            name="status"
          >
            {storylineStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-semibold text-ink-800">
          <span>起始章节</span>
          <input
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.startChapter ?? ""}
            min={1}
            name="startChapter"
            type="number"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-ink-800">
          <span>结束章节</span>
          <input
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.endChapter ?? ""}
            min={1}
            name="endChapter"
            type="number"
          />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-ink-800">
          <span>核心目标</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.coreGoal ?? ""}
            name="coreGoal"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-ink-800">
          <span>当前进展</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.currentProgress ?? ""}
            name="currentProgress"
          />
        </label>
      </div>

      <label className="space-y-1 text-sm font-semibold text-ink-800">
        <span>备注</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-500"
          defaultValue={storyline?.notes ?? ""}
          name="notes"
        />
      </label>

      <div className="grid gap-3 lg:grid-cols-2">
        <RelationCheckboxGroup
          emptyText="还没有角色。"
          label="关联人物"
          name="characterIds"
          options={characters.map((character) => ({
            id: character.id,
            label: character.name,
            meta: [character.roleInStory, character.identity, character.status]
              .filter(Boolean)
              .join(" / "),
          }))}
          selectedIds={selectedCharacterIds}
        />
        <RelationCheckboxGroup
          emptyText="还没有伏笔。"
          label="关联伏笔"
          name="foreshadowIds"
          options={foreshadows.map((foreshadow) => ({
            id: foreshadow.id,
            label: foreshadow.content,
            meta: [
              foreshadow.status,
              foreshadow.importance,
              foreshadow.expectedResolveChapter
                ? `预计第 ${formatNumber(foreshadow.expectedResolveChapter)} 章`
                : "",
            ]
              .filter(Boolean)
              .join(" / "),
          }))}
          selectedIds={selectedForeshadowIds}
        />
        <RelationCheckboxGroup
          emptyText="还没有章节。"
          label="推进章节"
          name="chapterIds"
          options={chapters.map((chapter) => ({
            id: chapter.id,
            label: chapterLabel(chapter),
            meta: chapter.status,
          }))}
          selectedIds={selectedChapterIds}
        />
        <RelationCheckboxGroup
          emptyText="还没有大纲。"
          label="关联大纲"
          name="outlineIds"
          options={outlines.map((outline) => ({
            id: outline.id,
            label: outlineLabel(outline),
            meta: `${outlineLevelLabel(outline.level)} / ${outline.status}`,
          }))}
          selectedIds={selectedOutlineIds}
        />
      </div>

      <FormActionButton
        icon="save"
        idleLabel={submitLabel}
        pendingLabel="正在保存"
        statusText="正在保存故事线与关联关系。"
      />
    </form>
  );
}

function RelationCheckboxGroup({
  emptyText,
  label,
  name,
  options,
  selectedIds,
}: {
  emptyText: string;
  label: string;
  name: string;
  options: readonly {
    id: string;
    label: string;
    meta?: string;
  }[];
  selectedIds: ReadonlySet<string>;
}) {
  return (
    <fieldset className="rounded-lg border border-ink-950/10 bg-paper-50 p-3">
      <legend className="px-1 text-sm font-semibold text-ink-950">{label}</legend>
      {options.length === 0 ? (
        <p className="mt-2 text-xs text-ink-700">{emptyText}</p>
      ) : (
        <div className="mt-2 max-h-40 space-y-1 overflow-auto pr-1">
          {options.map((option) => (
            <label
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs text-ink-800 transition hover:bg-white"
              key={option.id}
            >
              <input
                className="mt-0.5 h-4 w-4 rounded border-ink-950/20 text-signal-600"
                defaultChecked={selectedIds.has(option.id)}
                name={name}
                type="checkbox"
                value={option.id}
              />
              <span className="min-w-0">
                <span className="line-clamp-1 font-semibold text-ink-950">
                  {option.label}
                </span>
                {option.meta ? (
                  <span className="mt-0.5 block line-clamp-1 text-ink-600">
                    {option.meta}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
      {children}
    </span>
  );
}

function CompactText({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-xs font-semibold text-ink-600">{label}</p>
      <p className="mt-1 line-clamp-3 text-sm leading-6 text-ink-800">
        {value || "未填写"}
      </p>
    </div>
  );
}

function RelationSummary({
  icon: Icon,
  label,
  values,
}: {
  icon: LucideIcon;
  label: string;
  values: readonly string[];
}) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-600">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-800">
        {values.length > 0 ? values.join("、") : "未关联"}
      </p>
    </div>
  );
}

function storylineRangeLabel(storyline: {
  startChapter: number | null;
  endChapter: number | null;
}) {
  if (storyline.startChapter && storyline.endChapter) {
    return `第 ${formatNumber(storyline.startChapter)}-${formatNumber(
      storyline.endChapter,
    )} 章`;
  }

  if (storyline.startChapter) {
    return `第 ${formatNumber(storyline.startChapter)} 章起`;
  }

  if (storyline.endChapter) {
    return `至第 ${formatNumber(storyline.endChapter)} 章`;
  }

  return "章节未定";
}

function chapterLabel(chapter: ChapterOption) {
  return `第 ${formatNumber(chapter.chapterNumber)} 章《${chapter.title}》`;
}

function outlineLabel(outline: OutlineOption) {
  return `${outlineLevelLabel(outline.level)}：${outline.title}（${outlineRangeLabel(
    outline,
  )}）`;
}

function sortStorylines<T extends { status: string; updatedAt: Date }>(
  storylines: readonly T[],
) {
  const statusRank: Record<string, number> = {
    active: 0,
    planned: 1,
    paused: 2,
    completed: 3,
    archived: 4,
  };

  return [...storylines].sort((a, b) => {
    const byStatus =
      (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);

    if (byStatus !== 0) {
      return byStatus;
    }

    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

function storylineSavedMessage(value?: string) {
  switch (value) {
    case "created":
      return "已保存故事线。";
    case "updated":
      return "已更新故事线。";
    case "archived":
      return "已归档故事线。";
    default:
      return null;
  }
}

type StorylineWithRelations = Awaited<
  ReturnType<typeof prisma.storyline.findMany>
>[number] & {
  characters: {
    characterId: string;
    character: CharacterOption;
  }[];
  foreshadows: {
    foreshadowId: string;
    foreshadow: ForeshadowOption;
  }[];
  chapters: {
    chapterId: string;
    chapter: ChapterOption;
  }[];
  outlines: {
    outlineId: string;
    outline: OutlineOption;
  }[];
};

type CharacterOption = {
  id: string;
  name: string;
  status: string;
  roleInStory?: string | null;
  identity?: string | null;
};

type ForeshadowOption = {
  id: string;
  content: string;
  status: string;
  importance: string;
  expectedResolveChapter?: number | null;
};

type ChapterOption = {
  id: string;
  chapterNumber: number;
  title: string;
  status: string;
};

type OutlineOption = {
  id: string;
  level: string;
  title: string;
  status: string;
  chapterNumber?: number | null;
  startChapter?: number | null;
  endChapter?: number | null;
};
