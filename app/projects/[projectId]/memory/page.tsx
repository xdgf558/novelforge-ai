import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ListChecks,
  Route,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  createForeshadow,
  createTimelineEvent,
  createWorldRule,
  deleteForeshadow,
  deleteTimelineEvent,
  deleteWorldRule,
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
    memoryError?: string;
  }>;
};

type ChapterOption = {
  id: string;
  chapterNumber: number;
  title: string;
};

export default async function MemoryPage({
  params,
  searchParams,
}: MemoryPageProps) {
  const { projectId } = await params;
  const query = (await searchParams) ?? {};
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
        orderBy: [{ isCore: "desc" }, { status: "asc" }, { updatedAt: "desc" }],
      },
      foreshadows: {
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
      },
      timelineEvents: {
        include: {
          chapter: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
            },
          },
        },
        orderBy: [{ storyTime: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const chapters = project.chapters;
  const chapterLabelById = new Map(
    chapters.map((chapter) => [chapter.id, chapterLabel(chapter)]),
  );
  const memoryErrorMessage =
    storyMemoryValidationErrorMessages[
      query.memoryError as StoryMemoryValidationErrorCode
    ];
  const activeWorldRuleCount = project.worldRules.filter(
    (rule) => rule.status === "active",
  ).length;
  const unresolvedForeshadowCount = project.foreshadows.filter(
    (foreshadow) => foreshadow.status !== "resolved",
  ).length;

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

      <section className="grid gap-4 md:grid-cols-3">
        <InfoTile
          icon={ShieldCheck}
          label="世界观规则"
          value={`${activeWorldRuleCount} 条生效`}
        />
        <InfoTile
          icon={ListChecks}
          label="伏笔池"
          value={`${unresolvedForeshadowCount} 条待跟进`}
        />
        <InfoTile
          icon={Route}
          label="时间线"
          value={`${project.timelineEvents.length} 个事件`}
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
        <WorldRuleForm
          action={createWorldRule.bind(null, project.id)}
          chapters={chapters}
          submitLabel="新增规则"
        />
        <div className="mt-5 space-y-4">
          {project.worldRules.length === 0 ? (
            <EmptyState text="还没有世界观规则。可以先录入技术规则、社会规则、代价机制或禁忌规则。" />
          ) : (
            project.worldRules.map((rule) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                key={rule.id}
              >
                <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {rule.isCore ? <Badge tone="amber">核心规则</Badge> : null}
                      <Badge>{worldRuleStatusLabel(rule.status)}</Badge>
                      <Badge>{memoryRiskLevelLabel(rule.riskLevel)}</Badge>
                      <Badge>{worldRuleCategoryLabel(rule.category)}</Badge>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-ink-950">
                      {rule.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-700">
                      来源章节：{chapterLabelById.get(rule.sourceChapterId || "") || "未指定"} / 更新：{formatDate(rule.updatedAt)}
                    </p>
                  </div>
                  <form action={deleteWorldRule.bind(null, project.id, rule.id)}>
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      type="submit"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </form>
                </div>
                <WorldRuleForm
                  action={updateWorldRule.bind(null, project.id, rule.id)}
                  chapters={chapters}
                  rule={rule}
                  submitLabel="保存规则"
                />
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
        <ForeshadowForm
          action={createForeshadow.bind(null, project.id)}
          chapters={chapters}
          submitLabel="新增伏笔"
        />
        <div className="mt-5 space-y-4">
          {project.foreshadows.length === 0 ? (
            <EmptyState text="还没有伏笔记录。可以手动补充章节埋点，也可以先从待审更新中批准 AI 提取的伏笔。" />
          ) : (
            project.foreshadows.map((foreshadow) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                key={foreshadow.id}
              >
                <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{foreshadowStatusLabel(foreshadow.status)}</Badge>
                      <Badge>{foreshadowImportanceLabel(foreshadow.importance)}</Badge>
                      {foreshadow.expectedResolveChapter ? (
                        <Badge tone="cyan">
                          预计第 {foreshadow.expectedResolveChapter} 章回收
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-ink-950">
                      {foreshadow.content}
                    </h3>
                    <p className="mt-1 text-xs text-ink-700">
                      埋设：{foreshadow.plantedChapter ? chapterLabel(foreshadow.plantedChapter) : "未指定"} / 回收：{foreshadow.resolvedChapter ? chapterLabel(foreshadow.resolvedChapter) : "未指定"}
                    </p>
                  </div>
                  <form
                    action={deleteForeshadow.bind(null, project.id, foreshadow.id)}
                  >
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      type="submit"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </form>
                </div>
                <ForeshadowForm
                  action={updateForeshadow.bind(null, project.id, foreshadow.id)}
                  chapters={chapters}
                  foreshadow={foreshadow}
                  submitLabel="保存伏笔"
                />
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
        <TimelineEventForm
          action={createTimelineEvent.bind(null, project.id)}
          chapters={chapters}
          submitLabel="新增事件"
        />
        <div className="mt-5 space-y-4">
          {project.timelineEvents.length === 0 ? (
            <EmptyState text="还没有时间线事件。先记录开篇锚点、关键交易、角色关系转折或重大冲突节点。" />
          ) : (
            project.timelineEvents.map((event) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                key={event.id}
              >
                <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {event.storyTime ? <Badge>{event.storyTime}</Badge> : null}
                      {event.location ? <Badge tone="cyan">{event.location}</Badge> : null}
                      {event.chapter ? (
                        <Badge tone="amber">{chapterLabel(event.chapter)}</Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-ink-950">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-700">
                      更新：{formatDate(event.updatedAt)}
                    </p>
                  </div>
                  <form
                    action={deleteTimelineEvent.bind(null, project.id, event.id)}
                  >
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      type="submit"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </form>
                </div>
                <TimelineEventForm
                  action={updateTimelineEvent.bind(null, project.id, event.id)}
                  chapters={chapters}
                  event={event}
                  submitLabel="保存事件"
                />
              </article>
            ))
          )}
        </div>
      </MemorySection>
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
    <form action={action} className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
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
      <div className="grid gap-3 lg:grid-cols-2">
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
    <form action={action} className="space-y-4">
      <TextareaField
        defaultValue={foreshadow?.content}
        label="伏笔内容"
        name="content"
        placeholder="记录线索、异常信息、需要回收的承诺或长期悬念。"
        required
        rows={4}
      />
      <div className="grid gap-3 lg:grid-cols-3">
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
      <div className="grid gap-3 lg:grid-cols-3">
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
    chapterId: string | null;
    sourceChapterId: string | null;
  };
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
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
      className="scroll-mt-6 rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
      id={id}
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">{description}</p>
        </div>
      </div>
      {children}
    </section>
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
      className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
      href={href}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
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
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <Icon aria-hidden="true" className="h-4 w-4 text-signal-600" />
        {label}
      </div>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
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
        className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
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
        className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
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
        className="rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none"
        defaultValue={defaultValue || ""}
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
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
        className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
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
        className="min-h-10 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm text-ink-950 outline-none"
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
      ? "bg-ember-500/10 text-ember-600"
      : tone === "cyan"
        ? "bg-signal-500/10 text-signal-700"
        : "bg-ink-950/5 text-ink-700";

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
