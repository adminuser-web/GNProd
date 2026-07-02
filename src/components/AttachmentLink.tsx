import React, { useEffect, useState } from 'react';
import { getSignedUrl, SUPPORT_ATTACHMENTS_BUCKET } from '../lib/storage';

/**
 * Renders a link to a support-ticket attachment, resolving the URL safely:
 *  - New attachments live in the PRIVATE `support-attachments` bucket and store
 *    `{ path, bucket }` — we mint a short-lived signed URL (owner/admin only).
 *  - Legacy attachments stored a public `url` — used as-is for back-compat.
 * The inner markup is supplied via a render function so each call site keeps its
 * own thumbnail/overlay styling.
 */
export function AttachmentLink({
  att,
  className,
  children,
}: {
  att: any;
  className?: string;
  children: (url: string | null) => React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(att?.path ? null : att?.url ?? null);

  useEffect(() => {
    let active = true;
    if (att?.path) {
      getSignedUrl(att.bucket || SUPPORT_ATTACHMENTS_BUCKET, att.path)
        .then((u) => { if (active) setUrl(u); })
        .catch(() => { if (active) setUrl(null); });
    } else {
      setUrl(att?.url ?? null);
    }
    return () => { active = false; };
  }, [att?.path, att?.bucket, att?.url]);

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-disabled={!url}
      onClick={(e) => { if (!url) e.preventDefault(); }}
    >
      {children(url)}
    </a>
  );
}
