import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.28 章节大纲单章生成";

export const appReleaseNotes = [
  "生成章节大纲时不再填写“章节条目数”，改为填写“目标章节号”。",
  "章节大纲 AI 请求会强制只生成目标章节这一章，避免一次生成第 3-5 章这类连续章节列表。",
  "目标章节号会根据已有章节和已保存章节大纲自动推荐下一章，仍可手动修改。",
];
