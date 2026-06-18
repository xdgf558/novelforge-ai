import { describe, expect, it } from "vitest";
import {
  isStaleAiTask,
  staleAiTaskCutoff,
  staleAiTaskTimeoutMs,
} from "./task-timeouts";

describe("AI task timeouts", () => {
  const now = new Date("2026-06-18T13:30:00.000Z");

  it("uses a 15 minute stale cutoff", () => {
    expect(staleAiTaskCutoff(now).toISOString()).toBe(
      "2026-06-18T13:15:00.000Z",
    );
    expect(staleAiTaskTimeoutMs).toBe(900000);
  });

  it("marks old pending and running tasks as stale", () => {
    expect(
      isStaleAiTask(
        {
          status: "pending",
          createdAt: new Date("2026-06-18T13:14:59.000Z"),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isStaleAiTask(
        {
          status: "running",
          createdAt: new Date("2026-06-18T13:00:00.000Z"),
          startedAt: new Date("2026-06-18T13:14:59.000Z"),
        },
        now,
      ),
    ).toBe(true);
  });

  it("keeps fresh or already finished tasks active", () => {
    expect(
      isStaleAiTask(
        {
          status: "running",
          createdAt: new Date("2026-06-18T13:00:00.000Z"),
          startedAt: new Date("2026-06-18T13:20:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
    expect(
      isStaleAiTask(
        {
          status: "failed",
          createdAt: new Date("2026-06-18T13:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});
