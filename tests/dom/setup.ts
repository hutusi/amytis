/**
 * Preload for DOM-based component/hook tests (tests/dom/**).
 *
 * Registers happy-dom's globals (window, document, localStorage, …) so React
 * Testing Library can render into a real DOM. This file is loaded ONLY via
 * the `--preload` flag in the `test:dom` script — deliberately NOT through
 * bunfig.toml, which would apply it to every `bun test` invocation and leak
 * DOM globals into the SSR-oriented suites (`bun test src tests/unit …`),
 * some of which rely on a server-like environment (no `window`/`document`).
 */
import { afterEach } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Fixed viewport so media-query-dependent behavior is deterministic
// (e.g. ImmersiveReadingProvider auto-collapses its sidebar below 1024px).
GlobalRegistrator.register({ url: 'http://localhost:3000/', width: 1280, height: 800 });

// React 19 only allows act() when this flag is set. RTL toggles it around its
// own act calls, but setting it globally also covers direct `act(...)` usage.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// RTL's auto-cleanup only engages when `afterEach` exists as a global, which
// bun:test does not provide — register cleanup explicitly. Imported
// dynamically so @testing-library/dom initialises (and binds `screen`) AFTER
// the DOM globals exist.
const { cleanup } = await import('@testing-library/react');

afterEach(() => {
  cleanup();
  // bun test runs every file in one process and the happy-dom window persists
  // across files, so scrub state the components under test mutate globally.
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  delete document.documentElement.dataset.immersive;
  document.body.removeAttribute('style');
  document.body.innerHTML = '';
  window.scrollTo(0, 0);
});
