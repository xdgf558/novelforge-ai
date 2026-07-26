import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.108 新角色审核修复";

export const appReleaseNotes = [
  "首次登场角色若被误标为更新并携带伪造 ID，会转为可审阅的新增建议。",
  "历史遗留的无目标角色更新可由作者明确选择“作为新角色批准”。",
  "新增角色会回填正式角色 ID 和首个版本，其他缺失目标仍保持拒绝写入。",
];
