import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.21 Phase 20 正文精修";

export const appReleaseNotes = [
  "新增 AI 正文精修流程：优先基于已有精修稿，其次基于定稿正文，最后回退到草稿正文。",
  "章节数据新增独立精修正文槽，采用 AI 精修结果后只写入精修正文，不会直接覆盖定稿。",
  "超长章节的摘录精修结果只能作为预览，不能直接采用覆盖完整精修正文。",
  "章节编辑页支持用精修稿一键定稿，空正文会禁用并给出明确提示。",
  "章节列表、快照和项目导出现在都会显示或备份精修正文。",
];
