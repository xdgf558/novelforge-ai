import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const events: string[] = [];
  const tx = {
    publishRun: {
      update: vi.fn(async () => {
        events.push("run:complete");
        return {};
      }),
    },
    publishSyncState: {
      upsert: vi.fn(async () => ({})),
    },
    chapter: {
      findMany: vi.fn(async () => []),
      update: vi.fn(async () => ({})),
    },
    chapterVersion: {
      count: vi.fn(async () => 0),
      create: vi.fn(async () => ({})),
    },
  };

  return {
    events,
    tx,
    publishToStationCat: vi.fn(async () => {
      events.push("remote");
      return {
        errors: [],
        items: [],
        ok: true,
        previewUrl: null,
        publishUrl: null,
        rawJson: {},
        remoteBookId: "remote_project_1",
        remoteIds: {
          project: "remote_project_1",
        },
        requestId: "request_1",
        resultMessage: "Imported.",
        statusCode: 200,
      };
    }),
    prisma: {
      publishRun: {
        findUnique: vi.fn(async (): Promise<unknown> => null),
        create: vi.fn(async () => {
          events.push("run:create");
          return { id: "run_1" };
        }),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => {
        events.push("transaction");
        return callback(tx);
      }),
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/station-cat-publisher", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/station-cat-publisher")>();

  return {
    ...actual,
    publishToStationCat: mocks.publishToStationCat,
  };
});

import { createPublishRun } from "./runs";

function projectFixture() {
  return {
    id: "project_1",
    title: "照夜寒舟录",
    genre: null,
    targetAudience: null,
    platform: "Station Cat",
    totalWordTarget: null,
    chapterWordMin: null,
    chapterWordMax: null,
    updateFrequency: null,
    description: null,
    wechatPositioning: null,
    aiDailyTokenBudget: null,
    coverImagePath: null,
    coverImageMimeType: null,
    coverImageFileName: null,
    coverImageSizeBytes: null,
    coverImageUpdatedAt: null,
    coverAltText: null,
    status: "active",
    createdAt: new Date("2026-07-11T00:00:00.000Z"),
    updatedAt: new Date("2026-07-11T00:00:00.000Z"),
    setting: null,
    characters: [],
    characterRelationships: [],
    chapters: [],
    chapterSummaries: [],
    outlines: [],
    storylines: [],
    worldRules: [],
    foreshadows: [],
    timelineEvents: [],
    pendingUpdates: [],
    continuityReports: [],
    publishPackages: [],
    publishTargets: [],
    aiTasks: [],
    aiUsageDaily: [],
    _count: {
      chapters: 0,
      publishPackages: 0,
      aiTasks: 0,
      outlines: 0,
      storylines: 0,
      publishTargets: 0,
      aiUsageDaily: 0,
    },
  } as never;
}

function targetFixture() {
  return {
    id: "target_1",
    projectId: "project_1",
    platformKey: "station_cat",
    apiBaseUrl: "https://wwwstationcat.org",
    tokenSecret: "secret",
    syncStates: [],
  } as never;
}

describe("publish run outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
  });

  it("persists a running request before calling Station Cat", async () => {
    await createPublishRun({
      projectId: "project_1",
      project: projectFixture(),
      target: targetFixture(),
      mode: "draft",
      onlyChanged: true,
      uploadSelection: {
        scope: "all",
        chapterId: null,
      },
    });

    expect(mocks.events).toEqual([
      "run:create",
      "remote",
      "transaction",
      "run:complete",
    ]);
    expect(mocks.prisma.publishRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "running",
        requestId: expect.stringMatching(/^novelforge:project_1:/),
      }),
    });
  });

  it("reuses a concurrently created outbox row instead of failing", async () => {
    mocks.prisma.publishRun.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "run_concurrent",
        status: "running",
      });
    mocks.prisma.publishRun.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
        meta: {
          target: ["targetId", "requestId"],
        },
      }),
    );

    await expect(
      createPublishRun({
        projectId: "project_1",
        project: projectFixture(),
        target: targetFixture(),
        mode: "draft",
        onlyChanged: true,
        uploadSelection: {
          scope: "all",
          chapterId: null,
        },
      }),
    ).resolves.toBeUndefined();

    expect(mocks.prisma.publishRun.findUnique).toHaveBeenCalledTimes(2);
    expect(mocks.tx.publishRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "run_concurrent",
        },
      }),
    );
  });
});
