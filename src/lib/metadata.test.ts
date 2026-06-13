import { describe, expect, test } from 'bun:test';
import { createListingMetadata } from './metadata';
import { t, tWith, resolveLocale } from './i18n';
import { siteConfig } from '../../site.config';

const SITE = resolveLocale(siteConfig.title);

describe('createListingMetadata', () => {
  test('index title is "Section | Site" with no page segment', () => {
    const meta = createListingMetadata({ titleKey: 'posts' });
    expect(meta.title).toBe(`${t('posts')} | ${SITE}`);
  });

  test('paginated title uses the page_of_total form', () => {
    const meta = createListingMetadata({ titleKey: 'notes', page: 2, totalPages: 5 });
    expect(meta.title).toBe(`${t('notes')} - ${tWith('page_of_total', { page: 2, total: 5 })} | ${SITE}`);
  });

  test('descriptionKey resolves with count', () => {
    const meta = createListingMetadata({ titleKey: 'posts', descriptionKey: 'posts_subtitle', count: 7 });
    expect(meta.description).toBe(tWith('posts_subtitle', { count: 7 }));
  });

  test('descriptionOneKey is used when count === 1', () => {
    const meta = createListingMetadata({
      titleKey: 'books',
      descriptionKey: 'books_subtitle',
      descriptionOneKey: 'books_subtitle_one',
      count: 1,
    });
    expect(meta.description).toBe(t('books_subtitle_one'));
  });

  test('a literal description wins over the key form and omits when absent', () => {
    expect(createListingMetadata({ titleKey: 'notes', description: 'Knowledge base notes.' }).description).toBe(
      'Knowledge base notes.',
    );
    expect(createListingMetadata({ titleKey: 'notes', page: 2, totalPages: 3 }).description).toBeUndefined();
  });

  test('throws when page and totalPages are not both set', () => {
    expect(() => createListingMetadata({ titleKey: 'posts', page: 2 })).toThrow(/both be set or both be unset/);
    expect(() => createListingMetadata({ titleKey: 'posts', totalPages: 5 })).toThrow(/both be set or both be unset/);
  });

  test('allows an out-of-range sentinel page (page > totalPages) without throwing', () => {
    // paginationStaticParams emits page: 2 even for single-page listings; the
    // route component notFound()s it, so metadata must not crash the build.
    expect(() => createListingMetadata({ titleKey: 'flow', page: 2, totalPages: 1 })).not.toThrow();
  });

  test('throws when descriptionKey is set without count', () => {
    expect(() => createListingMetadata({ titleKey: 'posts', descriptionKey: 'posts_subtitle' })).toThrow(
      /count is required/,
    );
  });
});
