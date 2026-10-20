---
paths:
  - "src/lib/rst*.ts"
  - "src/lib/shiki-rst.ts"
  - "src/components/RstRenderer.tsx"
---

# rST rendering gotchas

- **rST needs Python `docutils`.** Set `AMYTIS_RST_PYTHON=/path/to/python` if not on `$PATH`. Without it, falls back to a lower-fidelity built-in parser.
- **sanitize-html allowlist must keep `style` + `data-*` on `pre`/`code`/`span`/`div`.** Stripping any of these silently kills Shiki output (monochrome text in prod, looks fine locally because dev rST isn't sanitized). The config lives in `src/lib/rst-sanitize.ts`, shared by `RstRenderer.tsx` and the full-content feeds (`feed-utils.ts`) — a change there affects both surfaces.
- **Code-group tabs add `<input type="radio">` + `<label>` to the sanitize-html allowlist.** Keep the `transformTags` guard in `src/lib/rst-sanitize.ts` that strips any `<input>` whose `type !== "radio"` — that's the defense against an rST author injecting password/file/etc. inputs through raw HTML.
- **`spawnSync` comes from `process.getBuiltinModule('node:child_process')`, not an import.** Turbopack traces an imported spawn's executable as a file; the configurable Python command isn't a literal, so it traced the whole project (the "unexpected file in NFT list" build warning). `turbopackIgnore` doesn't work on spawn calls. Don't "tidy" it back into an `import`.
- **The `.cache/rst-renderer/` disk cache auto-invalidates** on per-file content changes (`sourceHash`) and on `scripts/render-rst.py` changes (hashed into the key as `rendererHash` — see `getRstRendererCodeHash` in `src/lib/rst-renderer.ts`). So editing the docutils renderer no longer needs a manual cache bump. Only bump `RST_RENDERER_DISK_CACHE_VERSION` for cache-shape changes that originate OUTSIDE the Python script (e.g. a new entry field). Shiki/highlighter changes do **not** need a bump — Shiki output isn't stored in this cache; it runs downstream in `RstRenderer.tsx`.
