/**
 * Minimal static file server for the exported site (`out/`), used by the
 * Playwright webServer in CI and available locally via:
 *
 *   bun scripts/serve-static.ts [root=out] [port=3000]
 *
 * Exists because `serve` buckles under the Playwright mobile matrix: with
 * multiple browser workers fetching image-heavy pages in parallel, WebKit
 * navigations against it stall until the test timeout. Bun.serve handles the
 * concurrency without breaking a sweat.
 *
 * Mirrors static-host behavior for this project's export:
 * - `/path/` serves `path/index.html` (trailingSlash: true layout)
 * - `/path` with a `path/index.html` on disk 301s to `/path/`
 * - unknown URLs serve the exported `404.html` with status 404
 */
import path from 'path';
import fs from 'fs';

const root = path.resolve(process.argv[2] ?? 'out');
const port = Number(process.argv[3] ?? 3000);

if (!fs.existsSync(root)) {
  console.error(`serve-static: root directory not found: ${root}`);
  process.exit(1);
}

function resolveSafe(pathname: string): string | null {
  const resolved = path.resolve(root, `.${pathname}`);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      pathname = url.pathname;
    }

    const target = resolveSafe(pathname);
    if (target !== null) {
      const asFile = pathname.endsWith('/') ? path.join(target, 'index.html') : target;
      if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) {
        return new Response(Bun.file(asFile));
      }
      // Directory hit without trailing slash → redirect like static hosts do.
      if (!pathname.endsWith('/') && fs.existsSync(path.join(target, 'index.html'))) {
        return Response.redirect(`${url.pathname}/${url.search}`, 301);
      }
    }

    const notFound = path.join(root, '404.html');
    if (fs.existsSync(notFound)) {
      return new Response(Bun.file(notFound), { status: 404 });
    }
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`serve-static: serving ${root} at http://localhost:${port}`);
