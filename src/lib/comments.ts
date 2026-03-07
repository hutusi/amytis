import { siteConfig } from '../../site.config';

type CommentableCategory = 'posts' | 'flows' | 'notes' | 'bookChapters' | 'staticPages';

const CATEGORY_DEFAULTS: Record<CommentableCategory, boolean> = {
  posts: true,
  flows: true,
  notes: true,
  bookChapters: true,
  staticPages: false,
};

/**
 * Resolves whether comments should be shown for a given page.
 * Priority: frontmatter `commentable` > site config category default > built-in default.
 */
export function resolveCommentable(
  frontmatter: boolean | undefined,
  category: CommentableCategory,
): boolean {
  if (frontmatter !== undefined) return frontmatter;
  const config = siteConfig.comments.commentable;
  if (config?.[category] !== undefined) return config[category];
  return CATEGORY_DEFAULTS[category];
}
