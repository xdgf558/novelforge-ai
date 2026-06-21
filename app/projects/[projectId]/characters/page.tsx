import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Network, Plus, Sparkles, Users } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  adoptCharacterDraft,
  generateCharacterDraft,
} from "@/app/projects/[projectId]/characters/actions";
import { expireStaleCharacterAiTasks } from "@/lib/ai/character-task-maintenance";
import {
  aiTaskAdoptionLabel,
  aiTaskStatusLabel,
  isActiveAiTaskStatus,
} from "@/lib/ai/status";
import { hasConfiguredOpenAIKey } from "@/lib/ai/openai-client";
import { characterRelationshipErrorMessages } from "@/lib/character-relationship-fields";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CharacterListPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    characterError?: string;
  }>;
};

export default async function CharacterListPage({
  params,
  searchParams,
}: CharacterListPageProps) {
  const { projectId } = await params;
  const { characterError } = await searchParams;
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

  await expireStaleCharacterAiTasks(projectId);

  const [characters, generationTasks] = await Promise.all([
    prisma.character.findMany({
      where: {
        projectId,
      },
      include: {
        _count: {
          select: {
            versions: true,
          },
        },
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          name: "asc",
        },
      ],
    }),
    prisma.aiTask.findMany({
      where: {
        projectId,
        taskType: "character_generation",
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
  ]);
  const hasActiveCharacterTask = generationTasks.some((task) =>
    isActiveAiTaskStatus(task.status),
  );
  const hasApiKey = hasConfiguredOpenAIKey();

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={hasActiveCharacterTask} />
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
            角色库
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            管理角色身份、动机、秘密、信息边界和说话规则，为后续章节生成和连续性检查提供结构化记忆。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${project.id}/characters/network`}
          >
            <Network aria-hidden="true" className="h-4 w-4" />
            关系网络
          </Link>
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            href={`/projects/${project.id}/characters/new`}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            新建角色
          </Link>
        </div>
      </div>

      {characterError ? (
        <div className="rounded-lg border border-ember-500/30 bg-ember-500/10 p-4 text-sm font-medium text-ember-700">
          {characterRelationshipErrorMessages[characterError] ??
            "人物 AI 草案处理失败，请检查任务输出后重试。"}
        </div>
      ) : null}

      <CharacterGenerationPanel
        hasApiKey={hasApiKey}
        hasActiveTask={hasActiveCharacterTask}
        projectId={project.id}
        tasks={generationTasks}
      />

      {characters.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white/72 p-8 text-center">
          <Users aria-hidden="true" className="mx-auto h-8 w-8 text-signal-600" />
          <h2 className="mt-4 text-lg font-semibold text-ink-950">
            还没有角色
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
            先创建主角、反派和关键配角。每次保存都会留下角色版本快照。
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            href={`/projects/${project.id}/characters/new`}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            创建第一个角色
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {characters.map((character) => (
            <Link
              className="block rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
              href={`/projects/${project.id}/characters/${character.id}`}
              key={character.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink-950">
                    {character.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    {character.roleInStory || "未设置定位"} /{" "}
                    {character.identity || "未设置身份"}
                  </p>
                </div>
                <span className="w-fit rounded-md bg-paper-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
                  {character.status === "active"
                    ? "活跃"
                    : character.status === "inactive"
                      ? "暂不出场"
                      : "已归档"}
                </span>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-ink-700">核心欲望</dt>
                  <dd className="mt-1 line-clamp-2 font-medium text-ink-950">
                    {character.desire || "未设置"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-700">信息边界</dt>
                  <dd className="mt-1 line-clamp-2 font-medium text-ink-950">
                    {character.knownInfo || "未设置"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-700">版本</dt>
                  <dd className="mt-1 font-medium text-ink-950">
                    {character._count.versions}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-ink-700">
                最近更新：{formatDate(character.updatedAt)}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function CharacterGenerationPanel({
  hasApiKey,
  hasActiveTask,
  projectId,
  tasks,
}: {
  hasApiKey: boolean;
  hasActiveTask: boolean;
  projectId: string;
  tasks: Array<{
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
  }>;
}) {
  const canGenerate = hasApiKey && !hasActiveTask;

  return (
    <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-signal-600">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            AI 人物生成
          </p>
          <h2 className="mt-2 text-lg font-semibold text-ink-950">
            生成并审阅人物档案草案
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
            AI 会参考项目设定、已有角色、人物关系和大纲生成新人物草案。点击采用后，才会创建正式角色和角色快照。
          </p>
        </div>
      </div>

      <form
        action={generateCharacterDraft.bind(null, projectId)}
        className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr_auto]"
      >
        <label className="block text-sm font-semibold text-ink-800">
          目标定位
          <input
            className="mt-2 min-h-10 w-full rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
            maxLength={120}
            name="targetRole"
            placeholder="例如：阶段反派 / 早期客户 / 情感线"
          />
        </label>
        <label className="block text-sm font-semibold text-ink-800">
          作者补充
          <textarea
            className="mt-2 w-full rounded-md border border-ink-950/10 bg-white px-3 py-2 text-sm leading-6 text-ink-950 outline-none transition focus:border-signal-500 focus:ring-2 focus:ring-signal-500/20"
            maxLength={3000}
            name="brief"
            placeholder="写明这个人物要承担的剧情功能、与主角/反派的关系、不能违背的设定。"
            rows={3}
          />
        </label>
        <div className="flex items-end">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!canGenerate}
            type="submit"
          >
            <Bot aria-hidden="true" className="h-4 w-4" />
            {hasActiveTask ? "生成中" : "生成草案"}
          </button>
        </div>
      </form>

      {!hasApiKey ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          未配置 API Key，暂不能调用模型；已有人物草案任务仍可查看和采用。
        </p>
      ) : null}

      {hasActiveTask ? (
        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          当前已有人物生成任务在后台运行，完成前不会重复发起新的模型调用。
        </p>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-ink-950/15 bg-paper-50 p-5 text-sm text-ink-700">
          还没有人物生成任务。生成后会在这里显示模型、状态、输出和采用按钮。
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {tasks.map((task) => {
            const canAdopt =
              task.status === "completed" &&
              task.adoptionState === "not_reviewed" &&
              Boolean(task.outputText?.trim());

            return (
              <article
                className="rounded-lg border border-ink-950/10 bg-paper-50 p-4"
                key={task.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
                        {aiTaskStatusLabel(task.status)}
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
                        {aiTaskAdoptionLabel(task.adoptionState)}
                      </span>
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink-950">
                      {task.promptTemplate
                        ? `${task.promptTemplate.name} v${task.promptTemplate.version}`
                        : "人物草案生成"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-700">
                      {task.inputContextSummary}
                    </p>
                  </div>

                  {canAdopt ? (
                    <form action={adoptCharacterDraft.bind(null, projectId, task.id)}>
                      <button
                        className="inline-flex min-h-9 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-ink-800"
                        type="submit"
                      >
                        <Plus aria-hidden="true" className="h-4 w-4" />
                        采用为新角色
                      </button>
                    </form>
                  ) : null}
                </div>

                <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-ink-950/5 p-4 text-xs leading-5 text-ink-800">
                  {task.outputText || task.errorMessage || "任务尚未产生输出。"}
                </pre>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
