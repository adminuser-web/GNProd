import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useContent, useContentContext } from '../context/ContentContext';
import { useAuth } from '../context/AuthContext';
import { capturePreviewFromUrl, hasPreviewBypass } from '../lib/maintenance';
import { ComingSoon } from './ComingSoon';

/**
 * When maintenance ("Launching Soon") mode is on, public visitors see the
 * splash. Admin routes and /login stay open so the owner can always sign in
 * and toggle it off; signed-in admins and anyone with a valid ?preview=<secret>
 * link bypass the splash and see the full site.
 *
 * We wait for content + auth to settle before deciding so the real site never
 * flashes to the public and the splash never flashes to admins.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { capturePreviewFromUrl(); setReady(true); }, []);

  const m = useContent('maintenance');
  const { loading: contentLoading } = useContentContext();
  const { isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();

  const path = location.pathname;
  const alwaysAllowed = path.startsWith('/admin') || path === '/login';

  if (!ready || contentLoading || authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#c5a059]/20 border-t-[#c5a059] animate-spin" />
      </div>
    );
  }

  const enabled = m?.enabled === true;
  const bypassed = isAdmin || hasPreviewBypass(m?.bypassSecret);

  if (enabled && !alwaysAllowed && !bypassed) {
    return <ComingSoon />;
  }

  return <>{children}</>;
}
