# Guides

Focused, task-oriented walkthroughs for non-trivial workflows. Reference material
lives in `docs/ARCHITECTURE.md`; commit conventions and the everyday command list
live in `docs/CONTRIBUTING.md`.

| Guide | Purpose |
| --- | --- |
| [Importing a VuePress 2 book](./importing-vuepress-books.md) | Mirror an external VuePress repo's `docs/` tree into an Amytis book directory, with sidebar conversion, math/container normalization, and idempotent re-runs. |
| [Migrating content to locale trees](./migrating-content-to-locale-trees.md) | Move existing published content into a `content/<locale>/` tree without breaking its old URLs. |
| [Upgrading a site](./upgrading-a-site.md) | Bring a newer Amytis release into a site made with `bun create amytis`, keeping your changes and content, with `bun run upgrade`. |
| [Translating content](./translating-content.md) | Translate a post, series or book into a locale tree with `bun run translate` and an OpenAI-compatible LLM (e.g. Aliyun Bailian). |

Add new guides as `docs/guides/<topic>.md` and link them here.
