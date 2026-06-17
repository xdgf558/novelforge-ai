import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CharacterListPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function CharacterListPage({
  params,
}: CharacterListPageProps) {
  const { projectId } = await params;
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

  const characters = await prisma.character.findMany({
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
  });

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
            角色库
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            管理角色身份、动机、秘密、信息边界和说话规则，为后续章节生成和连续性检查提供结构化记忆。
          </p>
        </div>

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
          href={`/projects/${project.id}/characters/new`}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          新建角色
        </Link>
      </div>

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
