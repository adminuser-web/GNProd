import { useState, useEffect } from 'react';
import { ticketService } from '../services/ticketService';
import { SupportTicket } from '../../../types';

export function useAllTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = ticketService.subscribeToAllTickets((fetchedTickets) => {
      setTickets(fetchedTickets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { tickets, loading };
}

export function useOpenTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = ticketService.subscribeToOpenTickets((fetchedTickets) => {
      setTickets(fetchedTickets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { tickets, loading };
}

export function useUserTickets(userId: string | undefined) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const unsubscribe = ticketService.subscribeToUserTickets(userId, (fetchedTickets) => {
      setTickets(fetchedTickets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { tickets, loading };
}
