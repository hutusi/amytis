import { getAllTags } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import TagsIndexClient from '@/components/TagsIndexClient';

export const metadata: Metadata = {
  title: `${t('tags')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Explore topics in the garden.',
};

export default function TagsPage() {
  const tags = getAllTags();
  const totalTags = Object.keys(tags).length;

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="tags"
        subtitleKey="tags_subtitle"
        subtitleOneKey="tags_subtitle_one"
        count={totalTags}
        subtitleParams={{ count: totalTags }}
      />

      <main>
        <TagsIndexClient tags={tags} />
      </main>
    </div>
  );
}
