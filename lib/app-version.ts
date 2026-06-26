import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.55 反馈驱动下一章生成";

export const appReleaseNotes = [
  "章节详情页新增“当前章生成参考”，会展示最近前序章节可用于本章生成的读者反馈信号。",
  "章节节拍和章节草稿生成会读取最近前序章节的阅读表现、流失点和读者洞察，用于调整节奏、钩子和角色权重。",
  "读者反馈仍只作为压缩参考上下文，不会自动修改正文、设定、角色、大纲、伏笔或故事记忆。",
];
