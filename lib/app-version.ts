import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.112 大纲草案复制修复";

export const appReleaseNotes = [
  "修复工作区标签重构后，大纲草案无法复制到正式大纲表单的问题。",
  "复制草案会自动切换到正式大纲标签，并填入匹配的卷、剧情单元或章节表单。",
  "复制仍然只填充表单，不会自动保存或修改正式故事记忆。",
];
