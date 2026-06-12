import { Metadata } from 'next';
import { isFeatureEnabled } from '@/lib/features';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import { siteConfig } from '../../../site.config';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import PageHeader from '@/components/PageHeader';

export const metadata: Metadata = {
  title: `${t('graph')} | ${resolveLocale(siteConfig.title)}`,
  description: t('graph_subtitle'),
};

export default function GraphPage() {
  if (!isFeatureEnabled('flow')) notFound();
  return (
    <div className="layout-main">
      <PageHeader titleKey="graph" subtitleKey="graph_subtitle" className="mb-12" />
      <KnowledgeGraph />
    </div>
  );
}
