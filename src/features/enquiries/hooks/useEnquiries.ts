import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Enquiry } from '../types';

export function useEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        console.error('Error fetching enquiries', error);
      } else {
        setEnquiries(
          (data ?? []).map((r: any) => ({ ...(r.data as any), id: r.id, status: r.status, createdAt: r.created_at } as Enquiry))
        );
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return { enquiries, loading };
}
