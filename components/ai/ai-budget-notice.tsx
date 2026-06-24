import {
  aiBudgetWarning,
  loadProjectAiUsageSummary,
} from "@/lib/ai/usage";
import { prisma } from "@/lib/prisma";

export async function AiBudgetNotice({ projectId }: { projectId: string }) {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      aiDailyTokenBudget: true,
    },
  });

  if (!project?.aiDailyTokenBudget) {
    return null;
  }

  const usageSummary = await loadProjectAiUsageSummary(projectId);
  const warning = aiBudgetWarning({
    budget: project.aiDailyTokenBudget,
    tokenTotal: usageSummary.totals.tokenTotal,
  });

  if (!warning) {
    return null;
  }

  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
      {warning}
    </p>
  );
}
