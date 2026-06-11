import { Metadata } from 'next';
import { isFeatureEnabled } from '@/lib/features';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import { siteConfig } from '../../../site.config';
import FlowHubTabs from '@/components/FlowHubTabs';
import KnowledgeGraph from '@/components/KnowledgeGraph';

export const metadata: Metadata = {
  title: `${t('tab_graph')} | ${resolveLocale(siteConfig.title)}`,
  description: t('graph_subtitle'),
};

export default function GraphPage() {
  if (!isFeatureEnabled('flow')) notFound();
  return (
    <div className="layout-main">
      <FlowHubTabs subtitle={t('graph_subtitle')} />
      <KnowledgeGraph />
    </div>
  );
}
