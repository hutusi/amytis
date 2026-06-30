# Troubleshooting

## False-positive Chrome console warnings in dev mode

**Related issue:** [#33](https://github.com/hutusi/amytis/issues/33)

When running `bun dev` and opening the site in Chrome with certain browser extensions installed, you may see two console messages that look like project bugs:

- **Error**: `Content Security Policy of your site blocks the use of eval in JavaScript.`
- **Warning**: `Deprecated feature used; the Shared Storage API is deprecated and will be removed in a future release.`

**These are not bugs in the project.** Investigation confirmed:

- The dev server sends no `Content-Security-Policy` header
- No meta CSP tag exists in the generated HTML
- No `eval()` or `new Function()` calls exist in the compiled JS chunks
- No `sharedStorage` references exist anywhere in the project or its dependencies

The messages come from **browser extensions** (e.g. uBlock Origin, Privacy Badger) that inject their own CSP headers or access the Shared Storage API internally. Chrome attributes these to "your site" even though the project is not the source.

**To verify:** Open `http://localhost:3000` in a Chrome Incognito window with extensions disabled — both messages will be gone.

## AVIF source images cause 404s in production

**Related upstream issue:** [Niels-IO/next-image-export-optimizer#263](https://github.com/Niels-IO/next-image-export-optimizer/issues/263)

`next-image-export-optimizer` has a bug with AVIF source files when `storePicturesInWEBP=true`. The optimizer writes `.WEBP` output to disk but `ExportedImage` generates `srcset` paths with the original `.AVIF` extension — pointing to files that do not exist, causing 404 errors in production.

**Workaround:** Do not use `.avif` as a source format for cover images or any image referenced via `ExportedImage`. Use `.jpg`, `.png`, or `.webp` instead — the optimizer converts these to WebP correctly.

AVIF is a great format in general, but this project's static-export image pipeline (`next-image-export-optimizer`) does not handle AVIF source files correctly until the upstream bug is fixed.

## `bun run build` fails on Windows with a `validator.ts` "Cannot find module" type error

**Symptom** (Windows only; macOS/Linux build fine):

```
We detected TypeScript in your project and reconfigured your tsconfig.json file for you.
  - include was updated to add '.next/dev/types/**/*.ts'
Running TypeScript .Failed to type check.
.next/dev/types/validator.ts:98:39
Type error: Cannot find module '../../../src/app/books/[slug]/[chapter]/page.js'
```

**Cause.** `next dev` and `next build` write route-type files to *different* directories:
`next build` → `.next/types/`, `next dev` → `.next/dev/types/`. A `.next/dev/types/validator.ts`
left over from an older `next dev` run can still reference a route that has since been renamed
or removed (here, `books/[slug]/[chapter]` → `books/[slug]/[...chapter]`). Next.js force-adds
`.next/dev/types/**/*.ts` to `tsconfig.json`'s `include` on every build (and re-adds it if you
remove it — see [vercel/next.js#85028](https://github.com/vercel/next.js/issues/85028)), so its
in-build type checker loads that stale file and fails. `.next/` is gitignored, so only the
machine holding the stale artifact is affected.

**Resolution (already committed).** `tsconfig.json` excludes the dev-only route types so they
are never type-checked, which `next dev`'s tsconfig reconfiguration can't undo (Next only adds
to `include`, never to `exclude`):

```jsonc
"exclude": ["node_modules", ".next/dev/types"]
```

If a machine still has a stale `.next/`, clear it once with `bun run clean`, then `bun run build`.

## `bun run build` fails on Windows with `Module not found: Can't resolve 'postcss'` / `'shiki'`

**Symptom** (Windows only; macOS/Linux build fine) — Turbopack fails during compile:

```
./node_modules/sanitize-html/index.js  Module not found: Can't resolve 'postcss'
./src/lib/shiki.ts                      Module not found: Can't resolve 'shiki'
> Build error occurred — Turbopack build failed with 2 errors
```

**Cause.** This repo is a bun **workspace** (`packages/create-amytis`), and bun defaults workspaces to
the **isolated** linker — a pnpm-style `node_modules/.bun/` store wired together with **symlinks**.
`shiki` is a top-level symlink, and `postcss` (a child dependency of `sanitize-html`) is never hoisted —
it is reachable only through the symlink chain. macOS/Linux follow these symlinks fine, but **isolated
installs are broken on Windows** (a known bun limitation), so Turbopack can't resolve the symlinked
packages.

**Resolution (already committed).** A repo-root `bunfig.toml` forces the flat **hoisted** layout (real
top-level directories + hardlinks, no symlink store), which resolves cross-platform:

```toml
[install]
linker = "hoisted"
```

After pulling this, re-materialize `node_modules` once: delete `node_modules`, then `bun install`
(or `bun install --linker hoisted` if your bun version ignores the config key), then `bun run build`.

> The Turbopack warnings about `spawnSync` in `rst-renderer.ts` matching thousands of files (and the
> `next.config.ts` NFT note) are unrelated, build-time-only, and harmless — `turbopackIgnore` does not
> apply to `spawnSync`. They appear on every platform and do not fail the build.
