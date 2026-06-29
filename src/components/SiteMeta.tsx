import { useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { resolveThemedImage } from '../lib/themedImage';

/**
 * Applies brand/SEO content to the document at runtime (SPA): page title,
 * meta description, and favicon. Renders nothing.
 */
export function SiteMeta() {
  const brand = useContent('brand');
  const seo = useContent('seo');

  useEffect(() => {
    // Title
    if (seo?.defaultTitle) {
      document.title = seo.defaultTitle;
    } else if (brand?.brandName) {
      document.title = `${brand.brandName} — ${brand.tagline || 'Handcrafted English Willow'}`;
    }

    // Meta description
    if (seo?.defaultDescription) {
      let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'description');
        document.head.appendChild(m);
      }
      m.setAttribute('content', seo.defaultDescription);
    }

    // Favicon
    const fav = brand?.faviconUrl ? resolveThemedImage(brand.faviconUrl as any, 'light') : '';
    if (fav) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = fav;
    }
  }, [brand?.faviconUrl, brand?.brandName, brand?.tagline, seo?.defaultTitle, seo?.defaultDescription]);

  return null;
}
