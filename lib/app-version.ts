import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.27 大纲保存反馈";

export const appReleaseNotes = [
  "大纲模块的 AI 草案任务新增“复制到表单”按钮，可把卷大纲、剧情单元大纲或章节大纲草案填入对应快速新增表单。",
  "快速新增大纲现在会显示“保存中...”状态，保存成功后会在页面顶部提示已保存的类型。",
  "表单异常会返回明确错误提示，避免点击保存后看起来没有任何反馈。",
];
