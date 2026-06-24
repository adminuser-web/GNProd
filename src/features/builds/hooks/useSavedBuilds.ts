import { useState, useEffect } from 'react';
import { buildService } from '../services/buildService';
import { SavedBuild } from '../types';

export function useSavedBuilds(userId?: string) {
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchBuilds() {
      if (!userId) {
        if (mounted) {
          setBuilds([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const data = await buildService.getUserBuilds(userId);
        if (mounted) {
           // Sort by createdAt descending
           data.sort((a, b) => {
              const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt).getTime() || 0);
              const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt).getTime() || 0);
              return tB - tA;
           });
           setBuilds(data);
           setError(null);
        }
      } catch (err: any) {
        console.error('Error fetching saved builds:', err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchBuilds();
    return () => { mounted = false; };
  }, [userId]);

  return { builds, loading, error, setBuilds };
}
