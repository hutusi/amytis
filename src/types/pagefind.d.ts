/**
 * Type declarations for Pagefind's JS API.
 * Pagefind is generated at build time (`pagefind --site out`) and
 * loaded at runtime via a dynamic import. The module does not exist
 * at compile time, so we declare it manually here.
 *
 * Docs: https://pagefind.app/docs/api/
 */
declare module '/pagefind/pagefind.js' {
  export interface PagefindSearchFragment {
    /** URL of the matching page, e.g. "/posts/my-post/" */
    url: string;
    /** Excerpt with matched terms wrapped in <mark> tags */
    excerpt: string;
    /** Metadata extracted from the page */
    meta: {
      title?: string;
      image?: string;
      /** Any custom data-pagefind-meta keys defined in the site */
      [key: string]: string | undefined;
    };
    word_count: number;
  }

  export interface PagefindSearchResult {
    /** Unique result ID, e.g. "en_6fceec9" */
    id: string;
    /** Load the full result data (lazy, returns only the matching page chunk) */
    data: () => Promise<PagefindSearchFragment>;
  }

  export interface PagefindSearchResponse {
    results: PagefindSearchResult[];
    unfilteredResultCount: number;
  }

  /** Initialise Pagefind — must be called before search() */
  export function init(): Promise<void>;

  /** Run a search and return lazy result handles */
  export function search(query: string): Promise<PagefindSearchResponse>;
}
