import fs from 'node:fs';
import { describe, expect, test } from 'bun:test';

/**
 * Interactive and navigational chrome that must not print: each carries
 * `print:hidden` on its root (the navbar, footer and reading progress bar are
 * hidden by their data hooks in the print stylesheet instead). A new piece of
 * page chrome belongs on this list. AuthorCard is not chrome: with
 * `showInHeader: false` it is the only place a printed post names its author.
 */
const PRINT_HIDDEN = [
  'src/components/PostSidebar.tsx',
  'src/components/BookSidebar.tsx',
  'src/components/NoteSidebar.tsx',
  'src/components/FlowCalendarSidebar.tsx',
  'src/components/MobileToc.tsx',
  'src/components/ShareBar.tsx',
  'src/components/Comments.tsx',
  'src/components/PostNavigation.tsx',
  'src/components/PrevNextNav.tsx',
  'src/components/RelatedPosts.tsx',
  'src/components/Backlinks.tsx',
  'src/components/ExternalLinks.tsx',
  'src/components/CodeBlockToolbar.tsx',
  'src/components/ImmersiveToggleButton.tsx',
  'src/components/ImmersiveReaderTopBar.tsx',
  'src/components/BrowserDetectionBanner.tsx',
  'src/components/ExternalLinkIcon.tsx',
  'src/components/BackToTop.tsx',
  'src/components/ImageZoom.tsx',
  'src/components/Breadcrumbs.tsx',
];

describe('print hides page chrome', () => {
  test.each(PRINT_HIDDEN)('%s', (file) => {
    expect(fs.readFileSync(file, 'utf8')).toContain('print:hidden');
  });

  test('two-column layouts collapse to one column on paper', () => {
    // A4 landscape is wide enough for lg:, which would reserve the hidden
    // sidebar's 280px column.
    for (const file of ['src/layouts/PostLayout.tsx', 'src/layouts/SimpleLayout.tsx', 'src/components/BookReadingShell.tsx', 'src/components/page-bodies/NoteDetailBody.tsx']) {
      expect(fs.readFileSync(file, 'utf8')).toMatch(/lg:grid-cols-\[280px_minmax\(0,1fr\)\][^'"`]*print:block/);
    }
  });

  test('the immersive reader flows onto pages instead of printing one screen', () => {
    const reader = fs.readFileSync('src/components/ImmersiveReader.tsx', 'utf8');
    expect(reader).toContain('print:static print:block');
    expect(reader).toContain('print:overflow-visible');
  });
});
