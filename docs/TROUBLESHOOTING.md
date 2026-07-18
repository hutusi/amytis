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

## Production build stalls at "Creating an optimized production build"

`bun run build` / `bun run build:dev` run `next build`, which on Next 16 uses **Turbopack** by default.
If the build hangs at *"Creating an optimized production build …"* and never progresses, fall back to the
Webpack builder via the dedicated script:

```bash
bun run build:webpack
```

`build:webpack` mirrors `build` exactly — the same asset-copy, knowledge-graph, image-optimizer, and Pagefind
steps — and only swaps `next build` for `next build --webpack`. Prefer it over a bare `next build --webpack`,
which skips the surrounding pipeline and produces an incomplete/stale export.

**Status** — this is **not reproducible on all machines**: on the maintainer's setup the default Turbopack
build completes the full static export (~380 pages) in well under a minute, cold. A stall has been observed
in other environments (CI / different Node or bun versions), so it appears environment-specific or
intermittent rather than a repo misconfiguration — hence the scripts are left on the Turbopack default. The
Webpack builder produces an equivalent export, so `--webpack` is a safe unblock if you hit it. The
image-optimizer and Pagefind steps run *after* `next build`, so a stall there is a separate issue.

## Windows: use `npm install` (bun's installer is unreliable on Windows)

On Windows, `bun install` does not produce a working `node_modules` for this project — but the **bun
runtime is fine**, so once dependencies are installed with npm, `bun run build` / `bun dev` / `bun run
test` all work normally.

**Install dependencies with npm on Windows:**

```bat
:: from the project root
rmdir /s /q node_modules
npm install
bun run build
```

(`bun.lock` stays the source of truth; the `package-lock.json` npm creates is git-ignored — don't commit
it. macOS/Linux/CI keep using `bun install`.)

**Why** — two distinct `bun install` failure modes on Windows, neither of which npm has:

- **Isolated (bun's workspace default)** builds a symlinked `node_modules/.bun/` store. `shiki` (a
  top-level symlink) and `postcss` (a child dep of `sanitize-html`, reachable only through the symlink
  chain) then fail to resolve — the build dies with `Module not found: Can't resolve 'postcss' / 'shiki'`
  under *both* Turbopack and Webpack (proving it's a `node_modules`-resolution problem, not a bundler one).
- **Hoisted (`bun install --linker=hoisted`)** instead fails with `could not create process / Bun failed
  to remap this bin to its proper location within node_modules / corrupted node_modules directory`, which
  persists even after `bun install --force`.

npm's flat layout sidesteps both: real top-level directories and Windows-correct bin shims.

> The Turbopack warnings about `spawnSync` in `rst-renderer.ts` matching thousands of files (and the
> `next.config.ts` NFT note) are unrelated, build-time-only, and harmless — `turbopackIgnore` does not
> apply to `spawnSync`. They appear on every platform and do not fail the build.
