import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashText } from "./chapter-polishes";
import { completeRunningSegmentedChapterPolishTask } from "./segmented-chapter-polish-runner";

const mocks = vi.hoisted(() => ({
  prisma: {
    aiTask: {
      findFirst: vi.fn(),
    },
    chapter: {
      findFirst: vi.fn(),
    },
    projectSetting: {
      findUnique: vi.fn(),
    },
    character: {
      findMany: vi.fn(),
    },
  },
  createOpenAITextResponse: vi.fn(),
  markAiTaskCompleted: vi.fn(),
  markAiTaskFailed: vi.fn(),
  resolveAiTaskExecutionEnv: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/ai/openai-client", () => ({
  createOpenAITextResponse: mocks.createOpenAITextResponse,
}));

vi.mock("@/lib/ai/task-logger", () => ({
  markAiTaskCompleted: mocks.markAiTaskCompleted,
  markAiTaskFailed: mocks.markAiTaskFailed,
  resolveAiTaskExecutionEnv: mocks.resolveAiTaskExecutionEnv,
}));

const longDraftText = [
  "一".repeat(9000),
  "二".repeat(9000),
  "三".repeat(100),
].join("\n\n");

function mockRunningTask(
  overrides: Partial<Awaited<ReturnType<typeof buildRunningTask>>> = {},
) {
  const task = buildRunningTask(overrides);
  mocks.prisma.aiTask.findFirst.mockResolvedValue(task);
  return task;
}

function buildRunningTask(overrides = {}) {
  return {
    id: "task_1",
    projectId: "project_1",
    chapterId: "chapter_1",
    taskType: "chapter_polish_generation",
    model: "deepseek-v4-pro",
    inputJson: JSON.stringify({
      chapter: {
        sourceTextPromptWasSegmented: true,
        sourceTextLength: longDraftText.length,
        sourceTextHash: hashText(longDraftText),
        segmentCount: 3,
      },
    }),
    promptTemplate: {
      systemPrompt: "系统提示",
      userPrompt: "用户提示",
      contextNotes: "上下文备注",
    },
    ...overrides,
  };
}

function mockChapter(overrides = {}) {
  mocks.prisma.chapter.findFirst.mockResolvedValue({
    id: "chapter_1",
    chapterNumber: 4,
    title: "第一堂课",
    goal: "章节目标",
    beats: "章节节拍",
    draftText: longDraftText,
    polishedText: "",
    finalText: "",
    notes: "作者备注",
    project: {
      title: "离线未来",
      genre: "穿越",
      targetAudience: "20-40岁",
      platform: "个人网站",
      chapterWordMin: 5000,
      chapterWordMax: 10000,
      description: "项目简介",
      wechatPositioning: "公众号定位",
    },
    ...overrides,
  });
  mocks.prisma.projectSetting.findUnique.mockResolvedValue({
    styleSample: "文风样例",
    emotionalTone: "情绪基调",
    worldviewRules: "世界观规则",
    forbiddenItems: "禁写事项",
  });
  mocks.prisma.character.findMany.mockResolvedValue([
    {
      name: "陈远",
      roleInStory: "主角",
      identity: "程序员",
      speakingStyle: "冷静",
      behaviorRules: "隐藏 AI",
      latestAppearance: "第3章",
    },
  ]);
}

describe("completeRunningSegmentedChapterPolishTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunningTask();
    mockChapter();
    mocks.markAiTaskCompleted.mockResolvedValue({});
    mocks.markAiTaskFailed.mockResolvedValue({});
    mocks.resolveAiTaskExecutionEnv.mockReturnValue({
      OPENAI_API_KEY: "kimi-key",
      OPENAI_MODEL: "kimi-k2.6",
      OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
    });
  });

  it("runs segmented polish in order and stores stitched output with token totals", async () => {
    mocks.createOpenAITextResponse
      .mockResolvedValueOnce({
        outputText: " 第一段精修 ",
        responseJson: {},
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      })
      .mockResolvedValueOnce({
        outputText: "第二段精修",
        responseJson: {},
        usage: {
          inputTokens: 11,
          outputTokens: 21,
          totalTokens: 32,
        },
      })
      .mockResolvedValueOnce({
        outputText: "第三段精修",
        responseJson: {},
        usage: {
          inputTokens: 12,
          outputTokens: 22,
          totalTokens: 34,
        },
      });

    await completeRunningSegmentedChapterPolishTask("task_1");

    expect(mocks.prisma.aiTask.findFirst).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        taskType: "chapter_polish_generation",
        status: "running",
      },
      select: expect.any(Object),
    });
    expect(mocks.createOpenAITextResponse).toHaveBeenCalledTimes(3);
    expect(mocks.createOpenAITextResponse).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        developerPrompt: "用户提示\n\n上下文备注",
        model: "deepseek-v4-pro",
        systemPrompt: "系统提示",
        input: expect.stringContaining("第 1 / 3 段"),
      }),
      {
        env: {
          OPENAI_API_KEY: "kimi-key",
          OPENAI_MODEL: "kimi-k2.6",
          OPENAI_BASE_URL: "https://api.moonshot.cn/v1",
        },
      },
    );
    expect(mocks.createOpenAITextResponse).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.stringContaining("第 2 / 3 段"),
      }),
      expect.objectContaining({
        env: expect.objectContaining({
          OPENAI_MODEL: "kimi-k2.6",
        }),
      }),
    );
    expect(mocks.createOpenAITextResponse).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        input: expect.stringContaining("第 3 / 3 段"),
      }),
      expect.objectContaining({
        env: expect.objectContaining({
          OPENAI_MODEL: "kimi-k2.6",
        }),
      }),
    );
    expect(mocks.markAiTaskCompleted).toHaveBeenCalledWith("task_1", {
      outputText: "第一段精修\n\n第二段精修\n\n第三段精修",
      outputJson: {
        strategy: "segmented",
        segmentCount: 3,
        segments: [
          {
            index: 1,
            inputLength: 9000,
            outputLength: 5,
            usage: {
              inputTokens: 10,
              outputTokens: 20,
              totalTokens: 30,
            },
          },
          {
            index: 2,
            inputLength: 9000,
            outputLength: 5,
            usage: {
              inputTokens: 11,
              outputTokens: 21,
              totalTokens: 32,
            },
          },
          {
            index: 3,
            inputLength: 100,
            outputLength: 5,
            usage: {
              inputTokens: 12,
              outputTokens: 22,
              totalTokens: 34,
            },
          },
        ],
      },
      tokenInput: 33,
      tokenOutput: 63,
      tokenTotal: 96,
    });
    expect(mocks.markAiTaskFailed).not.toHaveBeenCalled();
  });

  it("rejects task ids that are not running chapter polish tasks", async () => {
    mocks.prisma.aiTask.findFirst.mockResolvedValue(null);

    await expect(
      completeRunningSegmentedChapterPolishTask("task_1"),
    ).rejects.toThrow("无效的分段精修任务");

    expect(mocks.createOpenAITextResponse).not.toHaveBeenCalled();
    expect(mocks.markAiTaskCompleted).not.toHaveBeenCalled();
    expect(mocks.markAiTaskFailed).not.toHaveBeenCalled();
  });

  it("fails the task when the chapter text changed after task creation", async () => {
    mockChapter({
      draftText: `${longDraftText}\n新增内容`,
    });

    await expect(
      completeRunningSegmentedChapterPolishTask("task_1"),
    ).rejects.toThrow("章节正文已变化");

    expect(mocks.createOpenAITextResponse).not.toHaveBeenCalled();
    expect(mocks.markAiTaskCompleted).not.toHaveBeenCalled();
    expect(mocks.markAiTaskFailed).toHaveBeenCalledWith(
      "task_1",
      expect.any(Error),
    );
  });

  it("fails when chapter text changed but length and segment count stayed the same", async () => {
    mockChapter({
      draftText: longDraftText.replace("一", "四"),
    });

    await expect(
      completeRunningSegmentedChapterPolishTask("task_1"),
    ).rejects.toThrow("章节正文已变化");

    expect(mocks.createOpenAITextResponse).not.toHaveBeenCalled();
    expect(mocks.markAiTaskCompleted).not.toHaveBeenCalled();
    expect(mocks.markAiTaskFailed).toHaveBeenCalledWith(
      "task_1",
      expect.any(Error),
    );
  });

  it("marks segmented polish failed when a segment returns empty output", async () => {
    mocks.createOpenAITextResponse.mockResolvedValueOnce({
      outputText: "   ",
      responseJson: {},
      usage: {},
    });

    await expect(
      completeRunningSegmentedChapterPolishTask("task_1"),
    ).rejects.toThrow("没有返回可用正文");

    expect(mocks.markAiTaskCompleted).not.toHaveBeenCalled();
    expect(mocks.markAiTaskFailed).toHaveBeenCalledWith(
      "task_1",
      expect.any(Error),
    );
  });
});
