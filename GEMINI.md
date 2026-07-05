# Amytis — Gemini Context

**Amytis** (`@hutusi/amytis`) is a high-performance digital garden and blog engine: Next.js 16 (App Router), React 19, Tailwind CSS v4, fully static export (`output: "export"`). Content lives in local MDX/Markdown (primary) and rST (legacy) files with Zod-validated frontmatter; everything resolves at build time. Package manager and runtime: [Bun](https://bun.sh/).

All repository guidelines — project structure, build/test/dev commands, coding style, static-export routing rules, testing, and commit/PR conventions — live in **[AGENTS.md](AGENTS.md)**. Follow that file; this one intentionally duplicates none of it.

Deeper references:

- `docs/ARCHITECTURE.md` — route map, content model, components, data layer, configuration reference
- `docs/CONTRIBUTING.md` — full command list, test layout, content-creation scripts
- `docs/TROUBLESHOOTING.md` — known issues and their root causes
- `site.config.ts` — live site configuration (read it directly)
