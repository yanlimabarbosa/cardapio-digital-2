'use client';

import { useEffect, useMemo, useRef } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useMarketingSettings } from '@/hooks/marketing/use-marketing-settings';
import { trackMetaPixel } from '@/lib/meta-pixel';

const PRIVATE_PATH_PREFIXES = ['/admin', '/kitchen', '/receipt'];

export function MarketingPixels() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);
  const { data: settings } = useMarketingSettings();

  const enabledPixelIds = useMemo(
    () => (settings?.metaPixelEnabled ? settings.metaPixelIds.filter((id) => /^\d{5,32}$/.test(id)) : []),
    [settings],
  );
  const shouldLoad = enabledPixelIds.length > 0 && !isPrivatePath(pathname);

  useEffect(() => {
    if (!shouldLoad) return;
    if (lastTrackedPathRef.current === pathname) return;
    if (lastTrackedPathRef.current === null) {
      lastTrackedPathRef.current = pathname;
      return;
    }
    trackMetaPixel('PageView');
    lastTrackedPathRef.current = pathname;
  }, [pathname, shouldLoad]);

  if (!shouldLoad) {
    return null;
  }

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        ${enabledPixelIds.map((id) => `fbq('init', '${id}');`).join('\n')}
        fbq('track', 'PageView');
      `}
    </Script>
  );
}

function isPrivatePath(pathname: string | null): boolean {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
}
