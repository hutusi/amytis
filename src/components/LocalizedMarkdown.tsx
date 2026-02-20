'use client';

import { useLanguage } from './LanguageProvider';
import MarkdownRenderer from './MarkdownRenderer';

interface LocalizedMarkdownProps {
  content: string;
  contentLocales?: Record<string, { content: string; title?: string; excerpt?: string }>;
  latex?: boolean;
  slug?: string;
}

/**
 * Renders markdown content in the current UI language.
 * Falls back to the default `content` when no locale variant is available.
 */
export default function LocalizedMarkdown({ content, contentLocales, latex, slug }: LocalizedMarkdownProps) {
  const { language } = useLanguage();
  const body = contentLocales?.[language]?.content ?? content;
  return <MarkdownRenderer content={body} latex={latex} slug={slug} />;
}
