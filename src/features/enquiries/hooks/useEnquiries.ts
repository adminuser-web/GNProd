import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Enquiry } from '../types';

export function useEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Enquiry[] = [];
      snapshot.forEach(docSnap => {
        data.push(docSnap.data() as Enquiry);
      });
      setEnquiries(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching enquiries", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { enquiries, loading };
}
