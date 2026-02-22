/**
 * Generate public/knowledge-graph.json for the Knowledge Graph visualization.
 *
 * Nodes: all posts, all notes, and flows that appear as wikilink source/target.
 * Edges: wikilink edges (from backlink index) + series membership edges.
 *
 * Run: NODE_ENV=production bun scripts/generate-knowledge-graph.ts
 */

import fs from 'fs';
import path from 'path';
import { getAllPosts, getAllNotes, getAllFlows, getSeriesData } from '../src/lib/markdown';

interface GraphNode {
  id: string;
  title: string;
  type: 'post' | 'note' | 'flow' | 'series';
  url: string;
  connections: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'wikilink' | 'series';
}

function extractWikilinks(content: string): string[] {
  const slugs: string[] = [];
  const re = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    slugs.push(match[1].trim());
  }
  return slugs;
}

async function main() {
  console.log('Generating knowledge graph…');

  const posts = getAllPosts();
  const notes = getAllNotes();
  const flows = getAllFlows();

  // Build id→node map
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Add all posts and notes
  for (const post of posts) {
    nodeMap.set(post.slug, { id: post.slug, title: post.title, type: 'post', url: `/posts/${post.slug}`, connections: 0 });
  }
  for (const note of notes) {
    nodeMap.set(note.slug, { id: note.slug, title: note.title, type: 'note', url: `/notes/${note.slug}`, connections: 0 });
  }

  // Track which flows appear in wikilinks (to avoid including ALL flows)
  const linkedFlowSlugs = new Set<string>();

  // Scan all content for wikilinks
  const allContent: Array<{ slug: string; title: string; type: 'post' | 'note' | 'flow'; content: string; url: string }> = [
    ...posts.map(p => ({ slug: p.slug, title: p.title, type: 'post' as const, content: p.content, url: `/posts/${p.slug}` })),
    ...notes.map(n => ({ slug: n.slug, title: n.title, type: 'note' as const, content: n.content, url: `/notes/${n.slug}` })),
    ...flows.map(f => ({ slug: f.slug, title: f.title, type: 'flow' as const, content: f.content, url: `/flows/${f.slug}` })),
  ];

  // Build wikilink edges
  for (const item of allContent) {
    const targets = extractWikilinks(item.content);
    for (const target of targets) {
      if (target === item.slug) continue; // skip self
      edges.push({ source: item.slug, target, type: 'wikilink' });

      // Ensure source exists in nodeMap
      if (!nodeMap.has(item.slug)) {
        nodeMap.set(item.slug, { id: item.slug, title: item.title, type: item.type, url: item.url, connections: 0 });
        if (item.type === 'flow') linkedFlowSlugs.add(item.slug);
      }
      // Track referenced flows
      const targetFlow = flows.find(f => f.slug === target);
      if (targetFlow) {
        linkedFlowSlugs.add(target);
        if (!nodeMap.has(target)) {
          nodeMap.set(target, { id: target, title: targetFlow.title, type: 'flow', url: `/flows/${target}`, connections: 0 });
        }
      }
    }
  }

  // Add series nodes + series membership edges
  const seriesSlugsSet = new Set<string>();
  for (const post of posts) {
    if (post.series) seriesSlugsSet.add(post.series);
  }

  for (const seriesSlug of seriesSlugsSet) {
    const seriesData = getSeriesData(seriesSlug);
    const seriesId = `series:${seriesSlug}`;
    nodeMap.set(seriesId, {
      id: seriesId,
      title: seriesData?.title || seriesSlug,
      type: 'series',
      url: `/series/${seriesSlug}`,
      connections: 0,
    });
    // Add edges from series to each post
    for (const post of posts) {
      if (post.series === seriesSlug) {
        edges.push({ source: seriesId, target: post.slug, type: 'series' });
      }
    }
  }

  // Compute connection counts
  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    if (src) src.connections++;
    const tgt = nodeMap.get(edge.target);
    if (tgt) tgt.connections++;
  }

  // Filter out nodes with no edges (isolated) to keep graph clean
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  // Always include all notes and posts (they are the knowledge base)
  const nodes = Array.from(nodeMap.values()).filter(n =>
    n.type === 'note' || n.type === 'post' || n.type === 'series' || connectedIds.has(n.id)
  );

  // Filter edges to only include those with both source and target in nodes
  const validIds = new Set(nodes.map(n => n.id));
  const validEdges = edges.filter(e => validIds.has(e.source) && validIds.has(e.target));

  const graphData = { nodes, edges: validEdges };

  const outputPath = path.join(process.cwd(), 'public', 'knowledge-graph.json');
  fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));

  console.log(`✓ Written ${nodes.length} nodes, ${validEdges.length} edges → ${outputPath}`);
}

main().catch(err => {
  console.error('Error generating knowledge graph:', err);
  process.exit(1);
});
