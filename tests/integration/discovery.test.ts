import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { getAllTags, buildSlugRegistry, getBacklinks } from '../../src/lib/content/discovery';
import { getAllPosts } from '../../src/lib/content/posts';
import { getAllNotes } from '../../src/lib/content/notes';
import { getAllFlows } from '../../src/lib/content/flows';
import { getPostUrl } from '../../src/lib/urls';

describe('Integration: discovery (slug registry, backlinks, tags)', () => {
  describe('buildSlugRegistry', () => {
    test('registers every post under its slug with a canonical post URL', () => {
      // The registry is keyed by BARE slug. Two posts in different series can
      // share one (e.g. "second-post" in rst-toctree and rst-toctree-precedence);
      // last write wins. So the entry for a post slug must be the canonical URL
      // of SOME post carrying that slug — not necessarily this one.
      const registry = buildSlugRegistry();
      const allPosts = getAllPosts();
      for (const post of allPosts) {
        const entry = registry.get(post.slug);
        expect(entry).toBeDefined();
        expect(['post', 'note', 'flow', 'series']).toContain(entry!.type);
        if (entry!.type === 'post') {
          const candidateUrls = allPosts
            .filter(p => p.slug === post.slug)
            .map(p => getPostUrl(p));
          expect(candidateUrls).toContain(entry!.url);
        }
      }
    });

    test('registers notes and their aliases pointing at the note URL', () => {
      const registry = buildSlugRegistry();
      for (const note of getAllNotes()) {
        const entry = registry.get(note.slug);
        expect(entry).toBeDefined();
        for (const alias of note.aliases) {
          const aliasEntry = registry.get(alias);
          expect(aliasEntry).toBeDefined();
          // Alias resolves to SOME entry; when the alias is unclaimed it
          // points at this note's URL.
          if (aliasEntry!.type === 'note' && aliasEntry!.url === `/notes/${note.slug}`) {
            expect(aliasEntry!.title).toBe(note.title);
          }
        }
      }
    });

    test('registers flows under their date slug', () => {
      const registry = buildSlugRegistry();
      for (const flow of getAllFlows()) {
        const entry = registry.get(flow.slug);
        expect(entry).toBeDefined();
        expect(entry!.url).toBe(`/flows/${flow.slug}`);
        expect(entry!.type).toBe('flow');
      }
    });

    test('series folders register with type series', () => {
      const registry = buildSlugRegistry();
      const seriesEntries = [...registry.values()].filter(e => e.type === 'series');
      expect(seriesEntries.length).toBeGreaterThan(0);
      for (const entry of seriesEntries) {
        expect(entry.url).toMatch(/^\/series\//);
        expect(entry.title.length).toBeGreaterThan(0);
      }
    });

    test('throws on a slug/alias collision instead of silently overwriting', () => {
      // Strict-build invariant: wikilink targets must be unambiguous. Two notes
      // where one's alias equals the other's slug is a collision and must throw
      // regardless of filesystem read order (slug-vs-alias collide either way).
      const notesDir = path.join(process.cwd(), 'content', 'notes');
      fs.mkdirSync(notesDir, { recursive: true });
      const noteA = path.join(notesDir, '__test-confl-a__.md');
      const noteB = path.join(notesDir, '__test-confl-b__.md');
      fs.writeFileSync(noteA, ['---', 'title: Conflict A', '---', '', 'A', ''].join('\n'), 'utf8');
      fs.writeFileSync(
        noteB,
        ['---', 'title: Conflict B', 'aliases: ["__test-confl-a__"]', '---', '', 'B', ''].join('\n'),
        'utf8',
      );

      try {
        expect(() => buildSlugRegistry()).toThrow(/collides/);
      } finally {
        fs.rmSync(noteA, { force: true });
        fs.rmSync(noteB, { force: true });
      }
    });
  });

  describe('getBacklinks', () => {
    test('every backlink source really contains a wikilink to the target', () => {
      const registry = buildSlugRegistry();
      const contentBySlug = new Map<string, string>();
      getAllPosts().forEach(p => contentBySlug.set(`post:${p.slug}`, p.content));
      getAllNotes().forEach(n => contentBySlug.set(`note:${n.slug}`, n.content));
      getAllFlows().forEach(f => contentBySlug.set(`flow:${f.slug}`, f.content));

      let checked = 0;
      for (const slug of registry.keys()) {
        for (const source of getBacklinks(slug)) {
          const sourceContent = contentBySlug.get(`${source.type}:${source.slug}`);
          expect(sourceContent).toBeDefined();
          expect(sourceContent!).toContain(`[[${slug}`);
          expect(source.context.length).toBeGreaterThan(0);
          expect(source.context.length).toBeLessThanOrEqual(200);
          checked++;
        }
      }
      // The repo content includes wikilinks (notes feature) — if this drops
      // to zero the index is silently broken, not "clean".
      expect(checked).toBeGreaterThan(0);
    });

    test('a document never backlinks itself', () => {
      for (const note of getAllNotes()) {
        const sources = getBacklinks(note.slug);
        expect(sources.some(s => s.slug === note.slug && s.type === 'note')).toBe(false);
      }
    });

    test('unknown slugs return an empty list', () => {
      expect(getBacklinks('definitely-not-a-real-slug-xyz')).toEqual([]);
    });
  });

  describe('getAllTags', () => {
    test('deduplicates tag casing — no two keys differ only by case', () => {
      const tags = Object.keys(getAllTags());
      const lowered = tags.map(t => t.toLowerCase());
      expect(new Set(lowered).size).toBe(lowered.length);
    });

    test('counts cover posts, flows, and notes', () => {
      const tags = getAllTags();
      const lower = new Set(Object.keys(tags).map(t => t.toLowerCase()));
      const sampleSources = [
        getAllPosts().flatMap(p => p.tags),
        getAllFlows().flatMap(f => f.tags),
        getAllNotes().flatMap(n => n.tags),
      ];
      for (const sourceTags of sampleSources) {
        for (const tag of sourceTags) {
          expect(lower.has(tag.toLowerCase())).toBe(true);
        }
      }
    });
  });
});
