import { notFound } from "next/navigation";
import {
  archiveProject,
  deleteProject,
  restoreProject,
  updateProject,
} from "@/app/projects/actions";
import { ProjectForm } from "@/components/project-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{
    projectError?: string;
  }>;
};

export default async function EditProjectPage({
  params,
  searchParams,
}: EditProjectPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProjectForm
        action={updateProject.bind(null, project.id)}
        project={project}
        submitLabel="保存修改"
        subtitle="这些基础字段会作为后续总设定档、章节生成和公众号发布包装的初始上下文。"
        title="编辑小说项目"
      />

      <section className="rounded-lg border border-amber-300/70 bg-amber-50 p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-amber-950">
              项目归档与删除
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
              归档会把项目从默认列表中隐藏，但保留全部设定、章节、记忆、音频和导出记录。硬删除会清除本地数据库中的项目资料，请先在本机接入设置里创建备份。
            </p>
            {resolvedSearchParams?.projectError === "delete-confirmation" ? (
              <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                删除前需要勾选已备份，并在确认框输入 DELETE。
              </p>
            ) : null}
          </div>

          {project.status === "archived" ? (
            <form action={restoreProject.bind(null, project.id)}>
              <button
                className="inline-flex min-h-10 items-center rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
                type="submit"
              >
                恢复项目
              </button>
            </form>
          ) : (
            <form action={archiveProject.bind(null, project.id)}>
              <button
                className="inline-flex min-h-10 items-center rounded-md border border-amber-400 bg-white px-3 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                type="submit"
              >
                归档项目
              </button>
            </form>
          )}
        </div>

        <form
          action={deleteProject.bind(null, project.id)}
          className="mt-5 grid gap-3 rounded-lg border border-red-200 bg-white p-4 md:grid-cols-[1fr_180px_auto]"
        >
          <label className="flex items-start gap-2 text-sm leading-6 text-ink-700 md:col-span-3">
            <input
              className="mt-1 h-4 w-4 rounded border-ink-950/20 text-red-600"
              name="backupAcknowledged"
              type="checkbox"
            />
            我已经创建本地备份，确认仍要硬删除这个项目。
          </label>
          <input
            className="min-h-10 rounded-md border border-red-200 bg-red-50 px-3 text-sm text-ink-950 outline-none transition placeholder:text-red-700/45 focus:border-red-500 focus:ring-4 focus:ring-red-500/15"
            name="deleteConfirmation"
            placeholder="输入 DELETE"
          />
          <p className="text-xs leading-5 text-red-800 md:self-center">
            删除不可撤销；归档通常已经足够。
          </p>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            type="submit"
          >
            永久删除
          </button>
        </form>
      </section>
    </div>
  );
}
