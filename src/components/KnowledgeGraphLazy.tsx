'use client';

import dynamic from 'next/dynamic';

/**
 * Client-side-only loader for the knowledge graph. KnowledgeGraph statically
 * imports d3 (~250 KB); next/dynamic with ssr:false keeps that out of the
 * /graph route's initial chunk so the page shell paints first, and skips
 * server-rendering a component whose SVG is built entirely in effects anyway.
 * The placeholder mirrors the component's own loading state.
 */
const KnowledgeGraph = dynamic(() => import('./KnowledgeGraph'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64" aria-hidden="true" />,
});

export default KnowledgeGraph;
