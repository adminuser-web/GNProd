// Loads the Razorpay Checkout script on demand. Resolves the global Razorpay
// constructor, or null if it can't load (offline / blocked).
let loading: Promise<any> | null = null;

export function loadRazorpay(): Promise<any> {
  if ((window as any).Razorpay) return Promise.resolve((window as any).Razorpay);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve((window as any).Razorpay ?? null);
    s.onerror = () => { loading = null; resolve(null); };
    document.body.appendChild(s);
  });
  return loading;
}
