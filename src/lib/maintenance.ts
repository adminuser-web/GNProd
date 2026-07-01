// "Launching Soon" / maintenance-mode bypass helpers.
//
// A shareable link `?preview=<secret>` unlocks the full site in that browser:
// the token is stored in localStorage and compared against the current
// bypassSecret, so rotating the secret in the admin panel revokes old links.

const PREVIEW_KEY = 'gn_preview_bypass';

/**
 * If the URL carries `?preview=<token>`, persist it and strip the param from
 * the address bar. Call once early on app load.
 */
export function capturePreviewFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('preview');
    if (token) {
      localStorage.setItem(PREVIEW_KEY, token);
      url.searchParams.delete('preview');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch {
    /* non-browser / storage disabled — ignore */
  }
}

/** True when the stored preview token matches the current bypass secret. */
export function hasPreviewBypass(secret: string | undefined): boolean {
  if (!secret) return false;
  try {
    return localStorage.getItem(PREVIEW_KEY) === secret;
  } catch {
    return false;
  }
}

/** Build the shareable preview link for a given secret. */
export function previewLink(secret: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?preview=${encodeURIComponent(secret || '')}`;
}
