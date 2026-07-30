import { unstable_noStore as noStore } from "next/cache";
import { AppShellFrame } from "@/components/app-shell-frame";
import { FormScrollRestoration } from "@/components/form-scroll-restoration";
import { appVersion } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";

type AppShellProps = {
  children: React.ReactNode;
};

export type AppShellProject = {
  id: string;
  title: string;
  workType: string;
  status: string;
  chapterCount: number;
  updatedAt: string;
};

export type AppShellSeries = {
  id: string;
  title: string;
  status: string;
};

export type AppShellAiTask = {
  id: string;
  projectId: string;
  projectTitle: string;
  chapterId: string | null;
  chapterNumber: number | null;
  chapterTitle: string | null;
  taskType: string;
  model: string;
  status: string;
  inputContextSummary: string;
  tokenInput: number | null;
  tokenOutput: number | null;
  tokenTotal: number | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type AppShellData = {
  projects: AppShellProject[];
  series: AppShellSeries[];
  activeTasks: AppShellAiTask[];
  recentTasks: AppShellAiTask[];
  pendingUpdateCount: number;
  openContinuityCount: number;
};

export async function AppShell({ children }: AppShellProps) {
  const shellData = await getAppShellData();

  return (
    <>
      <FormScrollRestoration />
      <AppShellFrame appVersion={appVersion} data={shellData}>
        {children}
      </AppShellFrame>
    </>
  );
}

async function getAppShellData(): Promise<AppShellData> {
  noStore();

  try {
    const [
      projects,
      series,
      activeTasks,
      recentTasks,
      pendingUpdateCount,
      openContinuityCount,
    ] = await Promise.all([
      prisma.project.findMany({
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        select: {
          id: true,
          title: true,
          workType: true,
          status: true,
          updatedAt: true,
          _count: {
            select: {
              chapters: true,
            },
          },
        },
      }),
      prisma.shortStorySeries.findMany({
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            title: "asc",
          },
        ],
        select: {
          id: true,
          title: true,
          status: true,
        },
      }),
      prisma.aiTask.findMany({
        where: {
          status: {
            in: ["pending", "running"],
          },
        },
        orderBy: [
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
        take: 8,
        select: appShellAiTaskSelect,
      }),
      prisma.aiTask.findMany({
        where: {
          status: {
            in: ["completed", "failed", "cancelled"],
          },
        },
        orderBy: [
          {
            completedAt: "desc",
          },
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: 6,
        select: appShellAiTaskSelect,
      }),
      prisma.pendingUpdate.count({
        where: {
          status: "pending",
        },
      }),
      prisma.continuityReport.count({
        where: {
          status: "open",
        },
      }),
    ]);

    return {
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        workType: project.workType,
        status: project.status,
        chapterCount: project._count.chapters,
        updatedAt: project.updatedAt.toISOString(),
      })),
      series,
      activeTasks: activeTasks.map(serializeAppShellAiTask),
      recentTasks: recentTasks.map(serializeAppShellAiTask),
      pendingUpdateCount,
      openContinuityCount,
    };
  } catch {
    return {
      projects: [],
      series: [],
      activeTasks: [],
      recentTasks: [],
      pendingUpdateCount: 0,
      openContinuityCount: 0,
    };
  }
}

const appShellAiTaskSelect = {
  id: true,
  projectId: true,
  chapterId: true,
  taskType: true,
  model: true,
  status: true,
  inputContextSummary: true,
  tokenInput: true,
  tokenOutput: true,
  tokenTotal: true,
  errorMessage: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  project: {
    select: {
      title: true,
    },
  },
  chapter: {
    select: {
      chapterNumber: true,
      title: true,
    },
  },
} as const;

function serializeAppShellAiTask(
  task: Awaited<
    ReturnType<typeof prisma.aiTask.findFirst<{ select: typeof appShellAiTaskSelect }>>
  >,
): AppShellAiTask {
  if (!task) {
    throw new Error("AI task serialization requires a task.");
  }

  return {
    id: task.id,
    projectId: task.projectId,
    projectTitle: task.project.title,
    chapterId: task.chapterId,
    chapterNumber: task.chapter?.chapterNumber ?? null,
    chapterTitle: task.chapter?.title ?? null,
    taskType: task.taskType,
    model: task.model,
    status: task.status,
    inputContextSummary: task.inputContextSummary,
    tokenInput: task.tokenInput,
    tokenOutput: task.tokenOutput,
    tokenTotal: task.tokenTotal,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt.toISOString(),
    startedAt: task.startedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}
