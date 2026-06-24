import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.50 本地维护与恢复能力";

export const appReleaseNotes = [
  "新增本地数据备份入口，可打包 SQLite 数据库和生成资产目录，备份不会包含 API Key 或发布 Token。",
  "项目管理改为归档优先，硬删除需要备份确认；总设定历史支持恢复到当前版本并记录新的回滚快照。",
  "总设定 AI 增加补全缺失字段和优化建议，Prompt 模板支持查看、复制新版、启停和恢复默认。",
];
