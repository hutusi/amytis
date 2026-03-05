'use client';

import Script from 'next/script';
import { siteConfig } from '../../site.config';

export default function Analytics() {
  const { providers, umami, plausible, google } = siteConfig.analytics;

  if (!providers || providers.length === 0) return null;

  return (
    <>
      {providers.includes('umami') && umami.websiteId && (
        <Script
          src={umami.src}
          data-website-id={umami.websiteId}
          strategy="afterInteractive"
        />
      )}

      {providers.includes('plausible') && plausible.domain && (
        <Script
          src={plausible.src}
          data-domain={plausible.domain}
          strategy="afterInteractive"
        />
      )}

      {providers.includes('google') && google.measurementId && (
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
      )}
    </>
  );
}
