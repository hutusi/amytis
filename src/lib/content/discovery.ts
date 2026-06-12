import fs from 'fs';
import { getPostUrl, getFlowUrl, getNoteUrl, getSeriesUrl } from '../urls';
import { seriesDirectory } from './io';
import { createMemo, createProdMemo } from './cache';
import { getAllPosts } from './posts';
import { getAllFlows } from './flows';
import { getAllNotes } from './notes';
import { getSeriesData } from './series';

/**
 * Cross-content discovery: the tag aggregate, the wikilink slug registry,
 * and the backlink index. Everything here spans posts + flows + notes
 * (+ series), which is why it sits at the top of the content dependency
 * chain rather than inside any single domain module.
 */

const allTagsMemo = createMemo<Record<string, number>>();

export function getAllTags(): Record<string, number> {
  return allTagsMemo.get(() => {
    const allPosts = getAllPosts();
    const allFlows = getAllFlows();
    const allNotes = getAllNotes();

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
    allFlows.forEach((flow) => { addTags(flow.tags); });
    allNotes.forEach((note) => { addTags(note.tags); });

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

const slugRegistryMemo = createProdMemo<Map<string, SlugRegistryEntry>>();

export function buildSlugRegistry(): Map<string, SlugRegistryEntry> {
  // Prod-only memo: dev rebuilds per call so HMR sees fresh wikilink targets.
  return slugRegistryMemo.get(() => {
    const map = new Map<string, SlugRegistryEntry>();

    getAllPosts().forEach(p =>
      map.set(p.slug, { url: getPostUrl(p), type: 'post', title: p.title })
    );

    getAllFlows().forEach(f =>
      map.set(f.slug, { url: getFlowUrl(f.slug), type: 'flow', title: f.title })
    );

    getAllNotes().forEach(n => {
      if (map.has(n.slug)) {
        console.warn(`[slugRegistry] Note slug "${n.slug}" conflicts with an existing entry.`);
      }
      map.set(n.slug, { url: getNoteUrl(n.slug), type: 'note', title: n.title });
      n.aliases.forEach(a => {
        if (map.has(a)) {
          console.warn(`[slugRegistry] Note alias "${a}" (→ ${n.slug}) conflicts with existing slug; skipping.`);
        } else {
          map.set(a, { url: getNoteUrl(n.slug), type: 'note', title: n.title });
        }
      });
    });

    if (fs.existsSync(seriesDirectory)) {
      fs.readdirSync(seriesDirectory, { withFileTypes: true }).forEach(entry => {
        if (!entry.isDirectory()) return;
        const slug = entry.name;
        const seriesData = getSeriesData(slug);
        map.set(slug, {
          url: getSeriesUrl(slug),
          type: 'series',
          title: seriesData?.title || slug,
        });
      });
    }

    return map;
  });
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

function buildBacklinkIndex(): Map<string, BacklinkSource[]> {
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

  getAllPosts().forEach(p => addBacklinks(p.content, p.slug, p.title, 'post', getPostUrl(p)));
  getAllNotes().forEach(n => addBacklinks(n.content, n.slug, n.title, 'note', getNoteUrl(n.slug)));
  getAllFlows().forEach(f => addBacklinks(f.content, f.slug, f.title, 'flow', getFlowUrl(f.slug)));

  return index;
}

const backlinkIndexMemo = createProdMemo<Map<string, BacklinkSource[]>>();

export function getBacklinks(slug: string): BacklinkSource[] {
  // Prod-only memo: dev rebuilds per call so HMR sees fresh wikilinks.
  return backlinkIndexMemo.get(buildBacklinkIndex).get(slug) ?? [];
}
