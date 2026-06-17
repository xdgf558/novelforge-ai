import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, Pencil, Trash2 } from "lucide-react";
import { deleteCharacter } from "@/app/projects/[projectId]/characters/actions";
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
            <form
              action={deleteCharacter.bind(
                null,
                character.project.id,
                character.id,
              )}
            >
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                type="submit"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                删除
              </button>
            </form>
          </div>
        </div>
      </header>

      <CharacterSnapshot values={character} />
    </div>
  );
}
