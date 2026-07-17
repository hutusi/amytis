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
import { getSeriesData } from '../src/lib/content/series';
import { getAllPosts } from '../src/lib/content/posts';
import { getAllNotes } from '../src/lib/content/notes';
import { getAllFlows } from '../src/lib/content/flows';
import { getPostUrl } from '../src/lib/urls';

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

  // Nodes are keyed by canonical URL, not bare slug: posts carry the URL from
  // getPostUrl (series prefixes, custom basePath), and duplicate slugs across
  // series stay distinct nodes instead of overwriting each other.
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Docs carry their unique node id (the canonical URL) up front, so the wikilink
  // scan and node creation agree on identity.
  const postDocs = posts.map(p => ({ slug: p.slug, title: p.title, type: 'post' as const, content: p.content, url: getPostUrl(p) }));
  const noteDocs = notes.map(n => ({ slug: n.slug, aliases: n.aliases ?? [], title: n.title, type: 'note' as const, content: n.content, url: `/notes/${n.slug}` }));
  const flowDocs = flows.map(f => ({ slug: f.slug, title: f.title, type: 'flow' as const, content: f.content, url: `/flows/${f.slug}` }));

  // Wikilink targets are bare slugs; map each to a node id. Duplicate post slugs
  // are legal, so last-wins here matches the app's wikilink registry.
  const slugToId = new Map<string, string>();
  const flowDocById = new Map(flowDocs.map(d => [d.url, d] as const));

  for (const doc of postDocs) {
    nodeMap.set(doc.url, { id: doc.url, title: doc.title, type: 'post', url: doc.url, connections: 0 });
    slugToId.set(doc.slug, doc.url);
  }
  for (const doc of noteDocs) {
    nodeMap.set(doc.url, { id: doc.url, title: doc.title, type: 'note', url: doc.url, connections: 0 });
    slugToId.set(doc.slug, doc.url);
    for (const alias of doc.aliases) slugToId.set(alias, doc.url);
  }
  for (const doc of flowDocs) {
    slugToId.set(doc.slug, doc.url); // flow nodes are added only when linked (below)
  }

  const allContent = [...postDocs, ...noteDocs, ...flowDocs];

  // Build wikilink edges (deduplicate per source document)
  for (const item of allContent) {
    const targets = extractWikilinks(item.content);
    const seenTargets = new Set<string>();
    for (const rawTarget of targets) {
      if (rawTarget === item.slug) continue; // skip self by slug
      if (seenTargets.has(rawTarget)) continue; // skip duplicate within this doc
      seenTargets.add(rawTarget);

      const targetId = slugToId.get(rawTarget);
      if (!targetId || targetId === item.url) continue; // unresolved, or self via alias/url
      edges.push({ source: item.url, target: targetId, type: 'wikilink' });

      // Ensure source exists in nodeMap (flows are absent until they participate)
      if (!nodeMap.has(item.url)) {
        nodeMap.set(item.url, { id: item.url, title: item.title, type: item.type, url: item.url, connections: 0 });
      }
      // Add a node for a referenced flow the first time it's linked
      if (!nodeMap.has(targetId) && flowDocById.has(targetId)) {
        const flowDoc = flowDocById.get(targetId)!;
        nodeMap.set(targetId, { id: targetId, title: flowDoc.title, type: 'flow', url: flowDoc.url, connections: 0 });
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
    // Add edges from series to each post (target by canonical-URL node id)
    for (const post of posts) {
      if (post.series === seriesSlug) {
        edges.push({ source: seriesId, target: getPostUrl(post), type: 'series' });
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

  // Recompute connection counts from validEdges only (pre-filter counts were inflated)
  const connectionCounts = new Map<string, number>();
  for (const edge of validEdges) {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) ?? 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    node.connections = connectionCounts.get(node.id) ?? 0;
  }

  const graphData = { nodes, edges: validEdges };

  const outputPath = path.join(process.cwd(), 'public', 'knowledge-graph.json');
  fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));

  console.log(`✓ Written ${nodes.length} nodes, ${validEdges.length} edges → ${outputPath}`);
}

main().catch(err => {
  console.error('Error generating knowledge graph:', err);
  process.exit(1);
});
