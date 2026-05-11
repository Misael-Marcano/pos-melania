import Stripe from 'stripe';

function secretKey(): string | null {
  const k = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
  if (!k || k.toLowerCase() === 'sk_test_xxx' || k.toLowerCase() === 'sk_live_xxx') return null;
  return k;
}

let client: Stripe | null = null;

/** Cliente Stripe singleton; null si no hay clave válida o BILLING_PROVIDER=none. */
export function getStripe(): Stripe | null {
  if (process.env.BILLING_PROVIDER === 'none') return null;
  const key = secretKey();
  if (!key) return null;
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

/** Mapeo Price ID → planCode (variables STRIPE_PRICE_* en .env). */
export function planCodeFromStripePriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  const pairs: [string | undefined, string][] = [
    [process.env.STRIPE_PRICE_STARTER, 'starter'],
    [process.env.STRIPE_PRICE_STANDARD, 'standard'],
    [process.env.STRIPE_PRICE_ENTERPRISE, 'enterprise'],
  ];
  for (const [pid, code] of pairs) {
    if (pid && pid === priceId) return code;
  }
  return null;
}

export function stripePriceIdForPlan(planCode: string): string | null {
  const map: Record<string, string | undefined> = {
    starter:    process.env.STRIPE_PRICE_STARTER,
    standard:   process.env.STRIPE_PRICE_STANDARD,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  };
  const k = (planCode ?? 'standard').toLowerCase();
  return map[k]?.trim() || null;
}
