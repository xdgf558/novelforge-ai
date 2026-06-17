import { notFound } from "next/navigation";
import { updateCharacter } from "@/app/projects/[projectId]/characters/actions";
import { CharacterForm } from "@/components/characters/character-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditCharacterPageProps = {
  params: Promise<{
    projectId: string;
    characterId: string;
  }>;
};

export default async function EditCharacterPage({
  params,
}: EditCharacterPageProps) {
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
    <CharacterForm
      action={updateCharacter.bind(null, character.project.id, character.id)}
      character={character}
      project={character.project}
      submitLabel="保存并记录版本"
      subtitle="角色资料会作为后续章节生成和连续性检查的重要记忆；保存后会生成新的角色快照。"
      title="编辑角色"
      versionCount={character._count.versions}
    />
  );
}
