const { PrismaClient } = require("@prisma/client");

const projectTitlePrefix = "Phase 12 MVP 验收脚本";
const taskTypes = [
  "project_setting_generation",
  "chapter_beat_generation",
  "chapter_draft_generation",
  "chapter_summary_extraction",
  "pending_update_extraction",
  "continuity_check",
  "wechat_publish_packaging",
];

async function main() {
  let prisma = new PrismaClient();
  let projectId;

  try {
    await prisma.project.deleteMany({
      where: {
        title: {
          startsWith: projectTitlePrefix,
        },
      },
    });

    const project = await prisma.project.create({
      data: {
        title: `${projectTitlePrefix} ${Date.now()}`,
        genre: "都市悬疑",
        targetAudience: "公众号男性读者",
        platform: "微信公众号",
        description: "用于验证本地 MVP 完整链路的临时项目。",
        wechatPositioning: "强钩子、短段落、末尾互动。",
      },
    });
    projectId = project.id;

    await prisma.projectSetting.create({
      data: {
        projectId,
        genre: "都市悬疑",
        targetAudience: "公众号男性读者",
        sellingPoint: "寿命交易带来高压反转。",
        mainConflict: "主角追查借命契约来源。",
        forbiddenItems: "不能自动发布到公众号。",
        wechatPositioning: "标题明确，结尾留互动。",
      },
    });

    await prisma.character.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        projectId,
        name: `验收角色 ${index + 1}`,
        roleInStory: index === 0 ? "主角" : "配角",
        identity: "本地验收角色",
        status: "active",
      })),
    });

    const chapter = await prisma.chapter.create({
      data: {
        projectId,
        chapterNumber: 1,
        title: "雨夜短信",
        status: "final",
        goal: "主角收到死者短信。",
        beats: "1. 雨夜收到短信。\n2. 倒计时出现。",
        draftText: "雨声砸在窗上，手机亮起。",
        finalText: "雨声砸在窗上，林野看见手机屏幕上跳出死者的名字。",
        wordCount: 28,
      },
    });

    await prisma.aiTask.createMany({
      data: taskTypes.map((taskType) => ({
        projectId,
        chapterId:
          taskType === "project_setting_generation" ? null : chapter.id,
        taskType,
        model: "mvp-acceptance-smoke",
        status: "completed",
        adoptionState:
          taskType === "chapter_beat_generation" ||
          taskType === "chapter_draft_generation"
            ? "adopted"
            : "not_reviewed",
        inputContextSummary: `${taskType} smoke check`,
        outputText: `${taskType} output`,
        startedAt: new Date(),
        completedAt: new Date(),
      })),
    });

    await prisma.pendingUpdate.createMany({
      data: [
        {
          projectId,
          chapterId: chapter.id,
          updateType: "update",
          targetType: "project_setting",
          fieldName: "worldviewRules",
          title: "补充借命规则",
          proposedContent: "借命必须付出同等代价。",
          riskLevel: "medium",
          evidence: "正文提到倒计时。",
          status: "applied",
          appliedAt: new Date(),
        },
        {
          projectId,
          chapterId: chapter.id,
          updateType: "create",
          targetType: "world_rule",
          title: "错误规则示例",
          proposedContent: "应被拒绝的规则。",
          riskLevel: "low",
          evidence: "验收拒绝流程。",
          status: "rejected",
          resolutionNote: "验收脚本验证拒绝不写入正式记忆。",
        },
      ],
    });

    await prisma.continuityReport.create({
      data: {
        projectId,
        chapterId: chapter.id,
        severity: "medium",
        category: "plot_logic",
        title: "倒计时来源需确认",
        description: "倒计时机制需要和世界规则保持一致。",
        evidence: "倒计时只剩三分钟。",
        suggestedFix: "后续章节解释借命倒计时来源。",
        status: "open",
      },
    });

    await prisma.publishPackage.create({
      data: {
        projectId,
        chapterId: chapter.id,
        titleCandidatesJson: JSON.stringify(["死人给他发来短信"]),
        selectedTitle: "死人给他发来短信",
        openingGuide: "这条短信不该存在。",
        endingQuestion: "你觉得短信是谁发来的？",
        nextChapterPreview: "下一章，旧楼出现第二个名字。",
        commentGuide: "评论区留下你怀疑的角色。",
        markdownBody:
          "# 死人给他发来短信\n\n这条短信不该存在。\n\n雨声砸在窗上。",
        checklistJson: JSON.stringify(["标题不剧透", "结尾有互动"]),
        status: "draft",
      },
    });

    await prisma.$disconnect();
    prisma = new PrismaClient();

    const persistedProject = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        setting: true,
        characters: true,
        chapters: true,
        aiTasks: true,
        pendingUpdates: true,
        continuityReports: true,
        publishPackages: true,
      },
    });

    assert(persistedProject, "project can be reloaded after reconnect");
    assert(persistedProject.setting, "setting exists");
    assert(persistedProject.characters.length >= 5, "five characters exist");
    assert(persistedProject.chapters.some((item) => item.chapterNumber === 1), "chapter 1 exists");
    assert(
      taskTypes.every((taskType) =>
        persistedProject.aiTasks.some((task) => task.taskType === taskType),
      ),
      "all core AI task records exist",
    );
    assert(
      persistedProject.pendingUpdates.some((item) => item.status === "applied"),
      "approved pending update exists",
    );
    assert(
      persistedProject.pendingUpdates.some((item) => item.status === "rejected"),
      "rejected pending update exists",
    );
    assert(persistedProject.continuityReports.length > 0, "continuity report exists");
    assert(persistedProject.publishPackages.length > 0, "publish package exists");

    console.log("MVP acceptance smoke passed.");
  } finally {
    if (projectId) {
      await prisma.project.deleteMany({
        where: {
          id: projectId,
        },
      });
    }

    await prisma.$disconnect();
  }
}

function assert(value, message) {
  if (!value) {
    throw new Error(`MVP acceptance smoke failed: ${message}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
