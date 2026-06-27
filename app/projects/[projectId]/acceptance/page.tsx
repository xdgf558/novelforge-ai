import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDashed, ClipboardCheck } from "lucide-react";
import { buildMvpAcceptanceReport } from "@/lib/mvp-acceptance";
import { buildExportData, projectPublishInclude } from "@/lib/project-export-data";
import {
  buildProjectJsonExport,
  buildProjectMarkdownExport,
} from "@/lib/project-export";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AcceptancePageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

const categoryLabels = {
  project: "项目基础",
  story: "故事记忆",
  ai: "AI 链路",
  review: "作者审核",
  release: "发布导出",
  persistence: "本地持久化",
} as const;

export default async function AcceptancePage({ params }: AcceptancePageProps) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: projectPublishInclude,
  });

  if (!project) {
    notFound();
  }

  const exportData = buildExportData(project);
  const markdownExport = buildProjectMarkdownExport(exportData);
  const jsonExport = buildProjectJsonExport(exportData);
  const report = buildMvpAcceptanceReport({
    project,
    setting: project.setting,
    characters: project.characters,
    chapters: project.chapters,
    aiTasks: project.aiTasks,
    pendingUpdates: project.pendingUpdates,
    continuityReports: project.continuityReports,
    publishPackages: project.publishPackages,
    exportFormats: {
      markdown: markdownExport.length > 0,
      json: isValidJson(jsonExport),
    },
  });
  const groupedChecks = Object.entries(categoryLabels).map(
    ([category, label]) => ({
      category,
      label,
      checks: report.checks.filter((check) => check.category === category),
    }),
  );

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
        href={`/projects/${project.id}`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        返回项目
      </Link>

      <header className="rounded-lg border border-ink-950/10 bg-white p-6 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-signal-600">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
              Phase 12 / MVP 验收
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink-950">
              {project.title} 验收看板
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-700">
              对照 MVP 验收标准检查当前项目是否已经覆盖完整创作链路：项目、设定、角色、章节、AI 任务、待审更新、连续性检查、排版导出和项目导出。
            </p>
          </div>

          <div className="rounded-lg bg-paper-50 px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-950">
              {report.passedCount}/{report.totalCount} 通过
            </p>
            <p className="mt-1">{report.completionPercent}% 完成</p>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-paper-100">
          <div
            className={`h-full rounded-full ${
              report.isComplete ? "bg-signal-600" : "bg-ember-500"
            }`}
            style={{ width: `${report.completionPercent}%` }}
          />
        </div>

        <p className="mt-4 rounded-md bg-paper-50 px-3 py-2 text-sm text-ink-700">
          {report.isComplete
            ? "当前项目已经满足 MVP 验收清单。"
            : "当前项目还未满足完整 MVP 验收清单，下面列出了缺失项和下一步操作。"}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groupedChecks.map((group) => {
          const passedCount = group.checks.filter((check) => check.passed).length;

          return (
            <div
              className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
              key={group.category}
            >
              <p className="text-sm font-semibold text-ink-950">{group.label}</p>
              <p className="mt-2 text-sm text-ink-700">
                {passedCount}/{group.checks.length} 通过
              </p>
            </div>
          );
        })}
      </section>

      <section className="space-y-5">
        {groupedChecks.map((group) => (
          <div className="space-y-3" key={group.category}>
            <h2 className="border-b border-ink-950/10 pb-2 text-base font-semibold text-ink-950">
              {group.label}
            </h2>
            <div className="space-y-3">
              {group.checks.map((check) => (
                <article
                  className="rounded-lg border border-ink-950/10 bg-white p-4 shadow-panel"
                  key={check.id}
                >
                  <div className="flex items-start gap-3">
                    {check.passed ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 flex-none text-signal-600"
                      />
                    ) : (
                      <CircleDashed
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 flex-none text-ember-500"
                      />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink-950">
                          {check.label}
                        </h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                            check.passed
                              ? "bg-signal-500/10 text-signal-700"
                              : "bg-ember-500/10 text-ember-600"
                          }`}
                        >
                          {check.passed ? "通过" : "待补齐"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-ink-700">
                        {check.description}
                      </p>
                      <p className="mt-2 text-xs text-ink-700">
                        证据：{check.evidence}
                      </p>
                      {!check.passed ? (
                        <p className="mt-2 text-xs font-semibold text-ember-600">
                          下一步：{check.actionHint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function isValidJson(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
