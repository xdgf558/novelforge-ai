import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.73 番茄导出面板";

export const appReleaseNotes = [
  "在发布页新增番茄小说正文粘贴版导出面板。",
  "支持章节选择、正文来源选择、是否包含章节标题、格式校验、复制正文和下载 TXT。",
  "番茄导出只读取章节正文并生成本地导出内容，不改写章节、不写入数据库，也不自动上传。",
];
