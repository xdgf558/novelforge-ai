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
      subtitle="先手动确认角色资料。AI 生成角色会在 AI 服务和提示词模板阶段之后接入。"
      title="新建角色"
    />
  );
}
