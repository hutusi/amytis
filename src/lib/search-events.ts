/**
 * Lets any client component open the navbar's search modal (e.g. the 404
 * page's "Search the site" button) without prop-drilling or a context: the
 * Search component listens for this window event.
 */
export const OPEN_SEARCH_EVENT = 'amytis:open-search';

export function openSearch(): void {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}
