import { prisma } from "../prisma";

export type AiUsageTotals = {
  callCount: number;
  tokenInput: number;
  tokenOutput: number;
  tokenTotal: number;
};

export type AiUsageBreakdownRow = AiUsageTotals & {
  label: string;
};

export function aiUsageDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function recordAiTaskUsage(input: {
  projectId: string;
  taskType: string;
  model: string;
  tokenInput?: number | null;
  tokenOutput?: number | null;
  tokenTotal?: number | null;
  completedAt?: Date | null;
}) {
  const dateKey = aiUsageDateKey(input.completedAt ?? new Date());

  await prisma.aiUsageDaily.upsert({
    where: {
      projectId_dateKey_taskType_model: {
        projectId: input.projectId,
        dateKey,
        taskType: input.taskType,
        model: input.model,
      },
    },
    create: {
      projectId: input.projectId,
      dateKey,
      taskType: input.taskType,
      model: input.model,
      callCount: 1,
      tokenInput: input.tokenInput ?? 0,
      tokenOutput: input.tokenOutput ?? 0,
      tokenTotal: input.tokenTotal ?? 0,
    },
    update: {
      callCount: {
        increment: 1,
      },
      tokenInput: {
        increment: input.tokenInput ?? 0,
      },
      tokenOutput: {
        increment: input.tokenOutput ?? 0,
      },
      tokenTotal: {
        increment: input.tokenTotal ?? 0,
      },
    },
  });
}

export async function loadProjectAiUsageSummary(projectId: string, date = new Date()) {
  const dateKey = aiUsageDateKey(date);
  const rows = await prisma.aiUsageDaily.findMany({
    where: {
      projectId,
      dateKey,
    },
    orderBy: [
      {
        tokenTotal: "desc",
      },
      {
        callCount: "desc",
      },
    ],
  });
  const totals = sumUsageRows(rows);

  return {
    dateKey,
    rows,
    totals,
    byTaskType: groupUsageRows(rows, "taskType"),
    byModel: groupUsageRows(rows, "model"),
  };
}

export function aiBudgetWarning(input: {
  budget?: number | null;
  tokenTotal?: number | null;
}) {
  const budget = input.budget ?? 0;
  const tokenTotal = input.tokenTotal ?? 0;

  if (budget <= 0) {
    return null;
  }

  if (tokenTotal >= budget) {
    return `今日 AI token 用量已达到 ${formatUsageNumber(tokenTotal)} / ${formatUsageNumber(
      budget,
    )}，已超过提醒阈值。`;
  }

  if (tokenTotal >= budget * 0.8) {
    return `今日 AI token 用量已接近提醒阈值：${formatUsageNumber(
      tokenTotal,
    )} / ${formatUsageNumber(budget)}。`;
  }

  return null;
}

export function formatUsageNumber(value?: number | null) {
  return (value ?? 0).toLocaleString("zh-CN");
}

function sumUsageRows(rows: readonly AiUsageTotals[]): AiUsageTotals {
  return rows.reduce(
    (acc, row) => ({
      callCount: acc.callCount + row.callCount,
      tokenInput: acc.tokenInput + row.tokenInput,
      tokenOutput: acc.tokenOutput + row.tokenOutput,
      tokenTotal: acc.tokenTotal + row.tokenTotal,
    }),
    {
      callCount: 0,
      tokenInput: 0,
      tokenOutput: 0,
      tokenTotal: 0,
    },
  );
}

function groupUsageRows<T extends "taskType" | "model">(
  rows: readonly (AiUsageTotals & Record<T, string>)[],
  key: T,
): AiUsageBreakdownRow[] {
  const groups = new Map<string, AiUsageTotals>();

  for (const row of rows) {
    const current =
      groups.get(row[key]) ?? {
        callCount: 0,
        tokenInput: 0,
        tokenOutput: 0,
        tokenTotal: 0,
      };

    current.callCount += row.callCount;
    current.tokenInput += row.tokenInput;
    current.tokenOutput += row.tokenOutput;
    current.tokenTotal += row.tokenTotal;
    groups.set(row[key], current);
  }

  return [...groups.entries()]
    .map(([label, totals]) => ({
      label,
      ...totals,
    }))
    .sort((a, b) => b.tokenTotal - a.tokenTotal || b.callCount - a.callCount);
}
