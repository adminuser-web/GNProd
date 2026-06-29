import { supabase } from '../../../lib/supabase';
import { SiteContentMap, DEFAULT_SITE_CONTENT } from '../../../types';
import { auditService } from '../../audit/services/auditService';

export interface ContentRevision {
  id: string;
  area: keyof SiteContentMap;
  data: any;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: any;
}

export const contentService = {
  async getArea<K extends keyof SiteContentMap>(area: K): Promise<SiteContentMap[K] | null> {
    const { data, error } = await supabase
      .from('content')
      .select('data')
      .eq('area', area as string)
      .maybeSingle();
    if (error) throw error;
    return data ? (data.data as SiteContentMap[K]) : null;
  },

  async getAllAreas(): Promise<Partial<SiteContentMap>> {
    const { data, error } = await supabase.from('content').select('area, data');
    if (error) throw error;
    const content: Partial<SiteContentMap> = {};
    (data ?? []).forEach((row: any) => {
      content[row.area as keyof SiteContentMap] = row.data;
    });
    return content;
  },

  async updateArea<K extends keyof SiteContentMap>(
    area: K,
    data: Partial<SiteContentMap[K]>,
    opts?: { audit?: boolean }
  ) {
    const { data: { user } } = await supabase.auth.getUser();

    // `data` is the full area object from the editor; the jsonb column holds it wholesale.
    const { error } = await supabase.from('content').upsert({
      area: area as string,
      data,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    // Snapshot a revision of the saved state so changes can be rolled back later.
    // Best-effort: a snapshot failure must never break the primary save.
    try {
      await supabase.from('content_revisions').insert({
        area: area as string,
        data,
        actor_user_id: user?.id ?? null,
        actor_name: (user?.user_metadata?.full_name as string) ?? user?.email ?? 'Unknown',
      });
    } catch (e) {
      console.error('contentService: revision snapshot failed', e);
    }

    // Audit every real admin save (skip programmatic ones via opts.audit === false).
    if (opts?.audit !== false) {
      await auditService.writeAudit({
        action: 'settings_updated',
        entityType: 'content',
        entityId: area as string,
        after: { fields: Object.keys(data || {}) },
      });
    }
  },

  /** Newest-first revision snapshots for a content area (for history + rollback). */
  async getRevisions(area: keyof SiteContentMap, max = 25): Promise<ContentRevision[]> {
    const { data, error } = await supabase
      .from('content_revisions')
      .select('*')
      .eq('area', area as string)
      .order('created_at', { ascending: false })
      .limit(max);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      area: r.area,
      data: r.data,
      actorUserId: r.actor_user_id,
      actorName: r.actor_name,
      createdAt: r.created_at,
    }));
  },

  /** Seed default content for any area that doesn't exist yet (admin-only via RLS). */
  async seedContentIfMissing() {
    for (const [area, defaultData] of Object.entries(DEFAULT_SITE_CONTENT)) {
      const { data } = await supabase
        .from('content')
        .select('area')
        .eq('area', area)
        .maybeSingle();
      if (!data) {
        await supabase.from('content').insert({ area, data: defaultData });
      }
    }
  },
};
