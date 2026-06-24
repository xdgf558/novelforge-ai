import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, BookOpenText, History, Pencil } from "lucide-react";
import { archiveCharacter } from "@/app/projects/[projectId]/characters/actions";
import { CharacterSnapshot } from "@/components/characters/character-snapshot";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CharacterPageProps = {
  params: Promise<{
    projectId: string;
    characterId: string;
  }>;
};

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { projectId, characterId } = await params;
  const character = await prisma.character.findFirst({
    where: {
      id: characterId,
      projectId,
    },
    include: {
      project: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
  });

  if (!character) {
    notFound();
  }

  const appearanceChapters = await prisma.chapter.findMany({
    where: {
      projectId,
      OR: [
        {
          goal: {
            contains: character.name,
          },
        },
        {
          notes: {
            contains: character.name,
          },
        },
        {
          characterRelationships: {
            some: {
              OR: [
                {
                  sourceCharacterId: character.id,
                },
                {
                  targetCharacterId: character.id,
                },
              ],
            },
          },
        },
        {
          timelineEvents: {
            some: {
              relatedCharacters: {
                contains: character.name,
              },
            },
          },
        },
        {
          plantedForeshadows: {
            some: {
              relatedCharacters: {
                contains: character.name,
              },
            },
          },
        },
        {
          resolvedForeshadows: {
            some: {
              relatedCharacters: {
                contains: character.name,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      chapterNumber: true,
      title: true,
      status: true,
    },
    orderBy: {
      chapterNumber: "asc",
    },
    take: 80,
  });

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href={`/projects/${character.project.id}/characters`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回角色库
      </Link>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              {character.project.title}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {character.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              {character.roleInStory || "暂未填写故事定位。"}
            </p>
            <p className="mt-2 text-xs text-ink-700">
              最近更新：{formatDate(character.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href={`/projects/${character.project.id}/characters/${character.id}/history`}
            >
              <History aria-hidden="true" className="h-4 w-4" />
              历史 {character._count.versions}
            </Link>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href={`/projects/${character.project.id}/characters/${character.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              编辑
            </Link>
            {character.status !== "archived" ? (
              <form
                action={archiveCharacter.bind(
                  null,
                  character.project.id,
                  character.id,
                )}
              >
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
                  type="submit"
                >
                  <Archive aria-hidden="true" className="h-4 w-4" />
                  归档
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
            <BookOpenText aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink-950">
              出场记录
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              首次/最近出场仍以角色档案手动字段为准；下方列表根据章节目标、备注、人物关系、时间线和伏笔关联推断，不扫描章节正文全文。
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          <AppearanceField label="手动首次出场" value={character.firstAppearance} />
          <AppearanceField label="手动最近出场" value={character.latestAppearance} />
        </dl>

        {appearanceChapters.length === 0 ? (
          <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
            暂未从轻量章节关联中推断到出场记录。
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {appearanceChapters.map((chapter) => (
              <Link
                className="inline-flex min-h-9 items-center rounded-md border border-ink-950/10 bg-paper-50 px-3 py-1.5 text-xs font-semibold text-ink-800 transition hover:border-signal-500/45 hover:text-signal-700"
                href={`/projects/${projectId}/chapters/${chapter.id}`}
                key={chapter.id}
              >
                第 {chapter.chapterNumber} 章《{chapter.title}》
              </Link>
            ))}
          </div>
        )}
      </section>

      <CharacterSnapshot values={character} />
    </div>
  );
}

function AppearanceField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-md bg-paper-50 p-3">
      <dt className="text-xs font-semibold text-ink-700">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-5 text-ink-800">
        {value || "未填写"}
      </dd>
    </div>
  );
}
