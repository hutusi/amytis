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
