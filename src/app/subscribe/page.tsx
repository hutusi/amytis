import { Metadata } from 'next';
import { siteConfig } from '../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import SubscribePage from '@/components/SubscribePage';

export const metadata: Metadata = {
  title: `Subscribe | ${resolveLocale(siteConfig.title)}`,
  description: 'Stay updated with new posts and notes. Subscribe via RSS, email, Telegram, or WeChat.',
};

export default function SubscribeRoute() {
  return (
    <div className="layout-main">
      <SubscribePage />
    </div>
  );
}
