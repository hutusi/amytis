# Amytis

[English](README.md) | [简体中文](README.zh.md)

**Amytis** 是一个功能强大、设计优雅、交互友好的开源数字花园框架，用于构建知识空间、博客、展示页面或企业知识库等。它基于 Next.js 16、Tailwind CSS v4 和 Bun 构建，强调 Markdown 优先、文本优先，保障作者对内容的长期所有权，在不损失功能和性能的前提下追求极致简洁与优雅。

[**在线演示**](https://amytis.vercel.app/)

![Amytis 截图](public/images/amytis-screenshot.jpg)

## 为什么要做 Amytis ?

我写[博客有二十年](https://hutusi.com/archive)了，从最早的博客平台，如 MSN Space (MS Live Space)、新浪博客，到自己搭建 Wordpress、Drupal, 再到 GitHub Pages 推出后全面采用静态博客框架，折腾过 Jekyll、Hugo 及其多个主题，但没有一个框架或主题能让自己真正满意。功能复杂的不够简洁或优雅，简洁优雅的又缺少功能定制。能不能有一款兼顾功能、性能、美观、UX 的博客或知识平台框架呢？这个想法最近几年一直萦绕在我的脑海，实在找不到那就做一个，等到准备付诸实践，才发现难度比想象中的要大得多。

好在有 AI 编程，在 Claude Code/Gemini CLI/Codex 的帮助下，比以往要更容易实现自己的想法，在经过 700 多次 Commit 的打磨后，理想化的知识平台框架 —— Amytis 终于交付成稿，我在公司搭建的极客社区平台首次应用，并将胡涂说博客网站框架也进行了替换。同时，也将 Amytis 开源，欢迎更多的独立博主/知识管理者使用，更欢迎帮忙发现问题、提 PR 添砖加瓦。如果你也在使用 Amytis, 欢迎在[此 issue 留言](https://github.com/hutusi/amytis/issues/49)。

### 知识阶梯

Amytis 围绕一条从碎片想法到精炼知识的路径来帮助个人或组织构建完整的数字花园体系：

- **Flow（心流）**：记录每日想法与头脑风暴的灵感碎片。
- **Articles（文章）**：将单个想法打磨成清晰的文章。
- **Series（系列）**：把相关文章串联为一条主题叙事。
- **Books（书籍）**：将成熟知识沉淀为章节化结构的书籍。

每个阶段都建立在上一阶段之上，数字花园会自然生长。

### 设计理念

- **简洁优雅**：排版、间距、配色开箱即用，且遵循审美一致性。
- **内容及文本优先**：通过文本文件化写作与发布流程完成创作，不依赖重型 CMS，内容存储于 Markdown/MDX 文本，结合 Git 进行版本管理，使作者拥有长期所有权并便于平台迁移。
- **Markdown 优先**：默认支持 Markdown 及常用扩展语法，同时支持数学、图表、代码和双向链接。
- **按需启用**：`site.config.ts` 提供模块化开关，仅启用你需要的能力。

延伸阅读：[《如何让 AI 写好代码》](https://hutusi.com/weeklies/25)（中文）

## 功能特性

- **数字花园理念:** 通过标签、系列、作者、书籍、Flow 和时间归档实现非线性导航。
- **互联知识网络:**
  - **Wiki 链接:** 支持在所有内容类型之间使用 `[[Slug]]` 建立双向关联。
  - **反向链接:** 在笔记页面自动展示 “Linked References”。
  - **知识图谱:** 以交互式可视化方式展示内容之间的连接关系。
- **全文搜索:** 基于 Pagefind 的快速静态客户端全文搜索，支持 Cmd/Ctrl+K。
- **结构化内容体系:**
  - **Series:** 支持手动或自动排序的多篇内容组织方式。
  - **Legacy rST Series:** 当系列入口文件使用 `index.rst` 时，该系列会按 reStructuredText 解析；同一系列中混用 Markdown 和 rST 会在构建时直接失败。
  - **Books:** 支持明确章节、分部以及专用阅读界面的长篇内容。
  - **Notes:** 面向个人知识管理的原子化常青概念。
  - **Flows:** 用于快速记录想法的流式日记或微博客。
- **丰富的 MDX 内容能力:**
  - GitHub Flavored Markdown（表格、任务列表、删除线）。
  - 语法高亮代码块。
  - Mermaid 图表（流程图、时序图等）。
  - 通过 KaTeX 支持 LaTeX 数学公式。
  - 支持原生 HTML 以实现自定义布局。
- **优雅设计:**
  - 极简审美与高对比度排版。
  - 明暗主题，自动跟随系统设置。
  - 四套配色方案: default（emerald）、blue、rose、amber。
  - 针对阅读优化的响应式布局。
  - 纯净选区: UI 元素不可选中，确保文章内容的高保全复制。
  - 首页精选内容支持横向滚动。
- **目录:** 吸顶目录支持滚动跟踪、阅读进度指示和当前标题高亮。
- **灵活的内容结构:**
  - 支持平铺文件（`post.mdx`）或嵌套文件夹（`post/index.mdx`）。
  - 资源可与文章共置: 将图片保存在文章目录内（`./images/`）。
  - 支持带日期前缀的文件名: `2026-01-01-my-post.mdx`。
  - 支持文章、系列、书籍和 Flows 的草稿状态。
- **作者生态:** 每位作者都有独立主页，包含简介、头像和社交链接。文章可按作者筛选，文末可选显示作者卡片。
- **性能与 SEO:**
  - 全静态导出，并生成优化后的 WebP 图片。
  - 为所有内容类型生成 Open Graph 和 Twitter Card 元数据。
  - 提供 JSON-LD 结构化数据（`BlogPosting`、`Book`、`Article`），支持 Google 富媒体结果。
  - RSS/Atom 订阅源包含一个主 curated 订阅 (`feed.xml`)，以及分类订阅（`/posts/feed.xml`, `/flows/feed.xml`, `/all.xml`）。支持可配置的格式（`rss` | `atom` | `both`）和内容深度（`full` | `excerpt`）。
  - 在 `<head>` 中自动注入 Feed 自动发现链接，并原生生成 sitemap。
  - 多语言阅读时长估算，支持 Latin 和 CJK。
- **集成能力:**
  - 分析统计: Umami、Plausible 或 Google Analytics。
  - 评论系统: Giscus（GitHub Discussions）或 Disqus。
  - 国际化: 通过本地化的 `site.config.ts` 支持多语言（en、zh）。
- **内容 CLI 工具:** 支持创建文章、系列，以及从 PDF 或图片文件夹导入内容。
- **现代技术栈:** Next.js 16、React 19、Tailwind CSS v4、TypeScript 5、Bun。

## 快速开始

### 新建项目（推荐）

用一条命令创建新的 Amytis 站点:

```bash
bun create amytis my-garden
cd my-garden
bun dev
```

脚手架命令会下载最新打标签发布的 Amytis 版本，安装依赖，并根据你的项目信息更新 `site.config.ts` 和 `package.json`。

### 克隆并运行

1. **安装依赖:**

   ```bash
   bun install
   ```

2. **启动开发服务器:**

   ```bash
   bun dev
   ```

   访问 [http://localhost:3000](http://localhost:3000)。

   > **开发环境中的搜索:** Pagefind 索引会在执行 `bun run build:dev` 时生成。本地测试 Cmd/Ctrl+K 前请先运行一次；内容更新后也需要重新生成。

3. **生产构建（静态导出）:**

   ```bash
   bun run build
   ```

   静态站点会生成到 `out/` 目录，并包含优化后的图片资源。

4. **开发构建（更快，无图片优化）:**

   ```bash
   bun run build:dev
   ```

## CLI 命令

```bash
## Core
bun dev
bun run lint
bun run build:graph
bun run validate

## Build & Deploy
bun run build
bun run build:dev
bun run clean
bun run deploy                 # 部署到 Linux/nginx 服务器（需要 .env.local）

## Test
bun test
bun run test:unit
bun run test:int
bun run test:e2e
bun run test:mobile

## Create Content
bun run new "Post Title"
bun run new-weekly "Weekly Topic"
bun run new-series "Series Name"
bun run new-note "Concept"
bun run new-flow

## Import / Maintain
bun run new-from-pdf ./doc.pdf
bun run new-from-images ./photos
bun run new-flow-from-chat
bun run import-obsidian
bun run import-book
bun run sync-book
bun run series-draft "series-slug"
bun run add-series-redirects --dry-run
```

### 将聊天记录导入为 Flows

将 `.txt` 或 `.log` 文件放入 `imports/chats/`，然后执行:

```bash
bun run new-flow-from-chat
```

常用参数: `--all`、`--dry-run`、`--author "Name"`、`--append`、`--timestamp`。  
导入历史会记录在 `imports/chats/.imported` 中。

## 配置

主要站点配置位于 `site.config.ts`。`site.config.example.ts` 是脚手架所使用的参考模板，查看新选项时很有用:

```typescript
export const siteConfig = {
  // ...
  nav: [
    { name: "Home", url: "/", weight: 1 },
    { name: "Flow", url: "/flows", weight: 1.1 }, // 在导航中添加 Flows
    { name: "Series", url: "/series", weight: 1.5 },
    { name: "Books", url: "/books", weight: 1.7 },
    { name: "Archive", url: "/archive", weight: 2 },
    // ...
  ],
  // ...
  flows: {
    recentCount: 5,
  },
};
```

优先自定义这些高影响配置区块:

- 站点标识: `title`、`description`、`baseUrl`、`ogImage`、`logo`
- 导航与页脚: `nav`、`footer`、`subscribe`、`social`
- 内容行为: `posts.basePath`、`posts.includeDateInUrl`、`series.autoPaths`、`series.customPaths`
- 首页组成: `hero`、`homepage.sections`
- 集成能力: `analytics`、`comments`、`feed`、`i18n`

如果是通过 nginx 进行静态托管，可以从 `nginx.conf.example` 开始配置。

## 静态导出路由规则

Amytis 基于 Next.js 静态导出构建，关键配置为 `output: "export"` 和 `trailingSlash: true`。

- 在 `generateStaticParams()` 中返回原始 segment 值，不要预先用 `encodeURIComponent` 编码。
- 链接应指向真实 URL，例如 `/posts/中文测试文章`，而不是 `/posts/[slug]` 这样的路由占位符。
- 文章默认路径为 `/<posts.basePath>/<slug>`，其中 `posts.basePath` 默认值为 `/posts`。
- 启用 `series.autoPaths` 后，系列文章会移动到 `/<series-slug>/<post-slug>`。
- 如果配置了 `series.customPaths`，则会以这些自定义前缀覆盖 `autoPaths`。
- frontmatter 中的 `redirectFrom` 会在导出时生成静态跳转页，用于保留旧链接。
- 不要硬编码文章路径，优先使用 URL helper，因为规范 URL 可能位于 `/posts`、系列 slug 或自定义前缀之下。
- 在把系列文章从默认的 posts 路径迁走之前，先运行 `bun run add-series-redirects --dry-run`，再执行 `bun run add-series-redirects`，以确保旧链接仍然可访问。

## 内容写作

### Posts

在 `content/posts/` 中创建 `.md` 或 `.mdx` 文件。

- 平铺文件: `content/posts/my-post.mdx`
- 日期前缀文件: `content/posts/2026-01-01-my-post.mdx`
- 带共置资源的文件夹文章: `content/posts/my-post/index.mdx`，并配合 `content/posts/my-post/images/*`
- CLI: `bun run new "Post Title"` 或 `bun run new "Post Title" --folder`

### Flows

在 `content/flows/YYYY/MM/DD.md` 或 `.mdx` 中创建日记内容。

- CLI: `bun run new-flow` 会创建今天的记录
- 聊天导入: 将导出文件放入 `imports/chats/`，然后运行 `bun run new-flow-from-chat`
- 可选标题: 在 frontmatter 中设置 `title` 或在内容中使用 `# 标题`，即可在日期旁显示标题。

### Series

在 `content/series/<slug>/` 下创建目录，并选择以下其中一种入口文件：

- `index.mdx` 或 `index.md`，表示 Markdown 系列
- `index.rst`，表示 rST 系列

随后使用与入口文件一致的格式添加同级文章文件或子目录。同一系列中混用 Markdown 和 rST 会在构建时被拒绝。

- CLI: `bun run new-series "Series Name"`
- 也可以直接将文章创建到已有系列中: `bun run new "Post Title" --series <series-slug>`

### Books

书籍是位于 `content/books/<slug>/` 下的长篇结构化内容。

- 使用 `index.mdx` 保存书籍元数据
- 在同目录添加章节文件，例如 `introduction.mdx` 或 `setup.mdx`
- 与书籍相关的工作流可使用 `bun run import-book` 和 `bun run sync-book`

### Notes

在 `content/notes/` 中创建常青笔记（例如 `concept.mdx`），并使用 `[[wiki-links]]` 将它们连接起来。

- CLI: `bun run new-note "Concept"`
- 在需要时，Notes 和 Posts 都支持有意使用 Unicode slug

## 项目结构

```text
amytis/
  content/
    posts/              # 博客文章
    series/             # 系列集合
    books/              # 长篇书籍
    notes/              # 数字花园笔记
    flows/              # 日记内容（YYYY/MM/DD）
    about.mdx           # 静态页面
  docs/                 # 架构、部署、排障文档
  imports/              # 仅本地使用的导入源文件
  public/               # 静态资源
  scripts/              # Bun 编写/构建/导入工具
  src/
    app/                # Next.js App Router 页面
      books/            # 书籍路由
      notes/            # 笔记路由
      graph/            # 知识图谱
      flows/            # Flow 路由
    components/         # React 组件
    lib/
      markdown.ts       # 数据访问层
  tests/                # 单元、集成、e2e、工具测试
  packages/
    create-amytis/      # `bun create amytis` 脚手架 CLI
  site.config.ts        # 站点配置
```

## 文档

- [架构总览](docs/ARCHITECTURE.md)
- [部署指南](docs/deployment.md)
- [数字花园指南](docs/DIGITAL_GARDEN.md)
- [贡献指南](docs/CONTRIBUTING.md)
- [故障排查](docs/TROUBLESHOOTING.md)

## 许可证

MIT
