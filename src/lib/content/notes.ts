import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { byDateDesc } from '../sort';
import { extractContentMetrics } from '../text-metrics';
import type { Heading } from './types';
import { notesDirectory, readUtf8File } from './io';
import { createProdMemo } from './cache';
import { dateField, draftField, tagsField } from './schema';

/**
 * Notes: flat knowledge-base entries in content/notes/. Notes support
 * wikilink aliases and backlinks (resolved by the discovery layer).
 */

const NoteSchema = z.object({
  title: z.string(),
  date: dateField.optional(),
  tags: tagsField,
  draft: draftField,
  aliases: z.array(z.string()).optional().default([]),
  toc: z.boolean().optional().default(true),
  backlinks: z.boolean().optional().default(true),
  commentable: z.boolean().optional(),
});

export interface NoteData {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  draft: boolean;
  aliases: string[];
  toc: boolean;
  backlinks: boolean;
  commentable?: boolean;
  content: string;
  excerpt: string;
  headings: Heading[];
  readingMinutes: number;
  wordCount: number;
}

function parseNoteFile(fullPath: string, slug: string): NoteData {
  const fileContents = readUtf8File(fullPath);
  const { data: rawData, content } = matter(fileContents);

  const parsed = NoteSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid note frontmatter in ${fullPath}:`, parsed.error.format());
    throw new Error(`Invalid note frontmatter in ${fullPath}`);
  }
  const data = parsed.data;

  const { contentWithoutH1, excerpt, headings, readingMinutes, wordCount } = extractContentMetrics(content);
  const date = data.date || fs.statSync(fullPath).mtime.toISOString().split('T')[0];

  return {
    slug,
    title: data.title,
    date,
    tags: data.tags,
    draft: data.draft,
    aliases: data.aliases,
    toc: data.toc,
    backlinks: data.backlinks,
    commentable: data.commentable,
    content: contentWithoutH1,
    excerpt,
    headings,
    readingMinutes,
    wordCount,
  };
}

const allNotesMemo = createProdMemo<NoteData[]>();

export function getAllNotes(): NoteData[] {
  // Prod-only memo: dev re-reads on every call so HMR sees fresh notes.
  return allNotesMemo.get(() => {
    if (!fs.existsSync(notesDirectory)) return [];

    const notes: NoteData[] = [];
    const items = fs.readdirSync(notesDirectory, { withFileTypes: true });

    for (const item of items) {
      if (!item.isFile()) continue;
      if (!item.name.endsWith('.md') && !item.name.endsWith('.mdx')) continue;
      const slug = item.name.replace(/\.mdx?$/, '');
      const fullPath = path.join(notesDirectory, item.name);
      try {
        notes.push(parseNoteFile(fullPath, slug));
      } catch (e) {
        console.error(`Error parsing note ${fullPath}:`, e);
      }
    }

    return notes
      .filter(note => process.env.NODE_ENV !== 'production' || !note.draft)
      .sort(byDateDesc);
  });
}

export function getNoteBySlug(slug: string): NoteData | null {
  if (!fs.existsSync(notesDirectory)) return null;

  const mdxPath = path.join(notesDirectory, `${slug}.mdx`);
  const mdPath = path.join(notesDirectory, `${slug}.md`);

  let fullPath = '';
  if (fs.existsSync(mdxPath)) fullPath = mdxPath;
  else if (fs.existsSync(mdPath)) fullPath = mdPath;
  else return null;

  try {
    const note = parseNoteFile(fullPath, slug);
    if (process.env.NODE_ENV === 'production' && note.draft) return null;
    return note;
  } catch {
    return null;
  }
}

export function getAdjacentNotes(slug: string): { prev: NoteData | null; next: NoteData | null } {
  const allNotes = getAllNotes(); // sorted newest-first
  const index = allNotes.findIndex(n => n.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index < allNotes.length - 1 ? allNotes[index + 1] : null, // older
    next: index > 0 ? allNotes[index - 1] : null, // newer
  };
}

export function getRecentNotes(limit: number = 5): NoteData[] {
  return getAllNotes().slice(0, limit);
}

export function getNoteTags(): Record<string, number> {
  const tags: Record<string, number> = {};
  getAllNotes().forEach(note => {
    note.tags.forEach(tag => {
      const normalized = tag.toLowerCase();
      tags[normalized] = (tags[normalized] || 0) + 1;
    });
  });
  return tags;
}

export function getNotesByTag(tag: string): NoteData[] {
  return getAllNotes().filter(n =>
    n.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}
