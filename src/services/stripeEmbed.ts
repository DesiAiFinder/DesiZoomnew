// Embedded Stripe Checkout: keeps payment on-site in a modal overlay
// instead of redirecting to checkout.stripe.com.
// Card data still goes straight to Stripe (iframe) — never touches our code.
import { env } from '../config/env';

interface EmbeddedCheckout { mount: (el: HTMLElement) => void; destroy: () => void; }
interface StripeJs {
  initEmbeddedCheckout: (opts: { clientSecret: string; onComplete?: () => void }) => Promise<EmbeddedCheckout>;
}
declare global { interface Window { Stripe?: (pk: string) => StripeJs } }

let stripePromise: Promise<StripeJs | null> | null = null;

function loadStripe(): Promise<StripeJs | null> {
  if (!env.stripePublishableKey) return Promise.resolve(null);
  if (window.Stripe) return Promise.resolve(window.Stripe(env.stripePublishableKey));
  if (!stripePromise) {
    stripePromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.async = true;
      s.onload = () => resolve(window.Stripe ? window.Stripe!(env.stripePublishableKey) : null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
  return stripePromise;
}

/** Can we do embedded checkout? (publishable key set + stripe.js loadable) */
export async function embedAvailable(): Promise<boolean> {
  return !!(await loadStripe());
}

/**
 * Opens the embedded checkout in a full-screen overlay.
 * Resolves true if the overlay opened; false if it couldn't (caller should
 * fall back to the redirect URL). onComplete fires after successful payment.
 */
export async function openEmbeddedCheckout(clientSecret: string, onComplete: () => void): Promise<boolean> {
  const stripe = await loadStripe();
  if (!stripe) return false;

  // Overlay skeleton
  const backdrop = document.createElement('div');
  backdrop.style.cssText =
    'position:fixed;inset:0;background:rgba(20,8,2,0.6);z-index:1000;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:24px 12px;';
  const panel = document.createElement('div');
  panel.style.cssText =
    'background:white;border-radius:16px;width:100%;max-width:480px;position:relative;padding:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close checkout');
  closeBtn.style.cssText =
    'position:absolute;top:10px;right:12px;z-index:2;font-size:16px;background:#f3f4f6;border:none;border-radius:50%;width:30px;height:30px;cursor:pointer;color:#374151;';
  const mountEl = document.createElement('div');
  mountEl.style.cssText = 'min-height:400px;margin-top:28px;';
  panel.appendChild(closeBtn);
  panel.appendChild(mountEl);
  backdrop.appendChild(panel);

  let checkout: EmbeddedCheckout | null = null;
  const close = () => {
    try { checkout?.destroy(); } catch { /* already gone */ }
    backdrop.remove();
  };
  closeBtn.onclick = close;

  try {
    checkout = await stripe.initEmbeddedCheckout({
      clientSecret,
      onComplete: () => { close(); onComplete(); },
    });
  } catch {
    return false;
  }

  document.body.appendChild(backdrop);
  checkout.mount(mountEl);
  return true;
}

/**
 * One-call helper for all payment flows.
 * Tries embedded checkout first; falls back to the hosted redirect URL.
 */
export async function startCheckout(
  data: { url?: string; client_secret?: string } | null | undefined,
  successUrl: string
): Promise<void> {
  if (data?.client_secret) {
    const ok = await openEmbeddedCheckout(data.client_secret, () => { window.location.href = successUrl; });
    if (ok) return;
  }
  if (data?.url) { window.location.href = data.url; return; }
  throw new Error('Could not start checkout. Please try again.');
}
