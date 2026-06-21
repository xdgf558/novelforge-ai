import { notFound } from "next/navigation";
import { createCharacter } from "@/app/projects/[projectId]/characters/actions";
import { CharacterForm } from "@/components/characters/character-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type NewCharacterPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function NewCharacterPage({ params }: NewCharacterPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <CharacterForm
      action={createCharacter.bind(null, project.id)}
      project={project}
      submitLabel="创建角色"
      subtitle="手动创建会立即写入正式角色库；AI 生成请回到角色库页面先生成草案，再由作者采用。"
      title="新建角色"
    />
  );
}
