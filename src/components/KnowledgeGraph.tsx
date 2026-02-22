'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as d3 from 'd3';

// Reactive mobile detection via useSyncExternalStore (avoids setState-in-effect lint rule)
function subscribeToResize(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}
function getIsMobile() { return window.innerWidth < 768; }
function getServerIsMobile() { return false; }

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: 'post' | 'note' | 'flow' | 'series';
  url: string;
  connections: number;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'wikilink' | 'series';
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NODE_COLORS: Record<string, string> = {
  note: 'var(--accent)',
  post: '#2563eb',
  flow: '#f59e0b',
  series: '#10b981',
};

const TYPE_FILTERS = ['note', 'post', 'flow', 'series'] as const;

function nodeRadius(connections: number): number {
  return Math.max(5, Math.min(20, 5 + connections * 1.5));
}

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(TYPE_FILTERS));
  const isMobile = useSyncExternalStore(subscribeToResize, getIsMobile, getServerIsMobile);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/knowledge-graph.json')
      .then(res => {
        if (!res.ok) throw new Error('Graph data not found. Run `bun run build:graph` to generate it.');
        return res.json();
      })
      .then((data: GraphData) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!graphData || !svgRef.current || isMobile) return;

    const svg = svgRef.current;
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;

    // Clear previous content
    d3.select(svg).selectAll('*').remove();

    // Deep-copy nodes so simulation can modify them
    const filteredNodes: GraphNode[] = graphData.nodes
      .filter(n => activeTypes.has(n.type))
      .map(n => ({ ...n }));

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges: GraphEdge[] = graphData.edges
      .filter(e => {
        const src = typeof e.source === 'string' ? e.source : e.source.id;
        const tgt = typeof e.target === 'string' ? e.target : e.target.id;
        return filteredNodeIds.has(src) && filteredNodeIds.has(tgt);
      })
      .map(e => ({ ...e }));

    const svgEl = d3.select(svg);

    // Tooltip
    const tooltip = d3.select('body')
      .append('div')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('background', 'var(--background)')
      .style('border', '1px solid color-mix(in srgb, var(--muted) 20%, transparent)')
      .style('border-radius', '6px')
      .style('padding', '6px 10px')
      .style('font-size', '12px')
      .style('color', 'var(--foreground)')
      .style('opacity', '0')
      .style('z-index', '100')
      .style('max-width', '200px')
      .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)');

    // Container group for zoom/pan
    const g = svgEl.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svgEl.call(zoom);

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(filteredNodes)
      .force('link',
        d3.forceLink<GraphNode, GraphEdge>(filteredEdges)
          .id(d => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody<GraphNode>().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide<GraphNode>().radius(d => nodeRadius(d.connections) + 2));

    // Edges
    const link = g.append('g')
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(filteredEdges)
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1);

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(filteredNodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (_, d) => {
        window.location.href = d.url;
      })
      .on('mouseenter', (event: MouseEvent, d) => {
        tooltip
          .style('opacity', '1')
          .html(`<strong>${d.title}</strong><br/><span style="opacity:0.6">${d.type} &middot; ${d.connections} links</span>`);
      })
      .on('mousemove', (event: MouseEvent) => {
        tooltip
          .style('left', `${event.clientX + 12}px`)
          .style('top', `${event.clientY - 20}px`);
      })
      .on('mouseleave', () => {
        tooltip.style('opacity', '0');
      });

    node.append('circle')
      .attr('r', d => nodeRadius(d.connections))
      .attr('fill', d => NODE_COLORS[d.type] || '#888')
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#fff')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1.5);

    // Labels for well-connected nodes
    node.filter(d => d.connections >= 3)
      .append('text')
      .text(d => d.title.length > 20 ? d.title.slice(0, 18) + '…' : d.title)
      .attr('x', d => nodeRadius(d.connections) + 4)
      .attr('y', 4)
      .attr('font-size', '10px')
      .attr('fill', 'currentColor')
      .attr('opacity', 0.7)
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0);

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [graphData, activeTypes, isMobile]);

  function toggleType(type: string) {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Loading graph…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-muted/20 bg-muted/5 p-8 text-center text-sm text-muted">
        <p className="mb-2">{error}</p>
        <code className="text-xs bg-muted/10 px-1.5 py-0.5 rounded">bun run build:graph</code>
      </div>
    );
  }

  // Mobile: render searchable list
  if (isMobile && graphData) {
    const filtered = graphData.nodes
      .filter(n => activeTypes.has(n.type))
      .filter(n => !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search nodes…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-muted/20 rounded-lg bg-transparent outline-none focus:border-accent"
        />
        <div className="space-y-1">
          {filtered.map(n => (
            <a
              key={n.id}
              href={n.url}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/5 no-underline text-sm text-foreground"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: NODE_COLORS[n.type] }}
              />
              <span className="flex-1 truncate">{n.title}</span>
              <span className="text-xs text-muted">{n.type}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter strip */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPE_FILTERS.map(type => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors ${
              activeTypes.has(type)
                ? 'border-current text-foreground'
                : 'border-muted/20 text-muted'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[type] }} />
            {type}
          </button>
        ))}
        {graphData && (
          <span className="text-xs text-muted ml-auto">
            {graphData.nodes.filter(n => activeTypes.has(n.type)).length} nodes
          </span>
        )}
      </div>

      {/* Graph SVG */}
      <svg
        ref={svgRef}
        className="w-full rounded-lg border border-muted/20 bg-muted/5"
        style={{ height: '600px' }}
      />
    </div>
  );
}
