---
paths:
  - "src/components/Immersive*.tsx"
  - "src/components/PostReadingShell.tsx"
  - "src/components/BookReadingShell.tsx"
  - "src/components/Navbar.tsx"
  - "src/components/Footer.tsx"
  - "src/components/ReadingProgressBar.tsx"
  - "src/lib/immersive-reading-prefs.ts"
  - "src/app/books/**"
  - "src/app/[slug]/**"
  - "src/app/posts/**"
  - "src/app/globals.css"
---

# Immersive reading gotchas

- **Chrome-hiding hooks.** `Navbar`, `Footer`, and `ReadingProgressBar` carry stable `data-site-nav` / `data-site-footer` / `data-reading-progress` attributes that the CSS rules in `globals.css` use to hide chrome when `html[data-immersive="true"]` is set. Don't strip these attributes during refactors — the fullscreen `ImmersiveReader` overlay in books and series posts depends on them as defense-in-depth even though the overlay also covers them. Reading-theme overrides (Light / Sepia / Dark) are scoped to `[data-reader-overlay]`, not `<html>`, so they compose with the site's light/dark theme without leaking outside the overlay; the overlay also adds Tailwind's `.dark` class when `readingTheme === 'dark'` so `dark:prose-invert` fires inside it even when the site is in light mode.
- **Provider is mounted at three layout boundaries**, one per content surface that supports the reader: `src/app/books/[slug]/layout.tsx` (chapter routes), `src/app/[slug]/layout.tsx` (series posts on autoPaths URLs, the default), and `src/app/posts/layout.tsx` (series posts on default-path URLs). Each layout mounts an independent provider instance — `enabled` state doesn't bleed between content types — but they all share the same localStorage key (`amytis-reader-prefs`), so a reader's font/theme/width prefs carry across books and series. Don't merge the three or move the provider to root layout: doing so would leak `enabled=true` to pages without a shell (PostReadingShell / BookReadingShell) to render the overlay, breaking the page.
- **`ImmersiveReadingFlagHandler` must stay in its own `<Suspense>` boundary in each of those three layouts**, as a sibling of `{children}` (not inside the provider), because its `useSearchParams` triggers a static-export bailout — wrapping the provider would drag the chapter/post page out of static prerender. The handler must **not** use a one-shot ref guard either: caught in PR-#93 review, the ref survives client-side navigation under the persistent layout, so a second `?immersive=1` click in the same tab silently no-ops. Rely on `router.replace` stripping the flag (which re-fires the effect with the flag gone) instead.
- **Prefs persistence quirks** (`src/components/ImmersiveReadingProvider.tsx` + `src/lib/immersive-reading-prefs.ts`): persist effect flips `hydratedRef` on its *first run* and returns — moving the flip into the hydration effect causes a default-clobbering race (the persist effect runs before React commits the stored values from the closure). Per-key defensive parsing on read is also load-bearing: a corrupt single value (schema drift, hand-edits) must fall back to default without discarding the whole blob. Both behaviours have unit/integration test coverage; don't regress them when refactoring the storage layer or the hydrate/persist effects.
