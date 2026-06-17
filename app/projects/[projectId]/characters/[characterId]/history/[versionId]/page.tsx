import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { CharacterSnapshot } from "@/components/characters/character-snapshot";
import { formatDate } from "@/lib/format";
import type { CharacterFieldName } from "@/lib/character-fields";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CharacterVersionPageProps = {
  params: Promise<{
    projectId: string;
    characterId: string;
    versionId: string;
  }>;
};

export default async function CharacterVersionPage({
  params,
}: CharacterVersionPageProps) {
  const { projectId, characterId, versionId } = await params;
  const version = await prisma.characterVersion.findFirst({
    where: {
      id: versionId,
      characterId,
      projectId,
    },
    include: {
      character: {
        select: {
          id: true,
          name: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!version) {
    notFound();
  }

  let snapshot: Partial<Record<CharacterFieldName, string>> = {};

  try {
    snapshot = JSON.parse(version.snapshotJson) as Partial<
      Record<CharacterFieldName, string>
    >;
  } catch {
    snapshot = {};
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${version.project.id}/characters/${version.character.id}/history`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回历史
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {version.project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            {version.character.name} 快照 v{version.versionNumber}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            {version.changeReason || "本次保存未填写修改原因。"}
          </p>
          <p className="mt-2 text-xs text-ink-700">
            {formatDate(version.createdAt)} / 来源：{version.sourceType}
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${version.project.id}/characters/${version.character.id}/edit`}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          编辑当前角色
        </Link>
      </div>

      <CharacterSnapshot values={snapshot} />
    </div>
  );
}
