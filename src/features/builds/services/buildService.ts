import { supabase } from '../../../lib/supabase';
import { SavedBuild } from '../types';

// builds rows: { id, user_id, name, snapshot (full SavedBuild), created_at }.
export const buildService = {
  async saveBuild(buildInfo: Omit<SavedBuild, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const info: any = buildInfo;
    const { data, error } = await supabase
      .from('builds')
      .insert({ user_id: info.userId, name: info.name ?? null, snapshot: buildInfo })
      .select('id')
      .single();
    if (error) throw error;
    return data!.id;
  },

  async getUserBuilds(userId: string): Promise<SavedBuild[]> {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('builds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ ...(r.snapshot as any), id: r.id, createdAt: r.created_at } as SavedBuild));
  },

  async deleteBuild(id: string): Promise<void> {
    const { error } = await supabase.from('builds').delete().eq('id', id);
    if (error) throw error;
  },
};
