import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.21 Phase 20 正文精修";

export const appReleaseNotes = [
  "新增 AI 正文精修流程：从草稿、已有精修稿或定稿正文生成可审阅精修稿。",
  "章节数据新增独立精修正文槽，采用 AI 精修结果后只写入精修正文，不会直接覆盖定稿。",
  "章节编辑页支持用精修稿一键定稿，并继续保存章节版本快照。",
  "章节列表、快照和项目导出现在都会显示或备份精修正文。",
];
