import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.26 大纲草案复制到表单";

export const appReleaseNotes = [
  "大纲模块的 AI 草案任务新增“复制到表单”按钮，可把卷大纲、剧情单元大纲或章节大纲草案填入对应快速新增表单。",
  "复制操作只在页面表单中填值，不会自动写入正式大纲，作者仍需确认后点击保存。",
  "改进 AI 大纲草案解析，支持常见的标题、目标、章节范围、章节号和预计字数字段。",
];
