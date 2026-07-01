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

    // Favicon. Safari is finicky: it caches favicons hard and often ignores an
    // href mutation on the existing <link> (especially the index.html one that
    // declares type="image/svg+xml"). So REMOVE every existing icon link and
    // add fresh <link rel="icon"> + <link rel="apple-touch-icon"> elements with
    // the correct MIME type — Safari is far more likely to pick up new nodes.
    const fav = brand?.faviconUrl ? resolveThemedImage(brand.faviconUrl as any, 'light') : '';
    if (fav) {
      const ext = fav.split('?')[0].split('.').pop()?.toLowerCase();
      const typeByExt: Record<string, string> = {
        svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon',
        jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
      };
      const type = ext ? typeByExt[ext] : undefined;

      document
        .querySelectorAll("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
        .forEach((n) => n.parentElement?.removeChild(n));

      const addIcon = (rel: string) => {
        const l = document.createElement('link');
        l.rel = rel;
        if (type) l.type = type;
        l.href = fav;
        document.head.appendChild(l);
      };
      addIcon('icon');
      addIcon('apple-touch-icon');
    }
  }, [brand?.faviconUrl, brand?.brandName, brand?.tagline, seo?.defaultTitle, seo?.defaultDescription]);

  return null;
}
