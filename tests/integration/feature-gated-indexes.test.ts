import { describe, expect, mock, test } from 'bun:test';
import { buildKnowledgeGraph } from '../../scripts/generate-knowledge-graph';
import { GET as searchIndex } from '../../src/app/search.json/route';

// The knowledge graph and search.json list content with links to its pages,
// so a disabled feature's content (whose pages aren't built) must stay out.

async function withFeaturesOff<T>(off: string[], run: () => Promise<T>): Promise<T> {
  const features = await import('@/lib/features');
  const realFeatures = { ...features };
  mock.module('@/lib/features', () => ({
    ...realFeatures,
    isFeatureEnabled: (feature: string) => !off.includes(feature) && realFeatures.isFeatureEnabled(feature as never),
  }));
  try {
    return await run();
  } finally {
    mock.module('@/lib/features', () => realFeatures);
  }
}

const graphTypes = () => new Set(buildKnowledgeGraph().nodes.map(n => n.type));
const searchCategories = async () => {
  const entries = (await (await searchIndex()).json()) as { category: string }[];
  return new Set(entries.map(e => e.category));
};

describe('feature-gated indexes', () => {
  test('with every feature on, the graph has notes and series and the search index has books, flows and notes', async () => {
    const types = graphTypes();
    expect(types.has('note')).toBe(true);
    expect(types.has('series')).toBe(true);
    const categories = await searchCategories();
    for (const category of ['Book', 'Flow', 'Note']) expect(categories.has(category)).toBe(true);
  });

  test('the knowledge graph leaves out notes, flows and series when their features are off', async () => {
    const types = await withFeaturesOff(['flow', 'series'], async () => graphTypes());
    expect([...types]).toEqual(['post']);
  });

  test('search.json leaves out books, flows and notes when their features are off', async () => {
    const categories = await withFeaturesOff(['books', 'flow'], searchCategories);
    for (const category of ['Book', 'Flow', 'Note']) expect(categories.has(category)).toBe(false);
    expect(categories.size).toBeGreaterThan(0);
  });
});
