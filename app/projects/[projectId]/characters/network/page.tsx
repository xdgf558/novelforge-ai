import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowLeft,
  Bot,
  CheckCircle,
  GitFork,
  Network,
  Pencil,
  Plus,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PreserveScrollForm } from "@/components/preserve-scroll-form";
import {
  adoptCharacterRelationshipDrafts,
  archiveCharacterRelationship,
  createCharacterRelationship,
  generateCharacterRelationshipDrafts,
  rejectCharacterRelationshipDrafts,
  updateCharacterRelationship,
} from "@/app/projects/[projectId]/characters/network/actions";
import { expireStaleCharacterRelationshipAiTasks } from "@/lib/ai/character-relationship-task-maintenance";
import {
  characterRelationshipGenerationTaskType,
  parseCharacterRelationshipGenerationOutput,
  type ParsedCharacterRelationshipDraft,
} from "@/lib/ai/character-relationships";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import {
  characterRelationshipDirectionOptions,
  characterRelationshipErrorMessages,
  characterRelationshipStatusOptions,
  characterRelationshipTypeOptions,
  relationshipDirectionLabel,
  relationshipStatusLabel,
  relationshipTypeLabel,
} from "@/lib/character-relationship-fields";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CharacterRelationshipNetworkPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    editId?: string;
    relationshipAdopted?: string;
    relationshipError?: string;
  }>;
};

type CharacterOption = {
  id: string;
  name: string;
  roleInStory: string | null;
  status: string;
};

type ChapterOption = {
  id: string;
  chapterNumber: number;
  title: string;
};

type RelationshipRecord = {
  id: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  relationshipType: string;
  direction: string;
  status: string;
  summary: string;
  dynamics: string | null;
  evidence: string | null;
  sourceChapterId: string | null;
  updatedAt: Date;
  sourceCharacter: { name: string };
  targetCharacter: { name: string };
  sourceChapter: { chapterNumber: number; title: string } | null;
};

type RelationshipTaskRecord = {
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

export default async function CharacterRelationshipNetworkPage({
  params,
  searchParams,
}: CharacterRelationshipNetworkPageProps) {
  const { projectId } = await params;
  const { editId, relationshipAdopted, relationshipError } = await searchParams;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!project) {
    notFound();
  }

  await expireStaleCharacterRelationshipAiTasks(projectId);

  const [
    characters,
    chapters,
    relationships,
    relationshipTasks,
    relationshipCount,
    activeRelationshipCount,
    hiddenRelationshipCount,
    tensionRelationshipCount,
  ] = await Promise.all([
    prisma.character.findMany({
      where: {
        projectId,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        roleInStory: true,
        status: true,
      },
    }),
    prisma.chapter.findMany({
      where: {
        projectId,
      },
      orderBy: {
        chapterNumber: "asc",
      },
      select: {
        id: true,
        chapterNumber: true,
        title: true,
      },
    }),
    prisma.characterRelationship.findMany({
      where: {
        projectId,
      },
      include: {
        sourceCharacter: {
          select: {
            name: true,
          },
        },
        targetCharacter: {
          select: {
            name: true,
          },
        },
        sourceChapter: {
          select: {
            chapterNumber: true,
            title: true,
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
      take: 80,
    }),
    prisma.aiTask.findMany({
      where: {
        projectId,
        taskType: characterRelationshipGenerationTaskType,
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
    }),
    prisma.characterRelationship.count({
      where: {
        projectId,
      },
    }),
    prisma.characterRelationship.count({
      where: {
        projectId,
        status: "active",
      },
    }),
    prisma.characterRelationship.count({
      where: {
        projectId,
        status: "hidden",
      },
    }),
    prisma.characterRelationship.count({
      where: {
        projectId,
        status: "tension",
      },
    }),
  ]);

  const editRelationship = editId
    ? relationships.find((relationship) => relationship.id === editId)
    : null;
  const activeCharacters = characters.filter(
    (character) => character.status !== "archived",
  );
  const hasActiveRelationshipTask = relationshipTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const hasApiKey = hasConfiguredOpenAIKey();

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasActiveRelationshipTask} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${project.id}/characters`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回角色库
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            人物关系网络
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            维护角色之间的亲疏、冲突、隐秘关系和阶段变化。关系网络会进入项目导出，并作为后续人物生成的上下文。
          </p>
        </div>
      </div>

      {relationshipError ? (
        <div className="rounded-lg border border-ember-500/30 bg-ember-500/10 p-4 text-sm font-medium text-ember-700">
          {characterRelationshipErrorMessages[relationshipError] ??
            characterRelationshipErrorMessages.invalidForm}
        </div>
      ) : null}

      {relationshipAdopted ? (
        <div className="rounded-lg border border-signal-500/30 bg-signal-500/10 p-4 text-sm font-medium text-signal-700">
          已采用 {relationshipAdopted} 条 AI 人物关系草案，并写入正式关系网络。
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <InfoTile
          icon={Users}
          label="可用角色"
          value={`${activeCharacters.length} 个`}
        />
        <InfoTile icon={Network} label="关系总数" value={`${relationshipCount} 条`} />
        <InfoTile
          icon={GitFork}
          label="活跃关系"
          value={`${activeRelationshipCount} 条`}
        />
        <InfoTile
          icon={Archive}
          label="隐藏/紧张"
          value={`${hiddenRelationshipCount + tensionRelationshipCount} 条`}
        />
      </section>

      <CharacterRelationshipAiPanel
        activeCharacterCount={activeCharacters.length}
        hasActiveTask={hasActiveRelationshipTask}
        hasApiKey={hasApiKey}
        projectId={project.id}
        tasks={relationshipTasks}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <div className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink-950">
            新增人物关系
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-700">
            至少需要两个角色才能建立关系。这里保存的是正式关系网络，不会由 AI 自动写入。
          </p>

          {activeCharacters.length < 2 ? (
            <div className="mt-5 rounded-lg border border-dashed border-ink-950/15 bg-paper-50 p-5 text-sm text-ink-700">
              角色数量不足。请先在角色库中创建至少两个角色。
            </div>
          ) : (
            <RelationshipForm
              action={createCharacterRelationship.bind(null, project.id)}
              characters={activeCharacters}
              chapters={chapters}
              submitLabel="新增关系"
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink-950">
              已保存关系
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              当前展示最多 80 条关系；归档记录保留在列表中，便于追溯长篇连载中的关系变化。
            </p>
          </div>

          {relationships.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink-950/15 bg-white/70 p-8 text-center">
              <Network
                aria-hidden="true"
                className="mx-auto h-8 w-8 text-signal-600"
              />
              <h2 className="mt-4 text-lg font-semibold text-ink-950">
                还没有人物关系
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
                建立人物关系后，后续 AI 生成人物时会知道谁是同盟、谁有冲突、谁隐藏信息。
              </p>
            </div>
          ) : (
            relationships.map((relationship) => (
              <article
                className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel"
                key={relationship.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{relationshipTypeLabel(relationship.relationshipType)}</Badge>
                      <Badge>{relationshipStatusLabel(relationship.status)}</Badge>
                      <Badge>{relationshipDirectionLabel(relationship.direction)}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-ink-950">
                      {relationship.sourceCharacter.name} →{" "}
                      {relationship.targetCharacter.name}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                      {relationship.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
                      href={`/projects/${project.id}/characters/network?editId=${relationship.id}`}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                      编辑
                    </Link>
                    {relationship.status !== "archived" ? (
                      <form
                        action={archiveCharacterRelationship.bind(
                          null,
                          project.id,
                          relationship.id,
                        )}
                      >
                        <button
                          className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
                          type="submit"
                        >
                          <Archive aria-hidden="true" className="h-4 w-4" />
                          归档
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <Detail label="阶段变化" value={relationship.dynamics} />
                  <Detail label="证据" value={relationship.evidence} />
                  <Detail
                    label="来源章节"
                    value={
                      relationship.sourceChapter
                        ? `第 ${relationship.sourceChapter.chapterNumber} 章 ${relationship.sourceChapter.title}`
                        : ""
                    }
                  />
                </dl>
                <p className="mt-4 text-xs text-ink-700">
                  最近更新：{formatDate(relationship.updatedAt)}
                </p>

                {editRelationship?.id === relationship.id ? (
                  <div className="mt-5 rounded-lg border border-ink-950/10 bg-paper-50 p-4">
                    <h4 className="text-sm font-semibold text-ink-950">
                      编辑这条关系
                    </h4>
                    <RelationshipForm
                      action={updateCharacterRelationship.bind(
                        null,
                        project.id,
                        relationship.id,
                      )}
                      characters={characterOptionsForRelationship(
                        activeCharacters,
                        characters,
                        relationship,
                      )}
                      chapters={chapters}
                      initial={relationship}
                      submitLabel="保存关系"
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function CharacterRelationshipAiPanel({
  activeCharacterCount,
  hasActiveTask,
  hasApiKey,
  projectId,
  tasks,
}: {
  activeCharacterCount: number;
  hasActiveTask: boolean;
  hasApiKey: boolean;
  projectId: string;
  tasks: readonly RelationshipTaskRecord[];
}) {
  const canGenerate = hasApiKey && !hasActiveTask && activeCharacterCount >= 2;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            AI 人物关系草案
          </p>
          <h2 className="mt-2 text-lg font-semibold text-ink-950">
            一键生成可审阅关系网络建议
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            AI 会参考项目设定、已有角色、现有人物关系、大纲和最近章节摘要，生成候选关系。只有点击采用后，才会写入正式人物关系网络。
          </p>
        </div>

        <PreserveScrollForm
          action={generateCharacterRelationshipDrafts.bind(null, projectId)}
          preserveKey={`character-relationship-generation-${projectId}`}
          statusText="已开始生成人物关系草案，页面会留在当前位置并自动刷新结果。"
        >
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canGenerate}
            type="submit"
          >
            <Bot aria-hidden="true" className="h-4 w-4" />
            {hasActiveTask ? "生成中" : "生成关系草案"}
          </button>
        </PreserveScrollForm>
      </div>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有关系草案任务仍可查看和采用。
        </p>
      ) : null}

      {activeCharacterCount < 2 ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          至少需要两个未归档角色，才能生成关系草案。
        </p>
      ) : null}

      {hasActiveTask ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前已有人物关系生成任务在后台运行，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/15 bg-paper-50 p-5 text-sm text-ink-700">
          还没有人物关系草案任务。生成后会在这里显示模型、状态、输出和采用按钮。
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {tasks.map((task) => (
            <CharacterRelationshipTaskCard
              key={task.id}
              projectId={projectId}
              task={task}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CharacterRelationshipTaskCard({
  projectId,
  task,
}: {
  projectId: string;
  task: RelationshipTaskRecord;
}) {
  const drafts = parseCharacterRelationshipGenerationOutput(task.outputText);
  const canAdopt =
    task.status === "completed" &&
    task.adoptionState === "not_reviewed" &&
    drafts.length > 0;
  const canReject =
    task.status === "completed" && task.adoptionState === "not_reviewed";

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
              : "人物关系草案生成"}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-700">
            {task.inputContextSummary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canAdopt ? (
            <form
              action={adoptCharacterRelationshipDrafts.bind(
                null,
                projectId,
                task.id,
              )}
            >
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-ink-800"
                type="submit"
              >
                <CheckCircle aria-hidden="true" className="h-4 w-4" />
                采用全部可用关系
              </button>
            </form>
          ) : null}

          {canReject ? (
            <form
              action={rejectCharacterRelationshipDrafts.bind(
                null,
                projectId,
                task.id,
              )}
            >
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition hover:bg-paper-100"
                type="submit"
              >
                <XCircle aria-hidden="true" className="h-4 w-4" />
                拒绝草案
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {drafts.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {drafts.map((draft, index) => (
            <RelationshipDraftCard draft={draft} index={index} key={index} />
          ))}
        </div>
      ) : (
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-ink-950/5 p-4 text-xs leading-5 text-ink-800">
          {task.outputText || task.errorMessage || "任务尚未产生输出。"}
        </pre>
      )}
    </article>
  );
}

function RelationshipDraftCard({
  draft,
  index,
}: {
  draft: ParsedCharacterRelationshipDraft;
  index: number;
}) {
  const source = draft.sourceCharacterName || draft.sourceCharacterId || "未知";
  const target = draft.targetCharacterName || draft.targetCharacterId || "未知";

  return (
    <div className="rounded-md border border-ink-950/10 bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <Badge>#{index + 1}</Badge>
        <Badge>{relationshipTypeLabel(draft.relationshipType)}</Badge>
        <Badge>{relationshipStatusLabel(draft.status)}</Badge>
        <Badge>{relationshipDirectionLabel(draft.direction)}</Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink-950">
        {source} → {target}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">
        {draft.summary}
      </p>
      {draft.dynamics ? (
        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-ink-700">
          阶段变化：{draft.dynamics}
        </p>
      ) : null}
      {draft.evidence || draft.rationale ? (
        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-ink-700">
          {[draft.evidence, draft.rationale].filter(Boolean).join("\n")}
        </p>
      ) : null}
    </div>
  );
}

function RelationshipForm({
  action,
  characters,
  chapters,
  initial,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  characters: readonly CharacterOption[];
  chapters: readonly ChapterOption[];
  initial?: Partial<RelationshipRecord> | null;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          defaultValue={initial?.sourceCharacterId ?? ""}
          label="关系起点"
          name="sourceCharacterId"
          options={characters.map((character) => ({
            value: character.id,
            label: characterOptionLabel(character),
          }))}
        />
        <SelectField
          defaultValue={initial?.targetCharacterId ?? ""}
          label="关系终点"
          name="targetCharacterId"
          options={characters.map((character) => ({
            value: character.id,
            label: characterOptionLabel(character),
          }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          defaultValue={initial?.relationshipType ?? "other"}
          label="关系类型"
          name="relationshipType"
          options={characterRelationshipTypeOptions}
        />
        <SelectField
          defaultValue={initial?.direction ?? "two_way"}
          label="方向"
          name="direction"
          options={characterRelationshipDirectionOptions}
        />
        <SelectField
          defaultValue={initial?.status ?? "active"}
          label="状态"
          name="status"
          options={characterRelationshipStatusOptions}
        />
      </div>

      <TextareaField
        defaultValue={initial?.summary ?? ""}
        label="关系摘要"
        name="summary"
        placeholder="例如：两人从发小变成创业搭档，但在资金和眼界差距扩大后会出现裂缝。"
        rows={4}
      />
      <TextareaField
        defaultValue={initial?.dynamics ?? ""}
        label="阶段变化"
        name="dynamics"
        placeholder="记录这段关系当前阶段、未来变化或需要提醒 AI 的边界。"
        rows={3}
      />
      <TextareaField
        defaultValue={initial?.evidence ?? ""}
        label="证据"
        name="evidence"
        placeholder="引用章节中的对话、行为、冲突或作者备注。"
        rows={3}
      />
      <SelectField
        allowEmpty
        defaultValue={initial?.sourceChapterId ?? ""}
        label="来源章节"
        name="sourceChapterId"
        options={chapters.map((chapter) => ({
          value: chapter.id,
          label: `第 ${chapter.chapterNumber} 章 ${chapter.title}`,
        }))}
      />

      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
        type="submit"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {submitLabel}
      </button>
    </form>
  );
}

function SelectField({
  allowEmpty,
  defaultValue,
  label,
  name,
  options,
}: {
  allowEmpty?: boolean;
  defaultValue: string;
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm font-semibold text-ink-800">
      {label}
      <select
        className="mt-2 min-h-10 w-full rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
        defaultValue={defaultValue}
        name={name}
      >
        {allowEmpty ? <option value="">不关联</option> : null}
        {!allowEmpty ? <option value="">请选择</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  defaultValue,
  label,
  name,
  placeholder,
  rows,
}: {
  defaultValue: string;
  label: string;
  name: string;
  placeholder: string;
  rows: number;
}) {
  return (
    <label className="block text-sm font-semibold text-ink-800">
      {label}
      <textarea
        className="mt-2 w-full rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <Icon aria-hidden="true" className="h-5 w-5 text-signal-600" />
      <p className="mt-3 text-sm text-ink-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md bg-paper-50 p-3">
      <dt className="text-xs font-semibold text-ink-700">{label}</dt>
      <dd className="mt-1 line-clamp-4 whitespace-pre-wrap font-medium text-ink-950">
        {value || "未设置"}
      </dd>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-paper-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
      {children}
    </span>
  );
}

function characterOptionLabel(character: CharacterOption) {
  return [
    character.name,
    character.roleInStory,
    character.status === "archived" ? "已归档" : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function characterOptionsForRelationship(
  activeCharacters: readonly CharacterOption[],
  allCharacters: readonly CharacterOption[],
  relationship: RelationshipRecord,
) {
  const options = [...activeCharacters];

  for (const characterId of [
    relationship.sourceCharacterId,
    relationship.targetCharacterId,
  ]) {
    if (options.some((character) => character.id === characterId)) {
      continue;
    }

    const archivedCharacter = allCharacters.find(
      (character) => character.id === characterId,
    );

    if (archivedCharacter) {
      options.push(archivedCharacter);
    }
  }

  return options;
}
