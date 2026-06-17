import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
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

        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-ink-950/15 bg-white px-3 py-2 text-sm font-semibold text-ink-800 transition hover:bg-paper-100"
          href={`/projects/${version.project.id}/settings`}
        >
          <Pencil aria-hidden="true" className="h-4 w-4" />
          编辑当前设定
        </Link>
      </div>

      <SettingSnapshot values={snapshot} />
    </div>
  );
}

