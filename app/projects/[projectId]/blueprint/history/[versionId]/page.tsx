import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { restoreShortStoryBlueprintVersion } from "@/app/projects/[projectId]/blueprint/actions";
import { ShortStoryBlueprintSnapshot } from "@/components/short-stories/blueprint-snapshot";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  shortStoryBlueprintSnapshot,
  type ShortStoryBlueprintFieldName,
} from "@/lib/short-stories/blueprint-fields";

export const dynamic = "force-dynamic";

type ShortStoryBlueprintVersionPageProps = {
  params: Promise<{
    projectId: string;
    versionId: string;
  }>;
};

export default async function ShortStoryBlueprintVersionPage({
  params,
}: ShortStoryBlueprintVersionPageProps) {
  const { projectId, versionId } = await params;
  const version = await prisma.shortStoryBlueprintVersion.findFirst({
    where: {
      id: versionId,
      projectId,
      project: {
        workType: "short_story",
      },
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

  let snapshot: Partial<Record<ShortStoryBlueprintFieldName, string>> = {};

  try {
    snapshot = shortStoryBlueprintSnapshot(JSON.parse(version.snapshotJson));
  } catch {
    snapshot = {};
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-ink-950/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
            href={`/projects/${version.project.id}/blueprint/history`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            返回蓝图历史
          </Link>
          <p className="text-sm font-semibold text-signal-600">
            {version.project.title}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            蓝图快照 v{version.versionNumber}
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
            action={restoreShortStoryBlueprintVersion.bind(
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
            href={`/projects/${version.project.id}/blueprint`}
          >
            编辑当前蓝图
          </Link>
        </div>
      </header>

      <ShortStoryBlueprintSnapshot values={snapshot} />
    </div>
  );
}
