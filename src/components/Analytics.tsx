'use client';

import Script from 'next/script';
import { siteConfig } from '../../site.config';

export default function Analytics() {
  const { provider, umami, plausible, google } = siteConfig.analytics;

  if (provider === 'umami' && umami.websiteId) {
    return (
      <Script
        src={umami.src}
        data-website-id={umami.websiteId}
        strategy="afterInteractive"
      />
    );
  }

  if (provider === 'plausible' && plausible.domain) {
    return (
      <Script
        src={plausible.src}
        data-domain={plausible.domain}
        strategy="afterInteractive"
      />
    );
  }
  
  if (provider === 'google' && google.measurementId) {
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${google.measurementId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${google.measurementId}');
          `}
        </Script>
      </>
    );
  }

  return null;
}
