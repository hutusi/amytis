---
title: "传统 Markdown 支持"
date: "2026-01-15"
excerpt: "演示对标准 .md 文件的支持。"
category: "Meta"
tags: ["markdown", "legacy"]
author: "Old Timer"
---

# 传统 Markdown 支持

这篇文章使用标准的 `.md` 文件编写，而非 `.mdx`。

## 为什么要同时支持两者？

从其他系统（Jekyll、Hugo）迁移时，往往涉及数千个 `.md` 文件。原生支持这些文件能让迁移更加轻松。

## 脚注

脚注测试[^test]。

支持 `.md` 的主要好处之一是可以无缝迁移。如果你正在从 Jekyll、Hugo 或其他静态站点生成器迁移，现有的文章可以直接放入 `content/posts/` 目录，无需任何修改。`title`、`date` 和 `tags` 等 Frontmatter 字段在两种格式中的解析方式完全相同。

关键区别在于 `.mdx` 文件允许在内容中直接嵌入 React 组件，而 `.md` 文件则坚持使用标准 Markdown。对于大多数博客文章来说，标准 Markdown 已经绰绰有余——将内容保留在 `.md` 中意味着它可以在任何兼容 Markdown 的系统之间自由迁移。

### 代码块测试

```javascript
console.log("Hello from .md file!");
```

- 项目 1
- 项目 2

## 引用

这是一个[指向 Markdown 指南的链接][guide]。

内部链接：[首页](/zh/)和[归档](/archive)。

## 更多引用链接

引用链接测试：[Markdown 指南][guide]、[CommonMark][commonmark]。

[guide]: https://www.markdownguide.org
[commonmark]: https://commonmark.org

### markdown 表格

| 特性 | 总和 | 备注 |
| :--- | :---: | :--- |
| 表格 | `>` 10 | 需要 remark-gfm |
| 任务列表 | 5 | 复选框 |
| 删除线 | 1 | ~~已删除~~ |


[^test]: 一个简单的脚注。
