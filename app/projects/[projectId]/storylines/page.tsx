import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowLeft,
  BookOpenText,
  Bot,
  CheckCircle2,
  GitBranch,
  Layers3,
  ListChecks,
  type LucideIcon,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { AiBudgetNotice } from "@/components/ai/ai-budget-notice";
import {
  archiveStoryline,
  completeStoryline,
  createStoryline,
  generateStorylineDrafts,
  saveStorylineDraftCandidate,
  updateStoryline,
  updateStorylineDraftTaskAdoptionState,
} from "@/app/projects/[projectId]/storylines/actions";
import { FormActionButton } from "@/components/form-action-button";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { expireStaleStorylineAiTasks } from "@/lib/ai/storyline-task-maintenance";
import {
  parseStorylineGenerationOutput,
  storylineGenerationTaskType,
  type ParsedStorylineDraft,
} from "@/lib/ai/storylines";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
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
import { sortStorylines } from "@/lib/storyline-sort";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StorylinesPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    editId?: string;
    storylineAi?: string;
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

  await expireStaleStorylineAiTasks(projectId);

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
      aiTasks: {
        where: {
          taskType: storylineGenerationTaskType,
        },
        include: {
          promptTemplate: {
            select: {
              name: true,
              version: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
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
  const latestChapterNumber = Math.max(
    0,
    ...project.chapters.map((chapter) => chapter.chapterNumber),
  );
  const visibleStorylines = storylines.slice(0, 3);
  const hiddenStorylines = storylines.slice(3);
  const errorMessage =
    storylineValidationErrorMessages[
      query.storylineError as StorylineValidationErrorCode
    ];
  const savedMessage = storylineSavedMessage(query.storylineSaved);
  const aiMessage = storylineAiMessage(query.storylineAi);
  const hasActiveStorylineTask = project.aiTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const hasApiKey = hasConfiguredOpenAIKey();

  return (
    <div className="space-y-6" id="storylines">
      <AutoRefresh enabled={hasActiveStorylineTask} />
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

      {aiMessage ? (
        <div className="rounded-lg border border-signal-500/25 bg-signal-500/10 px-4 py-3 text-sm font-medium text-signal-800">
          {aiMessage}
        </div>
      ) : null}

      <StorylineAiDraftPanel
        characters={project.characters}
        chapters={project.chapters}
        foreshadows={project.foreshadows}
        hasActiveTask={hasActiveStorylineTask}
        hasApiKey={hasApiKey}
        outlines={project.outlines}
        projectId={project.id}
        tasks={project.aiTasks}
      />
      <AiBudgetNotice projectId={project.id} />

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
            {visibleStorylines.map((storyline) => (
              <StorylineCard
                characters={project.characters}
                chapters={project.chapters}
                foreshadows={project.foreshadows}
                isEditing={query.editId === storyline.id}
                key={storyline.id}
                latestChapterNumber={latestChapterNumber}
                outlines={project.outlines}
                projectId={project.id}
                storyline={storyline}
              />
            ))}
            {hiddenStorylines.length > 0 ? (
              <details
                className="rounded-lg border border-dashed border-ink-950/15 bg-paper-50/70 p-3"
                open={hiddenStorylines.some(
                  (storyline) => query.editId === storyline.id,
                )}
              >
                <summary className="cursor-pointer text-sm font-semibold text-ink-800">
                  展开历史故事线（{hiddenStorylines.length} 条）
                </summary>
                <div className="mt-3 space-y-3">
                  {hiddenStorylines.map((storyline) => (
                    <StorylineCard
                      characters={project.characters}
                      chapters={project.chapters}
                      foreshadows={project.foreshadows}
                      isEditing={query.editId === storyline.id}
                      key={storyline.id}
                      latestChapterNumber={latestChapterNumber}
                      outlines={project.outlines}
                      projectId={project.id}
                      storyline={storyline}
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function StorylineCard({
  characters,
  chapters,
  foreshadows,
  isEditing,
  latestChapterNumber,
  outlines,
  projectId,
  storyline,
}: {
  characters: readonly CharacterOption[];
  chapters: readonly ChapterOption[];
  foreshadows: readonly ForeshadowOption[];
  isEditing: boolean;
  latestChapterNumber: number;
  outlines: readonly OutlineOption[];
  projectId: string;
  storyline: StorylineWithRelations;
}) {
  const completionSuggestion = storylineCompletionSuggestion(
    storyline,
    latestChapterNumber,
  );

  return (
    <article
      className="rounded-lg border border-ink-950/10 bg-paper-50 p-3"
      id={`storyline-${storyline.id}`}
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
            href={`/projects/${projectId}/storylines?editId=${storyline.id}#storyline-${storyline.id}`}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            编辑
          </Link>
          {storyline.status !== "archived" ? (
            <form action={archiveStoryline.bind(null, projectId, storyline.id)}>
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

      {completionSuggestion ? (
        <div className="mt-3 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-semibold">可能可以收束</p>
          <p className="mt-1 leading-6">{completionSuggestion}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={completeStoryline.bind(null, projectId, storyline.id)}>
              <button
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                type="submit"
              >
                <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                标记完成
              </button>
            </form>
            <form action={archiveStoryline.bind(null, projectId, storyline.id)}>
              <button
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                type="submit"
              >
                <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                归档
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <CompactText label="当前进展" value={storyline.currentProgress} />
        <CompactText label="备注" value={storyline.notes} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <RelationSummary
          icon={Users}
          label="关联人物"
          values={storyline.characters.map((item) => item.character.name)}
        />
        <RelationSummary
          icon={BookOpenText}
          label="推进章节"
          values={storyline.chapters.map((item) => chapterLabel(item.chapter))}
        />
        <RelationSummary
          icon={Layers3}
          label="关联大纲"
          values={storyline.outlines.map((item) => outlineLabel(item.outline))}
        />
        <RelationSummary
          icon={ListChecks}
          label="关联伏笔"
          values={storyline.foreshadows.map((item) => item.foreshadow.content)}
        />
      </div>

      <p className="mt-3 text-xs text-ink-600">
        更新：{formatDate(storyline.updatedAt)}
      </p>

      {isEditing ? (
        <div className="mt-4 rounded-lg border border-ink-950/10 bg-white p-3">
          <h4 className="text-sm font-semibold text-ink-950">编辑故事线</h4>
          <div className="mt-3">
            <StorylineForm
              action={updateStoryline.bind(null, projectId, storyline.id)}
              characters={characters}
              chapters={chapters}
              foreshadows={foreshadows}
              outlines={outlines}
              storyline={storylineFormInitialFromRecord(storyline)}
              submitLabel="保存修改"
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function StorylineAiDraftPanel({
  characters,
  chapters,
  foreshadows,
  hasActiveTask,
  hasApiKey,
  outlines,
  projectId,
  tasks,
}: {
  characters: readonly CharacterOption[];
  chapters: readonly ChapterOption[];
  foreshadows: readonly ForeshadowOption[];
  hasActiveTask: boolean;
  hasApiKey: boolean;
  outlines: readonly OutlineOption[];
  projectId: string;
  tasks: readonly StorylineAiTask[];
}) {
  const canGenerate = hasApiKey && !hasActiveTask;

  return (
    <section
      className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
      id="storyline-ai"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            AI 故事线草案
          </p>
          <h2 className="mt-1.5 text-base font-semibold text-ink-950">
            自动梳理故事线候选
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-700">
            AI 会读取项目设定、角色、伏笔、章节和大纲，生成可审阅候选；保存前都可以手动修改，正式故事线只会在你确认后写入。
          </p>
        </div>
      </div>

      <PreserveScrollForm
        action={generateStorylineDrafts.bind(null, projectId)}
        className="mt-4 flex flex-wrap items-center gap-3"
        preserveKey={`storyline-generation-${projectId}`}
        statusText="已开始生成故事线候选，页面会留在当前位置并自动刷新结果。"
      >
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!canGenerate}
          type="submit"
        >
          <Bot aria-hidden="true" className="h-4 w-4" />
          {hasActiveTask ? "生成中" : "生成故事线候选"}
        </button>
        {!hasApiKey ? (
          <p className="text-sm text-ink-700">
            未配置 API Key，暂不能调用模型；已有候选任务仍可查看。
          </p>
        ) : null}
        {hasActiveTask ? (
          <p className="text-sm text-ink-700">
            当前已有故事线生成任务在后台运行，完成前不会重复发起。
          </p>
        ) : null}
      </PreserveScrollForm>

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-ink-950/15 bg-paper-50 p-4 text-sm text-ink-700">
          还没有故事线候选任务。生成后会显示候选故事线，每条都可以先改再保存。
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {tasks.map((task) => (
            <StorylineAiTaskCard
              characters={characters}
              chapters={chapters}
              foreshadows={foreshadows}
              key={task.id}
              outlines={outlines}
              projectId={projectId}
              task={task}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StorylineAiTaskCard({
  characters,
  chapters,
  foreshadows,
  outlines,
  projectId,
  task,
}: {
  characters: readonly CharacterOption[];
  chapters: readonly ChapterOption[];
  foreshadows: readonly ForeshadowOption[];
  outlines: readonly OutlineOption[];
  projectId: string;
  task: StorylineAiTask;
}) {
  const drafts = parseStorylineGenerationOutput(task.outputText);
  const canReview =
    task.status === "completed" &&
    task.adoptionState === "not_reviewed" &&
    drafts.length > 0;

  return (
    <article className="rounded-lg border border-ink-950/10 bg-paper-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{aiTaskStatusLabel(task.status)}</Badge>
            <Badge>{aiTaskAdoptionLabel(task.adoptionState)}</Badge>
            <Badge>{formatDate(task.createdAt)}</Badge>
          </div>
          <p className="mt-3 text-sm font-semibold text-ink-950">
            {task.promptTemplate
              ? `${task.promptTemplate.name} v${task.promptTemplate.version}`
              : "故事线草案生成"}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            {task.inputContextSummary}
          </p>
        </div>

        {canReview ? (
          <div className="flex flex-wrap gap-2">
            <form
              action={updateStorylineDraftTaskAdoptionState.bind(
                null,
                projectId,
                task.id,
                "adopted",
              )}
            >
              <button
                className="inline-flex min-h-9 items-center rounded-md border border-ink-950/15 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
                type="submit"
              >
                标记已整理
              </button>
            </form>
            <form
              action={updateStorylineDraftTaskAdoptionState.bind(
                null,
                projectId,
                task.id,
                "rejected",
              )}
            >
              <button
                className="inline-flex min-h-9 items-center rounded-md border border-ink-950/15 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
                type="submit"
              >
                忽略候选
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {task.status === "failed" ? (
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-ember-500/10 p-3 text-xs leading-5 text-ember-700">
          {task.errorMessage || "故事线候选生成失败。"}
        </pre>
      ) : null}

      {task.status !== "completed" ? (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-ink-700">
          任务正在后台处理，页面会自动刷新。
        </p>
      ) : null}

      {task.status === "completed" && drafts.length === 0 ? (
        <details className="mt-3 rounded-md bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink-800">
            未解析到可保存候选，查看原始输出
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-ink-700">
            {task.outputText || "任务没有输出。"}
          </pre>
        </details>
      ) : null}

      {drafts.length > 0 ? (
        <div className="mt-4 space-y-3">
          {drafts.map((draft, index) => (
            <details
              className="rounded-lg border border-ink-950/10 bg-white p-3"
              key={`${task.id}-${index}-${draft.name}`}
              open={index === 0 && canReview}
            >
              <summary className="cursor-pointer text-sm font-semibold text-ink-950">
                {draft.name}
                <span className="ml-2 text-xs font-normal text-ink-600">
                  {storylineTypeLabel(draft.type)} /{" "}
                  {storylineStatusLabel(draft.status)}
                </span>
              </summary>
              {draft.rationale ? (
                <p className="mt-2 rounded-md bg-paper-50 px-3 py-2 text-xs leading-5 text-ink-700">
                  推荐理由：{draft.rationale}
                </p>
              ) : null}
              {canReview ? (
                <div className="mt-3">
                  <StorylineForm
                    action={saveStorylineDraftCandidate.bind(
                      null,
                      projectId,
                      task.id,
                    )}
                    characters={characters}
                    chapters={chapters}
                    foreshadows={foreshadows}
                    outlines={outlines}
                    storyline={storylineFormInitialFromDraft(draft)}
                    submitLabel="确认保存这条故事线"
                  />
                </div>
              ) : (
                <CompactText
                  label="候选内容"
                  value={[draft.coreGoal, draft.currentProgress]
                    .filter(Boolean)
                    .join("\n")}
                />
              )}
            </details>
          ))}
        </div>
      ) : null}
    </article>
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
  storyline?: StorylineFormInitial;
  submitLabel: string;
}) {
  const selectedCharacterIds = new Set(storyline?.characterIds ?? []);
  const selectedForeshadowIds = new Set(storyline?.foreshadowIds ?? []);
  const selectedChapterIds = new Set(storyline?.chapterIds ?? []);
  const selectedOutlineIds = new Set(storyline?.outlineIds ?? []);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm font-semibold text-ink-800 xl:col-span-2">
          <span>故事线名称</span>
          <input
            className="min-h-10 w-full rounded-md border border-ink-950/15 bg-white px-3 text-sm text-ink-950 outline-none transition focus:border-signal-500"
            defaultValue={storyline?.name ?? ""}
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

function storylineCompletionSuggestion(
  storyline: StorylineWithRelations,
  latestChapterNumber: number,
) {
  if (storyline.status === "completed" || storyline.status === "archived") {
    return null;
  }

  const linkedChapters = storyline.chapters.map((item) => item.chapter);
  const allLinkedChaptersSettled =
    linkedChapters.length > 0 &&
    linkedChapters.every((chapter) =>
      ["final", "published"].includes(chapter.status),
    );
  const reachedEndChapter =
    typeof storyline.endChapter === "number" &&
    latestChapterNumber >= storyline.endChapter;

  if (reachedEndChapter && allLinkedChaptersSettled) {
    return `当前项目已写到第 ${formatNumber(
      latestChapterNumber,
    )} 章，已到达这条故事线的结束章节；关联章节也都已定稿或发布，可以检查是否标记完成或归档。`;
  }

  if (reachedEndChapter) {
    return `当前项目已写到第 ${formatNumber(
      latestChapterNumber,
    )} 章，已到达这条故事线的结束章节。系统不会自动改状态，你可以确认是否标记完成或归档。`;
  }

  if (!storyline.endChapter && allLinkedChaptersSettled) {
    return "这条故事线关联的章节都已定稿或发布，且未设置后续结束章节；可以检查是否已经完成阶段性任务。";
  }

  return null;
}

function storylineSavedMessage(value?: string) {
  switch (value) {
    case "created":
      return "已保存故事线。";
    case "adopted":
      return "已从 AI 候选保存为正式故事线。";
    case "updated":
      return "已更新故事线。";
    case "completed":
      return "已标记故事线完成。";
    case "archived":
      return "已归档故事线。";
    case "already-updated":
      return "这条故事线状态已经变化，页面已刷新当前状态。";
    default:
      return null;
  }
}

function storylineAiMessage(value?: string) {
  switch (value) {
    case "started":
      return "已开始生成故事线候选，完成后会在下方显示。";
    case "active":
      return "已有故事线候选任务正在运行，请等待当前任务完成。";
    case "already-reviewed":
      return "这组故事线候选已经被整理或忽略，页面已刷新当前状态。";
    default:
      return null;
  }
}

function storylineFormInitialFromRecord(
  storyline: StorylineWithRelations,
): StorylineFormInitial {
  return {
    name: storyline.name,
    type: storyline.type,
    status: storyline.status,
    startChapter: storyline.startChapter,
    endChapter: storyline.endChapter,
    coreGoal: storyline.coreGoal,
    currentProgress: storyline.currentProgress,
    notes: storyline.notes,
    characterIds: storyline.characters.map((item) => item.characterId),
    foreshadowIds: storyline.foreshadows.map((item) => item.foreshadowId),
    chapterIds: storyline.chapters.map((item) => item.chapterId),
    outlineIds: storyline.outlines.map((item) => item.outlineId),
  };
}

function storylineFormInitialFromDraft(
  draft: ParsedStorylineDraft,
): StorylineFormInitial {
  return {
    name: draft.name,
    type: draft.type,
    status: draft.status,
    startChapter: draft.startChapter,
    endChapter: draft.endChapter,
    coreGoal: draft.coreGoal,
    currentProgress: draft.currentProgress,
    notes: draft.notes,
    characterIds: draft.characterIds,
    foreshadowIds: draft.foreshadowIds,
    chapterIds: draft.chapterIds,
    outlineIds: draft.outlineIds,
  };
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

type StorylineFormInitial = {
  name?: string | null;
  type?: string | null;
  status?: string | null;
  startChapter?: number | null;
  endChapter?: number | null;
  coreGoal?: string | null;
  currentProgress?: string | null;
  notes?: string | null;
  characterIds?: string[];
  foreshadowIds?: string[];
  chapterIds?: string[];
  outlineIds?: string[];
};

type StorylineAiTask = {
  id: string;
  status: string;
  adoptionState: string;
  inputContextSummary: string;
  outputText: string | null;
  errorMessage: string | null;
  createdAt: Date;
  promptTemplate: {
    name: string;
    version: number;
  } | null;
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
