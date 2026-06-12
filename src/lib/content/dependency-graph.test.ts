import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';

// The content layer's dependency direction is load-bearing:
//
//   types → io/cache → series-metadata → parse → posts → series → …
//
// ESM cycles do not fail loudly — they surface as `undefined` bindings at
// module init. This test builds the import graph of src/lib/content/ and
// fails on any cycle, so a reintroduced parse↔series-metadata loop (the
// cycle this layout was designed to break) is caught by `bun test`.

const contentDir = path.join(process.cwd(), 'src', 'lib', 'content');

function localImports(file: string): string[] {
  const source = fs.readFileSync(/* turbopackIgnore: true */ path.join(contentDir, file), 'utf8');
  const imports: string[] = [];
  for (const match of source.matchAll(/from\s+['"]\.\/([\w-]+)['"]/g)) {
    imports.push(`${match[1]}.ts`);
  }
  return imports;
}

describe('content/ dependency graph', () => {
  test('has no import cycles', () => {
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    const graph = new Map(files.map(f => [f, localImports(f)]));

    const visiting = new Set<string>();
    const done = new Set<string>();
    const cycles: string[] = [];

    function visit(file: string, trail: string[]) {
      if (done.has(file)) return;
      if (visiting.has(file)) {
        cycles.push([...trail, file].join(' → '));
        return;
      }
      visiting.add(file);
      for (const dep of graph.get(file) ?? []) {
        visit(dep, [...trail, file]);
      }
      visiting.delete(file);
      done.add(file);
    }

    for (const file of files) visit(file, []);
    expect(cycles).toEqual([]);
  });

  test('series-metadata does not import parse (the cycle this layout breaks)', () => {
    expect(localImports('series-metadata.ts')).not.toContain('parse.ts');
  });
});
