import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  FileText,
  Filter,
  ListChecks,
  Route,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  abandonForeshadow,
  archiveTimelineEvent,
  archiveWorldRule,
  createForeshadow,
  createTimelineEvent,
  createWorldRule,
  updateForeshadow,
  updateTimelineEvent,
  updateWorldRule,
} from "@/app/projects/[projectId]/memory/actions";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  foreshadowImportanceLabel,
  foreshadowImportanceOptions,
  foreshadowStatusLabel,
  foreshadowStatusOptions,
  memoryRiskLevelLabel,
  memoryRiskLevelOptions,
  storyMemoryValidationErrorMessages,
  timelineEventStatusLabel,
  timelineEventStatusOptions,
  worldRuleCategoryLabel,
  worldRuleCategoryOptions,
  worldRuleStatusLabel,
  worldRuleStatusOptions,
  type StoryMemoryValidationErrorCode,
} from "@/lib/story-memory-fields";

export const dynamic = "force-dynamic";

type MemoryPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    editId?: string;
    editType?: string;
    memoryError?: string;
    foreshadowImportance?: string;
    foreshadowResolveChapter?: string;
    foreshadowStatus?: string;
    timelineChapterId?: string;
    timelineSort?: string;
    timelineStatus?: string;
    worldRuleCategory?: string;
    worldRuleCore?: string;
    worldRuleStatus?: string;
  }>;
};

type ChapterOption = {
  id: string;
  chapterNumber: number;
  title: string;
};

const memoryListLimit = 50;

export default async function MemoryPage({
  params,
  searchParams,
}: MemoryPageProps) {
  const { projectId } = await params;
  const query = (await searchParams) ?? {};
  const memoryFilters = normalizeMemoryFilters(query);
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      chapters: {
        select: {
          id: true,
          chapterNumber: true,
          title: true,
        },
        orderBy: {
          chapterNumber: "asc",
        },
      },
      worldRules: {
        where: buildWorldRuleWhere(memoryFilters),
        orderBy: [{ isCore: "desc" }, { status: "asc" }, { updatedAt: "desc" }],
        take: memoryListLimit,
      },
      foreshadows: {
        where: buildForeshadowWhere(memoryFilters),
        include: {
          plantedChapter: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
            },
          },
          resolvedChapter: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { importance: "desc" }, { updatedAt: "desc" }],
        take: memoryListLimit,
      },
      timelineEvents: {
        where: buildTimelineWhere(memoryFilters),
        include: {
          chapter: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
            },
          },
        },
        orderBy:
          memoryFilters.timelineSort === "updated_desc"
            ? [{ updatedAt: "desc" }]
            : [{ status: "asc" }, { storyTime: "asc" }, { createdAt: "asc" }],
        take: memoryListLimit,
      },
    },
  });

  if (!project) {
    notFound();
  }

  const [
    worldRuleTotalCount,
    activeWorldRuleCount,
    worldRuleFilteredCount,
    foreshadowTotalCount,
    unresolvedForeshadowCount,
    foreshadowFilteredCount,
    timelineEventTotalCount,
    timelineEventFilteredCount,
  ] = await Promise.all([
    prisma.worldRule.count({
      where: {
        projectId,
      },
    }),
    prisma.worldRule.count({
      where: {
        projectId,
        status: "active",
      },
    }),
    prisma.worldRule.count({
      where: {
        projectId,
        ...buildWorldRuleWhere(memoryFilters),
      },
    }),
    prisma.foreshadow.count({
      where: {
        projectId,
      },
    }),
    prisma.foreshadow.count({
      where: {
        projectId,
        status: {
          notIn: ["resolved", "abandoned"],
        },
      },
    }),
    prisma.foreshadow.count({
      where: {
        projectId,
        ...buildForeshadowWhere(memoryFilters),
      },
    }),
    prisma.timelineEvent.count({
      where: {
        projectId,
      },
    }),
    prisma.timelineEvent.count({
      where: {
        projectId,
        ...buildTimelineWhere(memoryFilters),
      },
    }),
  ]);

  const chapters = project.chapters;
  const chapterLabelById = new Map(
    chapters.map((chapter) => [chapter.id, chapterLabel(chapter)]),
  );
  const memoryErrorMessage =
    storyMemoryValidationErrorMessages[
      query.memoryError as StoryMemoryValidationErrorCode
    ];
  const editType = query.editType;
  const editId = query.editId;
  return (
    <div className="space-y-6">
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
            结构化记忆
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            管理世界观规则、伏笔池和时间线。AI 可以从章节中提取建议，但正式记忆仍由作者在这里确认、补充和维护。
          </p>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <InfoTile
          icon={ShieldCheck}
          label="世界观规则"
          value={`${activeWorldRuleCount} 条生效 / ${worldRuleTotalCount} 条总计`}
        />
        <InfoTile
          icon={ListChecks}
          label="伏笔池"
          value={`${unresolvedForeshadowCount} 条待跟进 / ${foreshadowTotalCount} 条总计`}
        />
        <InfoTile
          icon={Route}
          label="时间线"
          value={`${timelineEventTotalCount} 个事件`}
        />
      </section>

      {memoryErrorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {memoryErrorMessage}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <AnchorCard
          description="维护会约束章节生成和连续性检查的正式规则。"
          href="#world-rules"
          icon={ShieldCheck}
          title="世界观规则库"
        />
        <AnchorCard
          description="追踪已埋设、推进中、待回收或已废弃的伏笔。"
          href="#foreshadows"
          icon={ListChecks}
          title="伏笔池"
        />
        <AnchorCard
          description="按故事内时间或章节记录关键事件顺序。"
          href="#timeline"
          icon={Route}
          title="时间线"
        />
      </section>

      <MemorySection
        description="世界观规则会进入章节生成和连续性检查上下文。核心规则和高风险规则应谨慎修改。"
        icon={ShieldCheck}
        id="world-rules"
        title="世界观规则库"
      >
        <CompactCreatePanel title="新增世界观规则">
          <WorldRuleForm
            action={createWorldRule.bind(null, project.id)}
            chapters={chapters}
            submitLabel="新增规则"
          />
        </CompactCreatePanel>
        <ListLimitNotice
          filterActive={hasWorldRuleFilter(memoryFilters)}
          label="世界观规则"
          loaded={project.worldRules.length}
          total={
            hasWorldRuleFilter(memoryFilters)
              ? worldRuleFilteredCount
              : worldRuleTotalCount
          }
        />
        <WorldRuleFilterForm filters={memoryFilters} projectId={project.id} />
        <div className="mt-4 space-y-3">
          {project.worldRules.length === 0 ? (
            <EmptyState text="还没有世界观规则。可以先录入技术规则、社会规则、代价机制或禁忌规则。" />
          ) : (
            project.worldRules.map((rule) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-3"
                key={rule.id}
              >
                <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      {rule.isCore ? <Badge tone="amber">核心规则</Badge> : null}
                      <Badge>{worldRuleStatusLabel(rule.status)}</Badge>
                      <Badge>{memoryRiskLevelLabel(rule.riskLevel)}</Badge>
                      <Badge>{worldRuleCategoryLabel(rule.category)}</Badge>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-ink-950">
                      {rule.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#cdb891]">
                      来源章节：{chapterLabelById.get(rule.sourceChapterId || "") || "未指定"} / 更新：{formatDate(rule.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/10 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:border-signal-500/45 hover:text-signal-700"
                      href={`/projects/${project.id}/memory?editType=worldRule&editId=${rule.id}#world-rules`}
                    >
                      编辑
                    </Link>
                    {rule.status !== "archived" ? (
                      <form action={archiveWorldRule.bind(null, project.id, rule.id)}>
                        <button
                          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#d89b45]/35 bg-[#2d1f12] px-3 py-2 text-xs font-semibold text-[#ffd28d] transition hover:border-[#ffc274]/50 hover:bg-[#3a2816]"
                          type="submit"
                        >
                          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                          归档
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <ExpandableText value={rule.content} />
                {editType === "worldRule" && editId === rule.id ? (
                  <div className="mt-4 rounded-lg border border-signal-500/20 bg-signal-500/5 p-4">
                    <WorldRuleForm
                      action={updateWorldRule.bind(null, project.id, rule.id)}
                      chapters={chapters}
                      rule={rule}
                      submitLabel="保存规则"
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </MemorySection>

      <MemorySection
        description="伏笔池用于追踪长期埋设和回收，避免线索遗忘、重复或提前泄露。"
        icon={ListChecks}
        id="foreshadows"
        title="伏笔池"
      >
        <CompactCreatePanel title="新增伏笔">
          <ForeshadowForm
            action={createForeshadow.bind(null, project.id)}
            chapters={chapters}
            submitLabel="新增伏笔"
          />
        </CompactCreatePanel>
        <ListLimitNotice
          filterActive={hasForeshadowFilter(memoryFilters)}
          label="伏笔"
          loaded={project.foreshadows.length}
          total={
            hasForeshadowFilter(memoryFilters)
              ? foreshadowFilteredCount
              : foreshadowTotalCount
          }
        />
        <ForeshadowFilterForm filters={memoryFilters} projectId={project.id} />
        <div className="mt-4 space-y-3">
          {project.foreshadows.length === 0 ? (
            <EmptyState text="还没有伏笔记录。可以手动补充章节埋点，也可以先从待审更新中批准 AI 提取的伏笔。" />
          ) : (
            project.foreshadows.map((foreshadow) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-3"
                key={foreshadow.id}
              >
                <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge>{foreshadowStatusLabel(foreshadow.status)}</Badge>
                      <Badge>{foreshadowImportanceLabel(foreshadow.importance)}</Badge>
                      {foreshadow.expectedResolveChapter ? (
                        <Badge tone="cyan">
                          预计第 {foreshadow.expectedResolveChapter} 章回收
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold text-ink-950">
                      {foreshadow.content}
                    </h3>
                    <p className="mt-1 text-xs text-[#cdb891]">
                      埋设：{foreshadow.plantedChapter ? chapterLabel(foreshadow.plantedChapter) : "未指定"} / 回收：{foreshadow.resolvedChapter ? chapterLabel(foreshadow.resolvedChapter) : "未指定"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/10 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:border-signal-500/45 hover:text-signal-700"
                      href={`/projects/${project.id}/memory?editType=foreshadow&editId=${foreshadow.id}#foreshadows`}
                    >
                      编辑
                    </Link>
                    {foreshadow.status !== "abandoned" ? (
                      <form
                        action={abandonForeshadow.bind(
                          null,
                          project.id,
                          foreshadow.id,
                        )}
                      >
                        <button
                          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#d89b45]/35 bg-[#2d1f12] px-3 py-2 text-xs font-semibold text-[#ffd28d] transition hover:border-[#ffc274]/50 hover:bg-[#3a2816]"
                          type="submit"
                        >
                          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                          废弃
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <ExpandableText value={foreshadow.content} />
                {editType === "foreshadow" && editId === foreshadow.id ? (
                  <div className="mt-4 rounded-lg border border-signal-500/20 bg-signal-500/5 p-4">
                    <ForeshadowForm
                      action={updateForeshadow.bind(null, project.id, foreshadow.id)}
                      chapters={chapters}
                      foreshadow={foreshadow}
                      submitLabel="保存伏笔"
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </MemorySection>

      <MemorySection
        description="时间线事件帮助连续性检查理解事件顺序、人物位置和阶段变化。"
        icon={Route}
        id="timeline"
        title="时间线"
      >
        <CompactCreatePanel title="新增时间线事件">
          <TimelineEventForm
            action={createTimelineEvent.bind(null, project.id)}
            chapters={chapters}
            submitLabel="新增事件"
          />
        </CompactCreatePanel>
        <ListLimitNotice
          filterActive={hasTimelineFilter(memoryFilters)}
          label="时间线事件"
          loaded={project.timelineEvents.length}
          total={
            hasTimelineFilter(memoryFilters)
              ? timelineEventFilteredCount
              : timelineEventTotalCount
          }
        />
        <TimelineFilterForm
          chapters={chapters}
          filters={memoryFilters}
          projectId={project.id}
        />
        <div className="mt-4 space-y-3">
          {project.timelineEvents.length === 0 ? (
            <EmptyState text="还没有时间线事件。先记录开篇锚点、关键交易、角色关系转折或重大冲突节点。" />
          ) : (
            project.timelineEvents.map((event) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-3"
                key={event.id}
              >
                <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge>{timelineEventStatusLabel(event.status)}</Badge>
                      {event.storyTime ? <Badge>{event.storyTime}</Badge> : null}
                      {event.location ? <Badge tone="cyan">{event.location}</Badge> : null}
                      {event.chapter ? (
                        <Badge tone="amber">{chapterLabel(event.chapter)}</Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-ink-950">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#cdb891]">
                      更新：{formatDate(event.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/10 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:border-signal-500/45 hover:text-signal-700"
                      href={`/projects/${project.id}/memory?editType=timelineEvent&editId=${event.id}#timeline`}
                    >
                      编辑
                    </Link>
                    {event.status !== "archived" ? (
                      <form
                        action={archiveTimelineEvent.bind(
                          null,
                          project.id,
                          event.id,
                        )}
                      >
                        <button
                          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#d89b45]/35 bg-[#2d1f12] px-3 py-2 text-xs font-semibold text-[#ffd28d] transition hover:border-[#ffc274]/50 hover:bg-[#3a2816]"
                          type="submit"
                        >
                          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                          归档
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <ExpandableText value={event.description} />
                {event.impact ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-md border border-[#ce8f48]/20 bg-[#07191c]/[.85] p-3 text-xs leading-5 text-[#d8c39d]">
                    影响：{event.impact}
                  </p>
                ) : null}
                {editType === "timelineEvent" && editId === event.id ? (
                  <div className="mt-4 rounded-lg border border-signal-500/20 bg-signal-500/5 p-4">
                    <TimelineEventForm
                      action={updateTimelineEvent.bind(null, project.id, event.id)}
                      chapters={chapters}
                      event={event}
                      submitLabel="保存事件"
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </MemorySection>
    </div>
  );
}

type MemoryFilters = {
  foreshadowImportance: string;
  foreshadowResolveChapter: number | null;
  foreshadowStatus: string;
  timelineChapterId: string;
  timelineSort: string;
  timelineStatus: string;
  worldRuleCategory: string;
  worldRuleCore: string;
  worldRuleStatus: string;
};

function normalizeMemoryFilters(
  query: NonNullable<MemoryPageProps["searchParams"]> extends Promise<infer T>
    ? T
    : never,
): MemoryFilters {
  return {
    worldRuleStatus: optionValue(query.worldRuleStatus, worldRuleStatusOptions),
    worldRuleCategory: optionValue(query.worldRuleCategory, worldRuleCategoryOptions),
    worldRuleCore: query.worldRuleCore === "core" ? "core" : "",
    foreshadowStatus: optionValue(query.foreshadowStatus, foreshadowStatusOptions),
    foreshadowImportance: optionValue(
      query.foreshadowImportance,
      foreshadowImportanceOptions,
    ),
    foreshadowResolveChapter: positiveInt(query.foreshadowResolveChapter),
    timelineStatus: optionValue(query.timelineStatus, timelineEventStatusOptions),
    timelineChapterId: query.timelineChapterId?.trim() ?? "",
    timelineSort: query.timelineSort === "updated_desc" ? "updated_desc" : "story_time",
  };
}

function optionValue(
  value: string | undefined,
  options: readonly { value: string; label: string }[],
) {
  const normalized = value?.trim() ?? "";
  return options.some((option) => option.value === normalized) ? normalized : "";
}

function positiveInt(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildWorldRuleWhere(filters: MemoryFilters) {
  return {
    ...(filters.worldRuleStatus
      ? {
          status: filters.worldRuleStatus,
        }
      : {}),
    ...(filters.worldRuleCategory
      ? {
          category: filters.worldRuleCategory,
        }
      : {}),
    ...(filters.worldRuleCore === "core"
      ? {
          isCore: true,
        }
      : {}),
  };
}

function buildForeshadowWhere(filters: MemoryFilters) {
  return {
    ...(filters.foreshadowStatus
      ? {
          status: filters.foreshadowStatus,
        }
      : {}),
    ...(filters.foreshadowImportance
      ? {
          importance: filters.foreshadowImportance,
        }
      : {}),
    ...(filters.foreshadowResolveChapter
      ? {
          expectedResolveChapter: filters.foreshadowResolveChapter,
        }
      : {}),
  };
}

function buildTimelineWhere(filters: MemoryFilters) {
  return {
    ...(filters.timelineStatus
      ? {
          status: filters.timelineStatus,
        }
      : {}),
    ...(filters.timelineChapterId
      ? {
          chapterId: filters.timelineChapterId,
        }
      : {}),
  };
}

function hasWorldRuleFilter(filters: MemoryFilters) {
  return Boolean(
    filters.worldRuleStatus ||
      filters.worldRuleCategory ||
      filters.worldRuleCore,
  );
}

function hasForeshadowFilter(filters: MemoryFilters) {
  return Boolean(
    filters.foreshadowStatus ||
      filters.foreshadowImportance ||
      filters.foreshadowResolveChapter,
  );
}

function hasTimelineFilter(filters: MemoryFilters) {
  return Boolean(
    filters.timelineStatus ||
      filters.timelineChapterId ||
      filters.timelineSort !== "story_time",
  );
}

function WorldRuleFilterForm({
  filters,
  projectId,
}: {
  filters: MemoryFilters;
  projectId: string;
}) {
  return (
    <FilterForm action={`/projects/${projectId}/memory#world-rules`}>
      <SelectFilter
        defaultValue={filters.worldRuleStatus}
        label="状态"
        name="worldRuleStatus"
        options={worldRuleStatusOptions}
        placeholder="全部状态"
      />
      <SelectFilter
        defaultValue={filters.worldRuleCategory}
        label="分类"
        name="worldRuleCategory"
        options={worldRuleCategoryOptions}
        placeholder="全部分类"
      />
      <SelectFilter
        defaultValue={filters.worldRuleCore}
        label="核心规则"
        name="worldRuleCore"
        options={[{ value: "core", label: "仅核心规则" }]}
        placeholder="全部规则"
      />
      <FilterButtons resetHref={`/projects/${projectId}/memory#world-rules`} />
    </FilterForm>
  );
}

function ForeshadowFilterForm({
  filters,
  projectId,
}: {
  filters: MemoryFilters;
  projectId: string;
}) {
  return (
    <FilterForm action={`/projects/${projectId}/memory#foreshadows`}>
      <SelectFilter
        defaultValue={filters.foreshadowStatus}
        label="状态"
        name="foreshadowStatus"
        options={foreshadowStatusOptions}
        placeholder="全部状态"
      />
      <SelectFilter
        defaultValue={filters.foreshadowImportance}
        label="重要度"
        name="foreshadowImportance"
        options={foreshadowImportanceOptions}
        placeholder="全部重要度"
      />
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        预计回收章节
        <input
          className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
          defaultValue={filters.foreshadowResolveChapter ?? ""}
          min={1}
          name="foreshadowResolveChapter"
          type="number"
        />
      </label>
      <FilterButtons resetHref={`/projects/${projectId}/memory#foreshadows`} />
    </FilterForm>
  );
}

function TimelineFilterForm({
  chapters,
  filters,
  projectId,
}: {
  chapters: readonly ChapterOption[];
  filters: MemoryFilters;
  projectId: string;
}) {
  return (
    <FilterForm action={`/projects/${projectId}/memory#timeline`}>
      <SelectFilter
        defaultValue={filters.timelineStatus}
        label="状态"
        name="timelineStatus"
        options={timelineEventStatusOptions}
        placeholder="全部状态"
      />
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        关联章节
        <select
          className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
          defaultValue={filters.timelineChapterId}
          name="timelineChapterId"
        >
          <option value="">全部章节</option>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapterLabel(chapter)}
            </option>
          ))}
        </select>
      </label>
      <SelectFilter
        defaultValue={filters.timelineSort}
        label="排序"
        name="timelineSort"
        options={[
          { value: "story_time", label: "故事时间优先" },
          { value: "updated_desc", label: "最近更新优先" },
        ]}
        placeholder="故事时间优先"
      />
      <FilterButtons resetHref={`/projects/${projectId}/memory#timeline`} />
    </FilterForm>
  );
}

function FilterForm({
  action,
  children,
}: {
  action: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className="mt-3 grid gap-2 rounded-lg border border-ink-950/10 bg-paper-50 p-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-800 md:col-span-4">
        <Filter aria-hidden="true" className="h-3.5 w-3.5 text-signal-600" />
        筛选
      </div>
      {children}
    </form>
  );
}

function SelectFilter({
  defaultValue,
  label,
  name,
  options,
  placeholder,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
      {label}
      <select
        className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
        defaultValue={defaultValue}
        name={name}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterButtons({ resetHref }: { resetHref: string }) {
  return (
    <div className="flex items-end gap-2">
      <button
        className="inline-flex min-h-9 items-center rounded-md bg-ink-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ink-800"
        type="submit"
      >
        筛选
      </button>
      <Link
        className="inline-flex min-h-9 items-center rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
        href={resetHref}
      >
        重置
      </Link>
    </div>
  );
}

function WorldRuleForm({
  action,
  chapters,
  rule,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  chapters: readonly ChapterOption[];
  rule?: {
    title: string;
    content: string;
    category: string | null;
    riskLevel: string;
    status: string;
    scope: string | null;
    relatedCharacters: string | null;
    relatedLocations: string | null;
    relatedOrganizations: string | null;
    sourceChapterId: string | null;
    isCore: boolean;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2.5 lg:grid-cols-3">
        <TextField
          defaultValue={rule?.title}
          label="规则标题"
          name="title"
          placeholder="例如：零号 AI 离线运行边界"
          required
        />
        <SelectField
          defaultValue={rule?.category || "technology_rule"}
          label="规则类型"
          name="category"
          options={worldRuleCategoryOptions}
        />
        <SelectField
          defaultValue={rule?.riskLevel || "medium"}
          label="约束强度"
          name="riskLevel"
          options={memoryRiskLevelOptions}
        />
        <SelectField
          defaultValue={rule?.status || "active"}
          label="状态"
          name="status"
          options={worldRuleStatusOptions}
        />
        <ChapterSelectField
          chapters={chapters}
          defaultValue={rule?.sourceChapterId}
          label="首次出现章节"
          name="sourceChapterId"
        />
        <label className="flex min-h-10 items-center gap-2 self-end rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm font-medium text-ink-800">
          <input
            className="h-4 w-4 accent-signal-600"
            defaultChecked={rule?.isCore ?? false}
            name="isCore"
            type="checkbox"
          />
          核心规则
        </label>
      </div>
      <TextareaField
        defaultValue={rule?.content}
        label="规则内容"
        name="content"
        placeholder="写清楚规则边界、限制条件、代价和不能被 AI 随意改写的部分。"
        required
        rows={5}
      />
      <div className="grid gap-2.5 lg:grid-cols-2">
        <TextareaField
          defaultValue={rule?.scope}
          label="适用范围"
          name="scope"
          placeholder="例如：所有涉及零号 AI 推理、联网、资料准确性的章节。"
          rows={3}
        />
        <TextareaField
          defaultValue={rule?.relatedCharacters}
          label="相关人物"
          name="relatedCharacters"
          placeholder="例如：陈远、零号。"
          rows={3}
        />
        <TextareaField
          defaultValue={rule?.relatedLocations}
          label="相关地点"
          name="relatedLocations"
          placeholder="例如：县城、电脑培训班。"
          rows={3}
        />
        <TextareaField
          defaultValue={rule?.relatedOrganizations}
          label="相关组织"
          name="relatedOrganizations"
          placeholder="例如：电脑城、培训班、网吧。"
          rows={3}
        />
      </div>
      <SubmitButton label={submitLabel} />
    </form>
  );
}

function ForeshadowForm({
  action,
  chapters,
  foreshadow,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  chapters: readonly ChapterOption[];
  foreshadow?: {
    content: string;
    status: string;
    importance: string;
    expectedResolveChapter: number | null;
    relatedCharacters: string | null;
    relatedLocations: string | null;
    relatedFactions: string | null;
    plantedChapterId: string | null;
    resolvedChapterId: string | null;
    sourceChapterId: string | null;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-3">
      <TextareaField
        defaultValue={foreshadow?.content}
        label="伏笔内容"
        name="content"
        placeholder="记录线索、异常信息、需要回收的承诺或长期悬念。"
        required
        rows={4}
      />
      <div className="grid gap-2.5 lg:grid-cols-3">
        <SelectField
          defaultValue={foreshadow?.status || "planted"}
          label="当前状态"
          name="status"
          options={foreshadowStatusOptions}
        />
        <SelectField
          defaultValue={foreshadow?.importance || "medium"}
          label="重要程度"
          name="importance"
          options={foreshadowImportanceOptions}
        />
        <NumberField
          defaultValue={foreshadow?.expectedResolveChapter}
          label="预计回收章节"
          name="expectedResolveChapter"
          placeholder="例如：30"
        />
        <ChapterSelectField
          chapters={chapters}
          defaultValue={foreshadow?.plantedChapterId}
          label="埋设章节"
          name="plantedChapterId"
        />
        <ChapterSelectField
          chapters={chapters}
          defaultValue={foreshadow?.resolvedChapterId}
          label="实际回收章节"
          name="resolvedChapterId"
        />
        <ChapterSelectField
          chapters={chapters}
          defaultValue={foreshadow?.sourceChapterId}
          label="来源章节"
          name="sourceChapterId"
        />
      </div>
      <div className="grid gap-2.5 lg:grid-cols-3">
        <TextareaField
          defaultValue={foreshadow?.relatedCharacters}
          label="相关人物"
          name="relatedCharacters"
          rows={3}
        />
        <TextareaField
          defaultValue={foreshadow?.relatedLocations}
          label="相关地点"
          name="relatedLocations"
          rows={3}
        />
        <TextareaField
          defaultValue={foreshadow?.relatedFactions}
          label="相关势力"
          name="relatedFactions"
          rows={3}
        />
      </div>
      <SubmitButton label={submitLabel} />
    </form>
  );
}

function TimelineEventForm({
  action,
  chapters,
  event,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  chapters: readonly ChapterOption[];
  event?: {
    title: string;
    description: string;
    storyTime: string | null;
    relatedCharacters: string | null;
    location: string | null;
    impact: string | null;
    status: string;
    chapterId: string | null;
    sourceChapterId: string | null;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2.5 lg:grid-cols-3">
        <TextField
          defaultValue={event?.title}
          label="事件标题"
          name="title"
          placeholder="例如：陈远重生到 1999 年"
          required
        />
        <TextField
          defaultValue={event?.storyTime}
          label="故事内时间"
          name="storyTime"
          placeholder="例如：1999年6月15日上午"
        />
        <TextField
          defaultValue={event?.location}
          label="地点"
          name="location"
          placeholder="例如：县城家中"
        />
        <ChapterSelectField
          chapters={chapters}
          defaultValue={event?.chapterId}
          label="关联章节"
          name="chapterId"
        />
        <ChapterSelectField
          chapters={chapters}
          defaultValue={event?.sourceChapterId}
          label="来源章节"
          name="sourceChapterId"
        />
        <TextField
          defaultValue={event?.relatedCharacters}
          label="相关人物"
          name="relatedCharacters"
          placeholder="例如：陈远、李淑兰"
        />
        <SelectField
          defaultValue={event?.status || "active"}
          label="状态"
          name="status"
          options={timelineEventStatusOptions}
        />
      </div>
      <TextareaField
        defaultValue={event?.description}
        label="事件描述"
        name="description"
        placeholder="写清楚事件发生了什么，以及前后因果。"
        required
        rows={4}
      />
      <TextareaField
        defaultValue={event?.impact}
        label="事件影响"
        name="impact"
        placeholder="这个事件改变了角色、局势、资源、信息或后续行动的哪些部分。"
        rows={3}
      />
      <SubmitButton label={submitLabel} />
    </form>
  );
}

function MemorySection({
  children,
  description,
  icon: Icon,
  id,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: LucideIcon;
  id: string;
  title: string;
}) {
  return (
    <section
      className="scroll-mt-6 rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
      id={id}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-ink-700">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CompactCreatePanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <details className="rounded-lg border border-ink-950/10 bg-paper-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink-950">
        {title}
      </summary>
      <div className="mt-3 border-t border-ink-950/10 pt-3">{children}</div>
    </details>
  );
}

function AnchorCard({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <a
      className="rounded-lg border border-ink-950/10 bg-white p-3 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
      href={href}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
          <Icon aria-hidden="true" className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-ink-700">{description}</p>
        </div>
      </div>
    </a>
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
    <div className="rounded-lg border border-ink-950/10 bg-white p-3 shadow-panel">
      <div className="flex items-center gap-2 text-xs text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function ListLimitNotice({
  filterActive = false,
  label,
  loaded,
  total,
}: {
  filterActive?: boolean;
  label: string;
  loaded: number;
  total: number;
}) {
  const hiddenCount = Math.max(total - loaded, 0);

  return (
    <div className="mt-4 rounded-md border border-ink-950/10 bg-ink-950/[0.03] px-3 py-2 text-xs leading-5 text-ink-700">
      当前展示{filterActive ? "符合筛选条件的" : "按优先级排序的前"} {loaded} 条{label}，全量共 {total} 条。
      {hiddenCount > 0
        ? ` 还有 ${hiddenCount} 条未在本页展示，后续可通过分页或筛选继续管理。`
        : " 当前没有更多隐藏记录。"}
    </div>
  );
}

function ExpandableText({ value }: { value: string }) {
  const shouldExpand = value.length > 120 || value.includes("\n");

  return (
    <div className="mt-2 rounded-md border border-[#ce8f48]/20 bg-[#07191c]/[.85] p-3 text-sm leading-5 text-[#f5dfbd] shadow-[inset_0_1px_rgba(255,255,255,0.04)]">
      <p className={shouldExpand ? "line-clamp-2 whitespace-pre-wrap" : "whitespace-pre-wrap"}>
        {value}
      </p>
      {shouldExpand ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-[#6ee7d8] transition hover:text-[#9ffcf2]">
            展开全文 / 收起
          </summary>
          <p className="mt-2 whitespace-pre-wrap border-t border-[#ce8f48]/20 pt-2 text-[#f5dfbd]">
            {value}
          </p>
        </details>
      ) : null}
    </div>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  placeholder,
  required,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
      {label}
      <input
        className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
        defaultValue={defaultValue || ""}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function NumberField({
  defaultValue,
  label,
  name,
  placeholder,
}: {
  defaultValue?: number | null;
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
      {label}
      <input
        className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
        defaultValue={defaultValue ?? ""}
        min={1}
        name={name}
        placeholder={placeholder}
        type="number"
      />
    </label>
  );
}

function TextareaField({
  defaultValue,
  label,
  name,
  placeholder,
  required,
  rows,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
      {label}
      <textarea
        className="rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm leading-5 text-ink-950 outline-none"
        defaultValue={defaultValue || ""}
        name={name}
        placeholder={placeholder}
        required={required}
        rows={Math.min(rows, 3)}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string | null;
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
}) {
  const value = defaultValue || options[0]?.value;
  const hasValue = options.some((option) => option.value === value);

  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
      {label}
      <select
        className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
        defaultValue={value}
        name={name}
      >
        {value && !hasValue ? (
          <option value={value}>{value}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChapterSelectField({
  chapters,
  defaultValue,
  label,
  name,
}: {
  chapters: readonly ChapterOption[];
  defaultValue?: string | null;
  label: string;
  name: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
      {label}
      <select
        className="min-h-9 rounded-md border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-950 outline-none"
        defaultValue={defaultValue || ""}
        name={name}
      >
        <option value="">未指定</option>
        {chapters.map((chapter) => (
          <option key={chapter.id} value={chapter.id}>
            {chapterLabel(chapter)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
      type="submit"
    >
      <FileText aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "amber" | "cyan";
}) {
  const className =
    tone === "amber"
      ? "border border-[#d89b45]/35 bg-[#3a2611]/80 text-[#ffd28d]"
      : tone === "cyan"
        ? "border border-[#58d7c7]/30 bg-[#082d2f]/80 text-[#8df4e8]"
        : "border border-[#ce8f48]/25 bg-[#102326]/90 text-[#d9c199]";

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-950/15 bg-white/65 p-4 text-sm leading-6 text-ink-700">
      {text}
    </div>
  );
}

function chapterLabel(chapter: ChapterOption) {
  return `第 ${chapter.chapterNumber} 章《${chapter.title}》`;
}
