import { activeAiTaskStatuses } from "./status";

export const staleAiTaskTimeoutMs = 15 * 60 * 1000;

export const staleAiTaskErrorMessage =
  "AI 任务运行超过 15 分钟，已自动标记为失败。请重新生成。";

type AiTaskTimeoutCandidate = {
  status?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
};

export function staleAiTaskCutoff(now = new Date()) {
  return new Date(now.getTime() - staleAiTaskTimeoutMs);
}

export function isStaleAiTask(
  task: AiTaskTimeoutCandidate,
  now = new Date(),
) {
  if (!activeAiTaskStatuses.some((status) => status === task.status)) {
    return false;
  }

  const referenceDate = task.startedAt ?? task.createdAt;

  return referenceDate.getTime() < staleAiTaskCutoff(now).getTime();
}
