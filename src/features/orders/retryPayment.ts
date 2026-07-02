import { supabase } from '../../lib/supabase';
import { loadRazorpay } from '../../lib/razorpayClient';

export type RetryPaymentStatus = 'paid' | 'pending' | 'dismissed' | 'failed';

export interface RetryPaymentResult {
  status: RetryPaymentStatus;
  message?: string;
}

/**
 * Re-open Razorpay Checkout for an existing "Awaiting Payment" order.
 * The edge function verifies ownership and returns the (reused or fresh)
 * Razorpay order for the server-fixed amount; on success the payment is
 * verified exactly like a first-time checkout.
 */
export async function retryOrderPayment(orderId: string): Promise<RetryPaymentResult> {
  const Razorpay = await loadRazorpay();
  if (!Razorpay) {
    return { status: 'failed', message: "Couldn't load the secure payment window. Check your connection and retry." };
  }

  const { data, error } = await supabase.functions.invoke('razorpay-retry-payment', { body: { orderId } });
  if (error || !(data as any)?.ok) {
    const code = (data as any)?.error;
    if (code === 'already_paid') return { status: 'paid', message: 'This order is already paid — it may take a moment to update.' };
    if (code === 'not_payable') return { status: 'failed', message: 'This order can no longer be paid.' };
    return { status: 'failed', message: 'Could not restart payment. Please try again.' };
  }

  const { razorpayOrderId, amount, currency, keyId, prefill } = data as any;

  return new Promise<RetryPaymentResult>((resolve) => {
    let failMessage: string | null = null;
    const rzp = new Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount,
      currency,
      name: 'Grainood',
      description: `Handcrafted English Willow — Order ${orderId}`,
      prefill: { name: prefill?.name, email: prefill?.email, contact: prefill?.contact },
      notes: { orderId },
      theme: { color: '#c5a059' },
      handler: async (resp: any) => {
        const { data: v, error: ve } = await supabase.functions.invoke('razorpay-verify', {
          body: {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          },
        });
        // Payment captured but verify hiccuped — the webhook reconciles.
        if (ve || !(v as any)?.ok) resolve({ status: 'pending' });
        else resolve({ status: 'paid' });
      },
      // Razorpay keeps the modal open after a failed attempt so the customer
      // can retry — only settle when the modal actually closes.
      modal: { ondismiss: () => resolve(failMessage ? { status: 'failed', message: failMessage } : { status: 'dismissed' }) },
    });
    rzp.on('payment.failed', (r: any) => {
      failMessage = r?.error?.description || 'Payment failed. Please try again.';
    });
    rzp.open();
  });
}
