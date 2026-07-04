# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages and route handlers (`posts`, `series`, `books`, `flows`, `notes`, `tags`, `authors`, feeds, graph, sitemap, custom `[slug]` routes).
- `src/components/`: Reusable UI building blocks (cards, navigation, search, i18n/theme controls).
- `src/lib/`: Content parsing and shared logic (the `content/` data layer, feed helpers, URL helpers, rehype/remark utilities).
- `content/`: Markdown/MDX source content for posts, series, books, notes, flows, and static pages. Use folder posts (`index.mdx` + `images/` or `assets/`) when media is co-located.
- `tests/`: Integration/e2e/tooling suites; keep focused utility tests near source (example: `src/lib/format-utils.test.ts`).
- `scripts/`: Bun-based authoring/import/build tooling.
- `imports/`: Local-only staging area for chat logs, PDFs, and image folders consumed by import scripts; see `imports/README.md`.
- `packages/create-amytis/`: The `bun create amytis` scaffold CLI; keep its tests aligned with repo scaffolding behavior.
- `site.config.ts` is the live site configuration; `site.config.example.ts` is the fuller reference template.

## Build, Test, and Development Commands
- `bun install`: Install dependencies.
- `bun dev`: Run local dev server at `http://localhost:3000`.
- `bun run build`: Production export build (copy assets, generate graph, Next build, optimize images, generate Pagefind index in `out/pagefind`).
- `bun run build:dev`: Build without export image optimization and generate the dev search index in `public/pagefind`.
- `bun run build:graph`: Regenerate the knowledge graph data.
- `bun run validate`: Run the recommended pre-PR validation sequence (`lint`, `typecheck`, `test`, `build:dev`).
- `bun run clean`: Remove generated outputs (`.next`, `out`, `public/posts`, `public/books`, `public/flows`).
- `bun run lint`: Run ESLint.
- `bun run test` / `bun run test:unit` / `bun run test:int` / `bun run test:e2e` / `bun run test:mobile`: Run all or scoped tests. Use `bun run test`, not bare `bun test` — the bare form sweeps in Playwright e2e specs and fails.
- Content tooling: `bun run new`, `bun run new-weekly`, `bun run new-series`, `bun run new-note`, `bun run new-flow`, `bun run new-flow-from-chat`, `bun run new-from-pdf`, `bun run new-from-images`, `bun run import-obsidian`, `bun run import-book`, `bun run sync-book`, `bun run series-draft`, `bun run add-series-redirects`.

## Coding Style & Naming Conventions
- Use TypeScript for app and utility code; MDX/Markdown for content.
- Match existing file style and let ESLint enforce consistency.
- Naming: components in PascalCase (`PostCard.tsx`), helpers in camelCase (`getAuthorSlug`), content slugs in kebab-case unless intentionally Unicode.
- Keep business logic in `src/lib/` and keep route files thin.

## Static Export Route Rules (Important)
- Project uses `output: "export"` and `trailingSlash: true` in `next.config.ts`.
- In `generateStaticParams()`, return raw segment values; do not pre-encode with `encodeURIComponent`.
- Never link to route placeholders like `/posts/[slug]`; always link to concrete slugs (for example, `/posts/中文测试文章`).
- Posts default to `/<posts.basePath>/<slug>`, but may also resolve through `series.autoPaths`, `series.customPaths`, and `[slug]/[postSlug]`; preserve URL helpers instead of hardcoding paths.
- Before moving series posts away from the default posts path, run `bun run add-series-redirects --dry-run` and then `bun run add-series-redirects` so legacy URLs keep resolving.
- When touching dynamic routes, verify both ASCII and Unicode paths.

## Testing Guidelines
- Test framework: Bun (`bun:test`). File pattern: `*.test.ts`.
- Add tests when changing slug resolution, content parsing, routing, feed generation, or scaffolding scripts.
- Before PR: run `bun run validate`.
- Search in local dev depends on the Pagefind output from `bun run build:dev`; regenerate it when changing content or search behavior.

## Commit & Pull Request Guidelines
- Follow Conventional Commits used in history (`feat:`, `fix:`, `refactor:`, `docs:`, `release:`).
- Keep commits single-purpose and include impacted paths in PR description.
- PRs should include intent, validation steps, and screenshots for UI changes.
- CI must pass (`bun install --frozen-lockfile`, lint, test, build).
