import Link from "next/link";
import { BookOpenText, Clock3, Plus, Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber, formatWordRange } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, activeProjectCount, wordTargetAggregate] = await Promise.all([
    prisma.project.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.project.count({
      where: {
        status: "active",
      },
    }),
    prisma.project.aggregate({
      _sum: {
        totalWordTarget: true,
      },
    }),
  ]);

  const totalWordTarget = wordTargetAggregate._sum.totalWordTarget;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-signal-600">本地工作台</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
            小说项目
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            本地项目、总设定档和角色库已接入，后续章节与 AI 任务会沿着这个记忆底座继续扩展。
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
          href="/projects/new"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          新建项目
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <BookOpenText aria-hidden="true" className="h-4 w-4 text-signal-600" />
            项目总数
          </div>
          <p className="mt-3 text-2xl font-semibold text-ink-950">
            {projects.length}
          </p>
        </div>

        <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-signal-600" />
            活跃项目
          </div>
          <p className="mt-3 text-2xl font-semibold text-ink-950">
            {activeProjectCount}
          </p>
        </div>

        <div className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel">
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <Target aria-hidden="true" className="h-4 w-4 text-ember-500" />
            目标字数
          </div>
          <p className="mt-3 text-2xl font-semibold text-ink-950">
            {totalWordTarget != null && totalWordTarget > 0
              ? formatNumber(totalWordTarget)
              : "未设置"}
          </p>
        </div>
      </section>

      {projects.length === 0 ? (
        <section className="rounded-lg border border-dashed border-ink-950/20 bg-white/72 p-8 text-center">
          <h2 className="text-lg font-semibold text-ink-950">还没有小说项目</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-700">
            创建第一个项目后，系统会把标题、题材、读者、字数目标和公众号定位保存到本地 SQLite。
          </p>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
            href="/projects/new"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            创建第一个项目
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => (
            <Link
              className="block rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:border-signal-500/45 hover:shadow-md"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink-950">
                    {project.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    {project.genre || "未设置题材"} / {project.platform || "未设置平台"}
                  </p>
                </div>
                <span className="w-fit rounded-md bg-paper-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
                  {project.status === "active" ? "进行中" : "已归档"}
                </span>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-ink-700">目标读者</dt>
                  <dd className="mt-1 font-medium text-ink-950">
                    {project.targetAudience || "未设置"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-700">单章字数</dt>
                  <dd className="mt-1 font-medium text-ink-950">
                    {formatWordRange(project.chapterWordMin, project.chapterWordMax)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-700">更新</dt>
                  <dd className="mt-1 font-medium text-ink-950">
                    {project.updateFrequency || "未设置"}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs text-ink-700">
                最近更新：{formatDate(project.updatedAt)}
              </p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
