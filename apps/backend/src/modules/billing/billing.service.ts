import { AppDataSource } from '../../config/database';
import { Tenant } from '../../entities/Tenant.entity';
import { AppError } from '../../middlewares/error.middleware';
import { AuthUser } from '@pos/shared';
import { tenantIdOrThrow } from '../../utils/tenant-access';
import { PLAN_LIMITS } from '../../saas/plan-limits';
import { getStripe, stripePriceIdForPlan } from './stripe';

const tenantRepo = () => AppDataSource.getRepository(Tenant);

export type BillingProviderId = 'stripe' | 'none';

export interface BillingPublicStatus {
  provider: BillingProviderId;
  configured: boolean;
  webhookConfigured: boolean;
  /** true si hay al menos un STRIPE_PRICE_* definido. */
  pricesConfigured: boolean;
  hint: string;
  /** Datos de la org actual (JWT), si aplica. */
  tenant?: {
    id:               number;
    planCode:         string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    billingStatus:    string | null;
  };
}

function isPlaceholderStripeKey(key: string): boolean {
  const k = key.trim();
  if (!k) return true;
  const lower = k.toLowerCase();
  return lower === 'sk_test_xxx' || lower === 'sk_live_xxx' || lower === 'placeholder';
}

function pricesConfigured(): boolean {
  return Boolean(
    stripePriceIdForPlan('starter') ||
      stripePriceIdForPlan('standard') ||
      stripePriceIdForPlan('enterprise'),
  );
}

export class BillingService {
  /** Estado público para admin/soporte (sin secretos). */
  async getPublicStatus(user: AuthUser): Promise<BillingPublicStatus> {
    const provider: BillingProviderId =
      process.env.BILLING_PROVIDER === 'none' ? 'none' : 'stripe';

    if (provider === 'none') {
      return {
        provider:           'none',
        configured:         true,
        webhookConfigured:  false,
        pricesConfigured:   false,
        hint:               'BILLING_PROVIDER=none: facturación externa desactivada en esta instancia.',
      };
    }

    const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? '';
    const configured = secret.length > 0 && !isPlaceholderStripeKey(secret);
    const wh = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
    const pc = pricesConfigured();

    let hint: string;
    if (!configured) {
      hint =
        'Defina STRIPE_SECRET_KEY. Opcional: STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER|STANDARD|ENTERPRISE para checkout.';
    } else if (!wh) {
      hint =
        'Clave Stripe OK. Defina STRIPE_WEBHOOK_SECRET y registre POST /api/v1/billing/webhook en el dashboard de Stripe.';
    } else if (!pc) {
      hint =
        'Webhook listo. Defina precios (STRIPE_PRICE_*) en .env para habilitar POST /billing/create-checkout-session.';
    } else {
      hint =
        'Stripe operativo: checkout y webhooks pueden actualizar plan y estado de la organización.';
    }

    const base: BillingPublicStatus = {
      provider,
      configured,
      webhookConfigured: wh,
      pricesConfigured: pc,
      hint,
    };

    const tid = user.tenantId != null && user.tenantId > 0 ? Number(user.tenantId) : null;
    if (tid != null) {
      const t = await tenantRepo().findOne({
        where: { id: tid },
        select: [
          'id',
          'planCode',
          'stripeCustomerId',
          'stripeSubscriptionId',
          'billingStatus',
        ],
      });
      if (t) {
        base.tenant = {
          id:                   t.id,
          planCode:             t.planCode,
          stripeCustomerId:     t.stripeCustomerId ?? null,
          stripeSubscriptionId: t.stripeSubscriptionId ?? null,
          billingStatus:        t.billingStatus ?? null,
        };
      }
    }

    return base;
  }

  /**
   * Crea sesión Checkout (modo subscription). Requiere Price IDs en .env y JWT con organización.
   */
  async createCheckoutSession(
    user: AuthUser,
    input: { successUrl: string; cancelUrl: string; planCode?: string },
  ): Promise<{ url: string | null }> {
    if (process.env.BILLING_PROVIDER === 'none') {
      throw new AppError('Facturación desactivada (BILLING_PROVIDER=none)', 400);
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new AppError('STRIPE_SECRET_KEY no configurada', 503);
    }

    const tid = tenantIdOrThrow(user);
    const planKey = (input.planCode ?? 'standard').toLowerCase();
    if (!PLAN_LIMITS[planKey]) {
      throw new AppError(`planCode inválido: ${planKey}`, 400);
    }

    const priceId = stripePriceIdForPlan(planKey);
    if (!priceId) {
      throw new AppError(
        `No hay STRIPE_PRICE_${planKey.toUpperCase()} en el entorno. Cree el precio en Stripe y añada el ID.`,
        400,
      );
    }

    const tenant = await tenantRepo().findOne({ where: { id: tid } });
    if (!tenant) throw new AppError('Organización no encontrada', 404);

    let customerId = tenant.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name:     tenant.nombre,
        metadata: { tenantId: String(tid) },
      });
      customerId = customer.id;
      tenant.stripeCustomerId = customerId;
      await tenantRepo().save(tenant);
    }

    const session = await stripe.checkout.sessions.create({
      mode:       'subscription',
      customer:   customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url:  input.cancelUrl,
      metadata: {
        tenantId: String(tid),
        planCode: planKey,
      },
      subscription_data: {
        metadata: {
          tenantId: String(tid),
          planCode: planKey,
        },
      },
    });

    return { url: session.url };
  }

  /**
   * Portal de cliente Stripe (cambiar tarjeta, cancelar suscripción, etc.).
   * Requiere que la organización ya tenga `stripeCustomerId` (p. ej. tras un Checkout).
   */
  async createPortalSession(
    user: AuthUser,
    returnUrl: string,
  ): Promise<{ url: string | null }> {
    if (process.env.BILLING_PROVIDER === 'none') {
      throw new AppError('Facturación desactivada (BILLING_PROVIDER=none)', 400);
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new AppError('STRIPE_SECRET_KEY no configurada', 503);
    }

    const tid = tenantIdOrThrow(user);
    const tenant = await tenantRepo().findOne({
      where: { id: tid },
      select: ['id', 'stripeCustomerId'],
    });
    if (!tenant?.stripeCustomerId?.trim()) {
      throw new AppError(
        'No hay cuenta de facturación en Stripe para esta organización. Cree una suscripción con Checkout primero.',
        400,
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }
}
