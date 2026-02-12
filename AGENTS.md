# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router routes (`page.tsx`, dynamic segments, sitemap/feed routes).
- `src/components/`: Reusable UI components (post cards, nav, search, TOC, theme/i18n controls).
- `src/lib/`: Core utilities and content parsing logic (Markdown, i18n helpers, rehype plugins).
- `content/posts/` and `content/series/`: MDX/Markdown content source; posts may be flat (`post.mdx`) or folder-based (`post/index.mdx` + `assets/` or `images/`).
- `tests/`: Integration, e2e, and tooling tests. Keep fast unit tests near source when practical (example: `src/lib/markdown.test.ts`).
- `scripts/`: Bun CLI scaffolding/import tools for posts and series.

## Build, Test, and Development Commands
- `bun install`: Install dependencies (Bun is the package manager/runtime).
- `bun dev`: Start local development server at `http://localhost:3000`.
- `bun run build`: Production build (copies assets, builds Next.js, runs image optimizer).
- `bun run build:dev`: Faster build without export image optimization.
- `bun run lint`: Run ESLint.
- `bun test`: Run all tests.
- `bun run test:unit`, `bun run test:int`, `bun run test:e2e`: Run specific suites.
- `bun run clean`: Remove generated artifacts (`.next`, `out`, `public/posts`).

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`) and MDX content.
- Follow existing file-local style (quote preference and formatting can vary); rely on ESLint for enforcement.
- Use PascalCase for React components (`PostList.tsx`), camelCase for utilities (`shuffle.ts`), kebab-case for route/content slugs.
- Prefer small, composable helpers in `src/lib/` over duplicating logic in route files.

## Testing Guidelines
- Framework: Bun test runner (`bun:test`).
- Test files use `*.test.ts` naming.
- Add/adjust tests for behavior changes in parsing, routing, series ordering, and content tooling.
- Before opening a PR, run at least `bun run lint && bun test`.

## Commit & Pull Request Guidelines
- Use Conventional Commit-style messages seen in history: `feat:`, `fix:`, `refactor:`, `release:`.
- Keep commits focused and descriptive (one logical change per commit).
- PRs should include: purpose, scope, test results, and screenshots for visible UI changes.
- CI (`.github/workflows/ci.yml`) must pass: install, lint, test, and build.

## Content & Configuration Tips
- Update `site.config.ts` for site-level behavior (metadata, pagination, featured sections).
- Prefer scaffolding commands (`bun run new`, `bun run new-series`, `bun run new-from-pdf`, `bun run new-from-images`) to keep frontmatter and paths consistent.
