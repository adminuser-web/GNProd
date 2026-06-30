import { supabase } from '../../../lib/supabase';

export type OrderEmailTemplate = 'payment_request' | 'payment_received';

/**
 * Invoke the admin-only `send-order-email` edge function. The client sends ONLY
 * the order id, the template, and the (optional) admin-pasted payment link —
 * never the customer's email or any PII. The user's JWT is attached automatically
 * by supabase-js; the function verifies admin + renders/sends server-side.
 */
export async function sendOrderEmail(
  orderId: string,
  template: OrderEmailTemplate,
  paymentLink?: string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-order-email', {
    body: { orderId, template, ...(paymentLink ? { paymentLink } : {}) },
  });
  if (error) throw new Error('send_failed');
  if (!data?.ok) throw new Error(data?.error || 'send_failed');
}
