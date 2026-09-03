# NovelForge AI

<img src="build/icon.png" alt="NovelForge AI" width="96" height="96">

[![CI](https://github.com/xdgf558/novelforge-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/xdgf558/novelforge-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

NovelForge AI 是一个本地优先、作者主导的 AI 小说创作工作台，面向长篇连载、独立短故事和系列短故事。它不只生成正文，还把设定版本、角色状态、章节摘要、时间线、伏笔、连续性检查和 AI 任务记录组织成可审阅的结构化记忆。

NovelForge AI is a local-first, author-controlled AI writing workbench for serialized novels, short stories, and linked story series.

## 核心能力

- 长篇连载：卷、剧情单元和章节大纲，故事线，章节节拍、草稿、精修、摘要、待审核记忆更新与连续性检查。
- 短故事：故事蓝图、内部写作单元、整篇审校、完整成稿导出和独立叙事闭环。
- 系列短故事：共享世界观、跨篇规则、长期谜团、复现角色与篇目推进记录。
- 作者审批：AI 输出默认只进入草案或待审核区，不会静默改写正式设定和故事记忆。
- 本地数据：SQLite 数据库、配置和生成资产保存在本机，并支持本地备份。
- 桌面应用：提供 macOS Electron 打包和签名流程；公证不是默认发布路径，安装包不提交到 Git 仓库。

## 当前状态

当前版本为 `0.1.117`，仍处于本地单用户 MVP 阶段。项目已经可以用于完整创作流程，但仍在持续迭代，建议在升级或测试新功能前备份数据。

团队协作、SaaS 多租户、云同步、支付、移动端和自动微信发布不在当前范围内。现有 Station Cat 发布集成属于当前产品范围。详细边界与设计决策见 [项目记忆](docs/project-memory.md) 和 [产品记忆设计](docs/product-memory-design.md)。

## 快速开始

建议使用 Node.js 22 LTS 和 npm。

```bash
git clone https://github.com/xdgf558/novelforge-ai.git
cd novelforge-ai
npm ci
cp .env.example .env
npm run prisma:migrate
npm run dev
```

打开 `http://localhost:3000` 即可开始使用。

## AI 接入与隐私

NovelForge AI 不包含作者的 API Key、发布 Token、小说正文或本地数据库。每位使用者都需要在“本机接入设置”中配置自己的服务商凭据。

- 大纲、设定、节拍、摘要、记忆提取和连续性检查使用官方 OpenAI API 上的 `gpt-5.6-terra`，推理强度固定为 `xhigh`。
- 章节草稿可配置 Kimi K2.6 或 `gpt-5.6-luna`；Luna 使用官方 OpenAI API，推理强度固定为 `xhigh`。
- 正文精修和短故事整篇审校使用独立的 Kimi 写作路由。
- 语音合成和网站发布接入由使用者按需单独配置。

AI 调用只从本地服务端发起。本地优先不等于完全离线：只有在使用者主动执行 AI、语音或发布任务时，完成该任务所需的相关内容才会发送到所配置的服务商。提交问题或日志前，请先移除密钥、Token、作品内容和其他隐私数据。

## 数据位置

开发模式默认使用 `DATABASE_URL` 指向的 SQLite 文件。macOS 桌面版运行数据位于：

- 数据库：`~/Library/Application Support/NovelForge AI/data/novelforge-ai.sqlite`
- 本机配置：`~/Library/Application Support/NovelForge AI/.env`
- 备份：`~/Library/Application Support/NovelForge AI/backups`

数据库、API Key、作者作品、生成资产和安装包都不应提交到仓库。

## 常用命令

```bash
npm run dev
npm test
npm run typecheck
npm run build
npm run desktop:smoke
npm run mvp:acceptance
npm run work-types:acceptance
npm audit --omit=dev --audit-level=high
```

## macOS 桌面打包

```bash
npm run desktop:dev
npm run desktop:pack:mac
npm run desktop:dist:mac
```

签名、公证和发布细节见 [macOS 打包说明](docs/macos-desktop-packaging.md)。本地构建产物统一写入被忽略的 `release/` 目录。

## 参与项目

欢迎提交问题、建议和 Pull Request。开始前请阅读 [贡献指南](CONTRIBUTING.md)、[行为准则](CODE_OF_CONDUCT.md) 和 [安全政策](SECURITY.md)。

产品最重要的不变量是作者控制权：AI 可以建议变化，但正式设定、角色、世界规则、时间线和伏笔只能在作者确认后更新。

## 许可证

NovelForge AI 使用 [MIT License](LICENSE) 开源。你可以依照许可证使用、复制、修改、合并、发布、分发、再许可或销售本软件，但必须保留许可证中的版权与许可声明。
