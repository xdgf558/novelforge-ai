import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  FileText,
  History,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { deleteProject } from "@/app/projects/actions";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber, formatWordRange } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      _count: {
        select: {
          settingVersions: true,
          characters: true,
          characterVersions: true,
          chapters: true,
          chapterVersions: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目列表
      </Link>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-signal-600">
              {project.genre || "未设置题材"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {project.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              {project.description || "暂无故事简介。"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
              href={`/projects/${project.id}/edit`}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              编辑
            </Link>
            <form action={deleteProject.bind(null, project.id)}>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoTile label="目标读者" value={project.targetAudience || "未设置"} />
        <InfoTile label="连载平台" value={project.platform || "未设置"} />
        <InfoTile label="总字数目标" value={formatNumber(project.totalWordTarget)} />
        <InfoTile
          label="单章字数"
          value={formatWordRange(project.chapterWordMin, project.chapterWordMax)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/settings`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <BookMarked aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                总设定档
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                维护题材、主线、世界观、人物规则、文风和发布约束。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/characters`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink-950/5 text-ink-800">
              <Users aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                角色库
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.characters} 个角色，{project._count.characterVersions} 个角色快照。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/chapters`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-500/10 text-signal-600">
              <FileText aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                章节编辑器
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.chapters} 个章节，{project._count.chapterVersions} 个章节快照。
              </p>
            </div>
          </div>
        </Link>

        <Link
          className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
          href={`/projects/${project.id}/settings/history`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ember-500/10 text-ember-500">
              <History aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-950">
                设定历史
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-700">
                已保存 {project._count.settingVersions} 个设定快照。
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-950">公众号定位</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
            {project.wechatPositioning || "暂无公众号定位。"}
          </p>
        </div>

        <div className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink-950">项目状态</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="状态" value={project.status === "active" ? "进行中" : "已归档"} />
            <Row label="更新频率" value={project.updateFrequency || "未设置"} />
            <Row label="创建时间" value={formatDate(project.createdAt)} />
            <Row label="更新时间" value={formatDate(project.updatedAt)} />
          </dl>
        </div>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
      <p className="text-sm text-ink-700">{label}</p>
      <p className="mt-2 text-base font-semibold text-ink-950">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-ink-700">{label}</dt>
      <dd className="text-right font-medium text-ink-950">{value}</dd>
    </div>
  );
}
