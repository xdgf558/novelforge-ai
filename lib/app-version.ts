import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.49 公众号排版 AI 候选";

export const appReleaseNotes = [
  "公众号排版导出新增独立的 AI 生成开头/结尾候选模块，结果只进入任务记录，作者手动套用后才填入表单。",
  "移除旧的“AI 增强候选”入口，避免排版候选与完整发布包装混用。",
  "章节、设定、大纲、角色、人物关系、发布和有声导出等后台生成按钮提交后会保留当前位置，并显示处理中反馈。",
];
