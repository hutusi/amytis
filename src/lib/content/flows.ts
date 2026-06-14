import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { siteConfig } from '../../../site.config';
import { byDateDesc } from '../sort';
import { extractContentMetrics } from '../text-metrics';
import type { Heading } from './types';
import { flowsDirectory, readUtf8File } from './io';
import { dateField, draftField, tagsField } from './schema';

/**
 * Flows: daily notes stored as content/flows/YYYY/MM/DD.{md,mdx}
 * (or DD/index.{md,mdx}). The slug IS the date path.
 */

const FlowSchema = z.object({
  title: z.string().optional(),
  date: dateField.optional(),
  tags: tagsField,
  draft: draftField,
  commentable: z.boolean().optional(),
});

export interface FlowData {
  slug: string;
  date: string;
  title: string;
  tags: string[];
  draft: boolean;
  commentable?: boolean;
  content: string;
  excerpt: string;
  headings: Heading[];
}

/** Visibility policy shared by getAllFlows and getFlowBySlug: hide drafts in
 *  production and future-dated entries while showFuturePosts is off — direct
 *  slug access must not bypass what listings hide. */
function isFlowVisible(flow: FlowData): boolean {
  if (process.env.NODE_ENV === 'production' && flow.draft) return false;
  if (!siteConfig.posts?.showFuturePosts) {
    if (new Date(flow.date) > new Date()) return false;
  }
  return true;
}

function parseFlowFile(fullPath: string, slug: string): FlowData {
  const fileContents = readUtf8File(fullPath);
  const { data: rawData, content } = matter(fileContents);

  const parsed = FlowSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid flow frontmatter in ${fullPath}:`, parsed.error.format());
    throw new Error(`Invalid flow frontmatter in ${fullPath}`);
  }
  const data = parsed.data;

  const h1Match = content.match(/^\s*#\s+(.+)/);
  const { contentWithoutH1, excerpt, headings } = extractContentMetrics(content, { withCounts: false });
  const date = data.date || slug.replace(/\//g, '-'); // slug is YYYY/MM/DD, convert to YYYY-MM-DD

  return {
    slug,
    date,
    title: data.title?.trim() || h1Match?.[1]?.trim() || date, // frontmatter(non-empty) → H1 → date
    tags: data.tags,
    draft: data.draft,
    commentable: data.commentable,
    content: contentWithoutH1,
    excerpt,
    headings,
  };
}

export function getAllFlows(): FlowData[] {
  if (!fs.existsSync(flowsDirectory)) return [];

  const flows: FlowData[] = [];

  // Walk content/flows/YYYY/MM/ structure
  const yearDirs = fs.readdirSync(flowsDirectory, { withFileTypes: true });
  for (const yearEntry of yearDirs) {
    if (!yearEntry.isDirectory() || !/^\d{4}$/.test(yearEntry.name)) continue;
    const yearPath = path.join(flowsDirectory, yearEntry.name);

    const monthDirs = fs.readdirSync(yearPath, { withFileTypes: true });
    for (const monthEntry of monthDirs) {
      if (!monthEntry.isDirectory() || !/^\d{2}$/.test(monthEntry.name)) continue;
      const monthPath = path.join(yearPath, monthEntry.name);

      const dayItems = fs.readdirSync(monthPath, { withFileTypes: true });
      for (const dayItem of dayItems) {
        const rawName = dayItem.name.replace(/\.mdx?$/, '');
        if (!/^\d{2}$/.test(rawName)) continue;

        const year = yearEntry.name;
        const month = monthEntry.name;
        const day = rawName;
        const slug = `${year}/${month}/${day}`;
        let fullPath = '';

        if (dayItem.isFile() && (dayItem.name.endsWith('.md') || dayItem.name.endsWith('.mdx'))) {
          fullPath = path.join(monthPath, dayItem.name);
        } else if (dayItem.isDirectory()) {
          const indexMdx = path.join(monthPath, dayItem.name, 'index.mdx');
          const indexMd = path.join(monthPath, dayItem.name, 'index.md');
          if (fs.existsSync(indexMdx)) fullPath = indexMdx;
          else if (fs.existsSync(indexMd)) fullPath = indexMd;
          else continue;
        } else {
          continue;
        }

        flows.push(parseFlowFile(fullPath, slug));
      }
    }
  }

  return flows.filter(isFlowVisible).sort(byDateDesc);
}

function visibleOrNull(flow: FlowData): FlowData | null {
  return isFlowVisible(flow) ? flow : null;
}

export function getFlowBySlug(slug: string): FlowData | null {
  if (!fs.existsSync(flowsDirectory)) return null;

  // slug format: "YYYY/MM/DD"
  const parts = slug.split('/');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;

  const basePath = path.join(flowsDirectory, year, month);
  if (!fs.existsSync(basePath)) return null;

  // Try flat file
  const mdxPath = path.join(basePath, `${day}.mdx`);
  const mdPath = path.join(basePath, `${day}.md`);
  if (fs.existsSync(mdxPath)) return visibleOrNull(parseFlowFile(mdxPath, slug));
  if (fs.existsSync(mdPath)) return visibleOrNull(parseFlowFile(mdPath, slug));

  // Try folder
  const indexMdx = path.join(basePath, day, 'index.mdx');
  const indexMd = path.join(basePath, day, 'index.md');
  if (fs.existsSync(indexMdx)) return visibleOrNull(parseFlowFile(indexMdx, slug));
  if (fs.existsSync(indexMd)) return visibleOrNull(parseFlowFile(indexMd, slug));

  return null;
}

export function getFlowsByYear(year: string): FlowData[] {
  return getAllFlows().filter(f => f.slug.startsWith(`${year}/`));
}

export function getFlowsByMonth(year: string, month: string): FlowData[] {
  return getAllFlows().filter(f => f.slug.startsWith(`${year}/${month}/`));
}

export function getFlowsByTag(tag: string): FlowData[] {
  return getAllFlows().filter(f =>
    f.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export function getAdjacentFlows(slug: string): { prev: FlowData | null; next: FlowData | null } {
  const allFlows = getAllFlows(); // sorted newest-first
  const index = allFlows.findIndex(f => f.slug === slug);
  if (index === -1) return { prev: null, next: null };

  return {
    prev: index < allFlows.length - 1 ? allFlows[index + 1] : null, // older
    next: index > 0 ? allFlows[index - 1] : null, // newer
  };
}

export function getRecentFlows(limit: number = 5): FlowData[] {
  return getAllFlows().slice(0, limit);
}

export function getFlowTags(): Record<string, number> {
  const allFlows = getAllFlows();
  const tags: Record<string, number> = {};
  allFlows.forEach((flow) => {
    flow.tags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      tags[normalizedTag] = (tags[normalizedTag] || 0) + 1;
    });
  });
  return tags;
}
