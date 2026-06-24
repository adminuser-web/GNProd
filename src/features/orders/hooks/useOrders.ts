import { useState, useEffect } from 'react';
import { orderService } from '../services/orderService';
import { OrderRecord, OrderStatus, OrderPayment } from '../../../types';

export function useAllOrders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = orderService.subscribeToAllOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { orders, loading, error };
}

export function useUserOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const unsubscribe = orderService.subscribeToUserOrders(userId, (fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { orders, loading };
}

export function useOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const unsubscribe = orderService.subscribeToOrder(orderId, (fetchedOrder) => {
      setOrder(fetchedOrder);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  return { order, loading };
}
