import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { restoreProjectSettingVersion } from "@/app/projects/[projectId]/settings/actions";
import { SettingSnapshot } from "@/components/settings/setting-snapshot";
import { formatDate } from "@/lib/format";
import type { ProjectSettingFieldName } from "@/lib/project-setting-fields";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SettingVersionPageProps = {
  params: Promise<{
    projectId: string;
    versionId: string;
  }>;
};

export default async function SettingVersionPage({
  params,
}: SettingVersionPageProps) {
  const { projectId, versionId } = await params;
  const version = await prisma.settingVersion.findFirst({
    where: {
      id: versionId,
      projectId,
    },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          workType: true,
        },
      },
    },
  });

  if (!version) {
    notFound();
  }

  let snapshot: Partial<Record<ProjectSettingFieldName, string>> = {};

  try {
    snapshot = JSON.parse(version.snapshotJson) as Partial<
      Record<ProjectSettingFieldName, string>
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
            href={`/projects/${version.project.id}/settings/history`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回历史
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {version.project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            设定快照 v{version.versionNumber}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
            {version.changeReason || "本次保存未填写修改原因。"}
          </p>
          <p className="mt-2 text-xs text-ink-700">
            {formatDate(version.createdAt)} / 来源：{version.sourceType}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <form
            action={restoreProjectSettingVersion.bind(
              null,
              version.project.id,
              version.id,
            )}
          >
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-ink-800"
              type="submit"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              恢复此版本
            </button>
          </form>
          <Link
            className="inline-flex min-h-10 items-center rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
            href={`/projects/${version.project.id}/settings`}
          >
            编辑当前设定
          </Link>
        </div>
      </div>

      <SettingSnapshot values={snapshot} workType={version.project.workType} />
    </div>
  );
}
