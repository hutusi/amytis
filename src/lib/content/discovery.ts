import fs from 'fs';
import { siteConfig } from '../../../site.config';
import { getPostUrl, getFlowUrl, getNoteUrl, getSeriesUrl, localizeUrl } from '../urls';
import { isFeatureEnabled } from '../features';
import { domainDir } from './io';
import { createMemo, createProdKeyedMemo } from './cache';
import { getAllPosts, getPostsWithLocaleOriginals } from './posts';
import { getAllFlows } from './flows';
import { getAllNotes, getNotesWithLocaleOriginals } from './notes';
import { getSeriesData } from './series';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

/**
 * Cross-content discovery: the tag aggregate, the wikilink slug registry,
 * and the backlink index. Everything here spans posts + flows + notes
 * (+ series), which is why it sits at the top of the content dependency
 * chain rather than inside any single domain module.
 */

const allTagsMemo = createMemo<Record<string, number>>();

export function getAllTags(): Record<string, number> {
  return allTagsMemo.get(() => {
    const allPosts = getPostsWithLocaleOriginals();
    const allFlows = getAllFlows();
    const allNotes = getNotesWithLocaleOriginals();

    // counts keyed by lowercase for deduplication; display preserves first-seen casing
    const counts: Record<string, number> = {};
    const display: Record<string, string> = {};

    const addTags = (tags: string[]) => {
      // seen is per-document: prevents a single post with both "React" and
      // "react" in its tags from being counted twice.
      const seen = new Set<string>();
      for (const tag of tags) {
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        // First-seen casing wins globally. If post A uses "React" and post B
        // uses "react", the display form will be whichever was processed first
        // (typically alphabetical by filename). Authors should use consistent
        // casing in frontmatter to avoid ambiguity.
        if (!display[key]) display[key] = tag;
        counts[key] = (counts[key] || 0) + 1;
      }
    };

    allPosts.forEach((post) => { addTags(post.tags); });
    // Notes and flows belong to the `flow` feature. When it's disabled their
    // routes 404, so their tags must not seed tag pages/sitemap entries either.
    if (isFeatureEnabled('flow')) {
      allFlows.forEach((flow) => { addTags(flow.tags); });
      allNotes.forEach((note) => { addTags(note.tags); });
    }

    // Return with original-casing display form as key so consumers can show it correctly.
    // Callers that use the key as a URL slug must call key.toLowerCase().
    const result: Record<string, number> = {};
    for (const [key, count] of Object.entries(counts)) {
      result[display[key]] = count;
    }
    return result;
  });
}

// ─── Slug Registry ───────────────────────────────────────────────────────────

export interface SlugRegistryEntry {
  url: string;
  type: 'post' | 'note' | 'flow' | 'series';
  title: string;
}

const slugRegistryMemo = createProdKeyedMemo<string, Map<string, SlugRegistryEntry>>();

/**
 * Wikilink target registry. For a non-default locale, the locale tree is
 * OVERLAID on the default registry — [[slug]] in zh content resolves
 * locale-first and falls back to the default tree. Twins legitimately share
 * slugs, so cross-tree "collisions" are expected and never throw; the
 * uniqueness throws below apply within one tree.
 */
export function buildSlugRegistry(locale: string = DEFAULT_LOCALE): Map<string, SlugRegistryEntry> {
  // Prod-only memo: dev rebuilds per call so HMR sees fresh wikilink targets.
  return slugRegistryMemo.get(locale, () => {
    if (locale === DEFAULT_LOCALE) return computeTreeRegistry(DEFAULT_LOCALE);
    return new Map([...buildSlugRegistry(DEFAULT_LOCALE), ...computeTreeRegistry(locale)]);
  });
}

function computeTreeRegistry(locale: string): Map<string, SlugRegistryEntry> {
    const map = new Map<string, SlugRegistryEntry>();
    // Notes and flows belong to the `flow` feature: when it's off their pages
    // aren't built, so [[links]] to them must not resolve to those URLs.
    const flowEnabled = isFeatureEnabled('flow');

    // Posts throw on canonical-URL collisions, not bare-slug ones: a
    // duplicate slug is legal when series prefixes (autoPaths/customPaths)
    // give the posts distinct URLs — the rST toctree fixtures rely on this.
    // Two posts resolving to the SAME URL is a bug under every config
    // (e.g. duplicate slugs with series prefixes disabled). Bare-slug
    // wikilink targets stay last-wins for same-slug series children — a
    // known ambiguity, [[slug]] has no qualified form to prefer.
    const postUrlOwners = new Map<string, string>();
    getAllPosts(locale).forEach(p => {
      const url = getPostUrl(p);
      if (postUrlOwners.has(url)) {
        throw new Error(
          `[amytis] Two posts resolve to the same URL "${url}". Rename one of them, ` +
          `or adjust series.autoPaths/customPaths so every post has a unique canonical URL.`
        );
      }
      postUrlOwners.set(url, p.slug);
      map.set(p.slug, { url, type: 'post', title: p.title });
    });

    // Flows have no locale trees (deferred) — only the default registry sees them.
    if (flowEnabled && locale === DEFAULT_LOCALE) {
      getAllFlows().forEach(f => {
        const existing = map.get(f.slug);
        if (existing) {
          // Reachable via a day with both DD.md and DD/index.md — the walk
          // yields two flows with the same date slug.
          throw new Error(
            `[amytis] Flow slug "${f.slug}" collides with an existing ${existing.type} of the same slug. ` +
            `Slugs must be unique across posts, flows, notes, and series so wikilinks resolve unambiguously.`
          );
        }
        map.set(f.slug, { url: getFlowUrl(f.slug), type: 'flow', title: f.title });
      });
    }

    (flowEnabled ? getAllNotes(locale) : []).forEach(n => {
      // Slugs and aliases must be unique across all content so a wikilink
      // [[target]] resolves unambiguously. A collision is a build-time error,
      // not a silent overwrite (strict-build invariant).
      const existing = map.get(n.slug);
      if (existing) {
        throw new Error(
          `[amytis] Note slug "${n.slug}" collides with an existing ${existing.type} of the same slug. ` +
          `Slugs must be unique across posts, flows, notes, and series so wikilinks resolve unambiguously.`
        );
      }
      map.set(n.slug, { url: localizeUrl(getNoteUrl(n.slug), locale), type: 'note', title: n.title });
      n.aliases.forEach(a => {
        const existingAlias = map.get(a);
        if (existingAlias) {
          throw new Error(
            `[amytis] Note alias "${a}" (→ "${n.slug}") collides with an existing ${existingAlias.type}. ` +
            `Aliases must be unique across all content so wikilinks resolve unambiguously.`
          );
        }
        map.set(a, { url: localizeUrl(getNoteUrl(n.slug), locale), type: 'note', title: n.title });
      });
    });

    const localeSeriesDir = domainDir('series', locale);
    if (fs.existsSync(localeSeriesDir)) {
      fs.readdirSync(localeSeriesDir, { withFileTypes: true }).forEach(entry => {
        if (!entry.isDirectory()) return;
        const slug = entry.name;
        // Same uniqueness contract as notes: a series slug must not collide
        // with an existing post / flow / note / alias, or wikilinks become
        // ambiguous (strict-build invariant).
        const existing = map.get(slug);
        if (existing) {
          throw new Error(
            `[amytis] Series slug "${slug}" collides with an existing ${existing.type} of the same slug. ` +
            `Slugs must be unique across posts, flows, notes, and series so wikilinks resolve unambiguously.`
          );
        }
        const seriesData = getSeriesData(slug, locale);
        map.set(slug, {
          url: localizeUrl(getSeriesUrl(slug), locale),
          type: 'series',
          title: seriesData?.title || slug,
        });
      });
    }

    return map;
}

// ─── Backlink Index ──────────────────────────────────────────────────────────

export interface BacklinkSource {
  slug: string;
  title: string;
  type: 'post' | 'note' | 'flow' | 'series';
  url: string;
  context: string;
}

function extractWikilinkContext(text: string, matchStart: number, matchEnd: number): string {
  const RADIUS = 120;
  const start = Math.max(0, matchStart - RADIUS);
  const end = Math.min(text.length, matchEnd + RADIUS);
  let ctx = text.slice(start, end);

  // Replace wikilinks in context with just display text for readability
  ctx = ctx.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, slug, display) => display || slug);

  if (start > 0) ctx = ctx.replace(/^[^\s.!?]{1,30}/, '').trimStart();
  if (end < text.length) ctx = ctx.replace(/[^\s.!?]{1,30}$/, '').trimEnd();

  return ctx.trim().slice(0, 200);
}

function buildBacklinkIndex(locale: string): Map<string, BacklinkSource[]> {
  const index = new Map<string, BacklinkSource[]>();

  const addBacklinks = (
    content: string,
    sourceSlug: string,
    sourceTitle: string,
    sourceType: BacklinkSource['type'],
    sourceUrl: string
  ) => {
    // Create a fresh RegExp per call to avoid lastIndex issues with 'g' flag
    const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
    let match;
    while ((match = WIKILINK.exec(content)) !== null) {
      const targetSlug = match[1].trim();
      if (targetSlug === sourceSlug) continue; // skip self-references
      const context = extractWikilinkContext(content, match.index, match.index + match[0].length);
      let sources = index.get(targetSlug);
      if (!sources) {
        sources = [];
        index.set(targetSlug, sources);
      }
      if (!sources.some(b => b.slug === sourceSlug && b.type === sourceType)) {
        sources.push({ slug: sourceSlug, title: sourceTitle, type: sourceType, url: sourceUrl, context });
      }
    }
  };

  getAllPosts(locale).forEach(p => addBacklinks(p.content, p.slug, p.title, 'post', getPostUrl(p)));
  // A note or flow is only a backlink when its page is built (the `flow` feature).
  if (isFeatureEnabled('flow')) {
    getAllNotes(locale).forEach(n => addBacklinks(n.content, n.slug, n.title, 'note', localizeUrl(getNoteUrl(n.slug), locale)));
    if (locale === DEFAULT_LOCALE) {
      getAllFlows().forEach(f => addBacklinks(f.content, f.slug, f.title, 'flow', getFlowUrl(f.slug)));
    }
  }

  return index;
}

const backlinkIndexMemo = createProdKeyedMemo<string, Map<string, BacklinkSource[]>>();

/** Backlinks are within-locale: who links to this slug from the same tree. */
export function getBacklinks(slug: string, locale: string = DEFAULT_LOCALE): BacklinkSource[] {
  // Prod-only memo: dev rebuilds per call so HMR sees fresh wikilinks.
  return backlinkIndexMemo.get(locale, () => buildBacklinkIndex(locale)).get(slug) ?? [];
}
