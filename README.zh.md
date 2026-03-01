# Amytis

[English](README.md) | [简体中文](README.zh.md)

**Amytis** 是一个优雅的开源数字花园框架，用于构建个人知识空间。它基于 Next.js 16、React 19 和 Tailwind CSS v4，强调可读性、结构化表达与长期内容所有权。

[**在线演示**](https://amytis.vercel.app/)

![Amytis 截图](public/screenshot.png)

## 知识阶梯

Amytis 围绕一条从粗糙到精炼的知识路径构建：

- **Flow（随笔）**：记录每日想法与碎片。
- **Articles（文章）**：将单个想法打磨成清晰文章。
- **Series（系列）**：把相关文章串联为一条主题叙事。
- **Books（书籍）**：将成熟知识沉淀为章节化结构。

每个阶段都建立在上一阶段之上，花园会自然生长。

## 功能特性

- **数字花园体验**：通过标签、系列、作者、书籍、Flow 和归档进行非线性导航。
- **互联知识网络**：
  - **双向链接**：支持 `[[Slug]]` 跨内容类型关联。
  - **反向链接**：在笔记页自动显示“Linked References”。
  - **知识图谱**：以可视化方式展示内容连接关系。
- **全文搜索**：基于 Pagefind 的静态搜索，支持 Cmd/Ctrl+K 快捷键。
- **结构化内容体系**：
  - **Series**：支持手动或自动排序的多篇集合。
  - **Books**：支持章节与分部的长篇阅读界面。
  - **Notes**：原子化常青笔记。
  - **Flows**：流式日记/微记录。
- **富文本 MDX 能力**：
  - GitHub Flavored Markdown（表格、任务列表等）
  - 代码高亮
  - Mermaid 图表
  - KaTeX 数学公式
  - 原生 HTML 支持
- **阅读体验与设计**：
  - 高可读排版与响应式布局
  - 自动系统主题检测（明/暗）
  - 四套配色主题：default、blue、rose、amber
  - 吸顶目录与阅读进度跟踪
- **性能与 SEO**：
  - 全静态导出与 WebP 优化
  - 自动 sitemap 与 RSS
  - 支持 Latin/CJK 的多语言阅读时长估算
- **集成能力**：
  - 统计：Umami / Plausible / Google Analytics
  - 评论：Giscus / Disqus
  - i18n：`site.config.ts` 中配置多语言（en / zh）

## 设计理念

- **默认优雅**：排版、间距、色彩开箱即用且有审美一致性。
- **内容优先**：通过文件化写作与发布流程完成创作，不依赖重型 CMS。
- **Markdown 优先但不受限**：保持可迁移写作体验，同时支持数学、图表、代码和双向链接。
- **按需启用**：`site.config.ts` 提供模块化开关，仅启用你需要的能力。
- **纯文本长期所有权**：内容存储于 Markdown/MDX，便于版本管理与长期迁移。

## 快速开始

1. **安装依赖**
   ```bash
   bun install
   ```

2. **启动开发环境**
   ```bash
   bun dev
   ```
   打开 [http://localhost:3000](http://localhost:3000)。

3. **生产构建（静态导出）**
   ```bash
   bun run build
   ```
   产物位于 `out/` 目录。

4. **开发构建（更快，无图片优化）**
   ```bash
   bun run build:dev
   ```

## CLI 命令

```bash
## Core
bun dev
bun run lint
bun run validate

## Build & Deploy
bun run build
bun run build:dev
bun run clean
bun run deploy                 # 部署到 Linux/nginx 服务器（需要 .env.local 配置）

## Test
bun test
bun run test:unit
bun run test:int
bun run test:e2e

## Create Content
bun run new "Post Title"
bun run new-series "Series Name"
bun run new-note "Concept"
bun run new-flow

## Import / Maintain
bun run new-from-pdf ./doc.pdf
bun run new-from-images ./photos
bun run new-flow-from-chat
bun run import-book
bun run sync-book
bun run series-draft "series-slug"
```

### 导入聊天记录到 Flows

将 `.txt` 或 `.log` 文件放入 `imports/chats/` 后执行：

```bash
bun run new-flow-from-chat
```

常用参数：`--all`、`--dry-run`、`--author "Name"`、`--append`、`--timestamp`。  
导入历史记录位于 `imports/chats/.imported`。

## 配置

所有站点配置集中在 `site.config.ts`。

## 内容写作

- **Posts**：创建到 `content/posts/`
- **Flows**：创建到 `content/flows/YYYY/MM/DD.mdx`（或文件夹模式）
- **Series**：创建 `content/series/<slug>/index.mdx`
- **Books**：创建到 `content/books/<slug>/`
- **Notes**：创建到 `content/notes/`，支持 `[[wiki-links]]`

## 项目结构

```text
amytis/
  content/
    posts/
    series/
    books/
    notes/
    flows/
  public/
  src/
    app/
    components/
    lib/
  site.config.ts
```

## 文档

- [架构说明](docs/ARCHITECTURE.md)
- [部署指南](docs/deployment.md)
- [数字花园指南](docs/DIGITAL_GARDEN.md)
- [贡献指南](docs/CONTRIBUTING.md)

## 许可证

MIT
