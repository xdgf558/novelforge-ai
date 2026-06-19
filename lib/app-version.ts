import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.14 一键定稿";

export const appReleaseNotes = [
  "章节编辑页新增“用草稿一键定稿”按钮。",
  "点击后会把当前草稿正文写入定稿正文，并把章节状态设为“已定稿”。",
  "一键定稿会直接保存章节并生成新的章节快照。",
  "章节摘要、待审更新、连续性检查和发布包装仍只读取作者确认后的定稿正文。",
];
