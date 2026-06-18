import packageJson from "@/package.json";

export const appVersion = packageJson.version;

export const appReleaseTitle = "0.1.5 项目封面上传与发布";

export const appReleaseNotes = [
  "项目发布页新增本机封面上传、替换、删除和预览，支持 PNG、JPEG、WebP、GIF。",
  "封面文件保存在本机资产目录，仓库会忽略本地图片资产，避免误提交私人素材。",
  "标准发布包和 Station Cat 导入请求会包含封面文件名、类型、大小、alt 文本和 base64 图片数据。",
  "Station Cat 增量同步会把封面作为独立变更项处理，有新作品或新封面时可一起发送到网站。",
];
