---
paths:
  - "src/lib/rst*.ts"
  - "src/lib/shiki-rst.ts"
  - "src/components/RstRenderer.tsx"
---

# rST rendering gotchas

- **rST needs Python `docutils`.** Set `AMYTIS_RST_PYTHON=/path/to/python` if not on `$PATH`. Without it, falls back to a lower-fidelity built-in parser.
- **sanitize-html allowlist must keep `style` + `data-*` on `pre`/`code`/`span`/`div`.** Stripping any of these silently kills Shiki output (monochrome text in prod, looks fine locally because dev rST isn't sanitized). See `src/components/RstRenderer.tsx`.
- **Code-group tabs add `<input type="radio">` + `<label>` to the sanitize-html allowlist.** Keep the `transformTags` guard in `RstRenderer.tsx` that strips any `<input>` whose `type !== "radio"` — that's the defense against an rST author injecting password/file/etc. inputs through raw HTML.
- **Bump `RST_RENDERER_DISK_CACHE_VERSION` (`src/lib/rst-renderer.ts`) on highlighter-output changes.** Stale on-disk caches in `.cache/rst-renderer/` will serve old markup otherwise. Run `rm -rf .cache/rst-renderer` after pulling such a change.
