import { Request, Response } from 'express';
import Stripe from 'stripe';
import { AppDataSource } from '../../config/database';
import { Tenant } from '../../entities/Tenant.entity';
import { Usuario } from '../../entities/Usuario.entity';
import { StripeAuditLog } from '../../entities/StripeAuditLog.entity';
import { invalidateBillingStatusCache } from '../../middlewares/billing-guard.middleware';
import { resolvePlanLimits } from '../../saas/plan-limits';
import {
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendSubscriptionActivatedEmail,
} from '../../notifications/email.service';
import { getStripe, planCodeFromStripePriceId } from './stripe';

const tenantRepo   = () => AppDataSource.getRepository(Tenant);
const auditLogRepo = () => AppDataSource.getRepository(StripeAuditLog);

/**
 * POST /api/v1/billing/webhook — debe montarse con **express.raw** antes de express.json.
 */
export async function billingWebhookHandler(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    res.status(503).json({ success: false, message: 'Facturación Stripe no configurada' });
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ success: false, message: 'Falta stripe-signature' });
    return;
  }

  let event: Stripe.Event;
  try {
    const raw = req.body as Buffer;
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'verify failed';
    res.status(400).json({ success: false, message: `Webhook: ${msg}` });
    return;
  }

  try {
    await dispatchStripeEvent(stripe, event);
  } catch (e: unknown) {
    console.error('[billing/webhook]', e);
    res.status(500).json({ success: false, message: 'Error procesando evento' });
    return;
  }

  res.json({ received: true });
}

// ── Contexto acumulado durante el dispatch ────────────────────────────────────

interface DispatchResult {
  tenantId:             number | null;
  stripeCustomerId:     string | null;
  stripeSubscriptionId: string | null;
  planCode:             string | null;
  billingStatus:        string | null;
  /** Tipo de notificación a enviar al tenant. */
  notify: 'activated' | 'canceled' | 'payment_failed' | null;
}

// ── Helpers para resolver tenant ─────────────────────────────────────────────

async function resolveTenantFromSub(sub: Stripe.Subscription): Promise<number> {
  let tid = Number(sub.metadata?.tenantId ?? 0);
  if (!tid) {
    const bySub = await tenantRepo().findOne({
      where: { stripeSubscriptionId: sub.id },
      select: ['id'],
    });
    tid = bySub?.id ?? 0;
  }
  if (!tid) {
    const cid = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (cid) {
      const byCust = await tenantRepo().findOne({
        where: { stripeCustomerId: cid },
        select: ['id'],
      });
      tid = byCust?.id ?? 0;
    }
  }
  return tid;
}

async function getAdminEmailsForTenant(tenantId: number): Promise<string[]> {
  const admins = await AppDataSource.getRepository(Usuario).find({
    where: { tenant: { id: tenantId }, rol: 'admin', activo: true },
    select: ['email'],
  });
  return admins.map((u) => u.email).filter(Boolean);
}

// ── Dispatch de eventos ───────────────────────────────────────────────────────

async function dispatchStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  const ctx: DispatchResult = {
    tenantId: null, stripeCustomerId: null,
    stripeSubscriptionId: null, planCode: null,
    billingStatus: null, notify: null,
  };

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId   = session.subscription;
      const tenantId = Number(session.metadata?.tenantId ?? 0);
      if (!tenantId || typeof subId !== 'string') break;

      const sub    = await stripe.subscriptions.retrieve(subId);
      const priceId = sub.items.data[0]?.price?.id;
      const plan    = planCodeFromStripePriceId(priceId) ?? session.metadata?.planCode ?? 'standard';
      const cust    = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

      await tenantRepo().update(tenantId, {
        ...(cust ? { stripeCustomerId: cust } : {}),
        stripeSubscriptionId: sub.id,
        billingStatus:        sub.status,
        planCode:             plan,
      });

      ctx.tenantId             = tenantId;
      ctx.stripeCustomerId     = cust;
      ctx.stripeSubscriptionId = sub.id;
      ctx.planCode             = plan;
      ctx.billingStatus        = sub.status;
      ctx.notify               = sub.status === 'active' ? 'activated' : null;
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const tid = await resolveTenantFromSub(sub);
      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;

      ctx.stripeCustomerId     = custId ?? null;
      ctx.stripeSubscriptionId = sub.id;

      if (!tid) break;
      ctx.tenantId = tid;

      const existing = await tenantRepo().findOne({
        where: { id: tid },
        select: ['billingStatus', 'planCode'],
      });
      const prevBillingStatus = existing?.billingStatus ?? null;

      const priceId = sub.items.data[0]?.price?.id;
      const plan    = planCodeFromStripePriceId(priceId) ?? sub.metadata?.planCode ?? null;

      await tenantRepo().update(tid, {
        stripeSubscriptionId: sub.id,
        billingStatus:        sub.status,
        ...(plan ? { planCode: plan } : {}),
      });

      ctx.planCode      = plan ?? null;
      ctx.billingStatus = sub.status;

      if (sub.status === 'active') ctx.notify = 'activated';
      /** Dunning por email si Stripe marca mora sin pasar por invoice (o como respaldo). */
      else if (sub.status === 'past_due' && prevBillingStatus !== 'past_due') {
        ctx.notify = 'payment_failed';
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const tid = await resolveTenantFromSub(sub);
      const custId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;

      ctx.stripeCustomerId     = custId ?? null;
      ctx.stripeSubscriptionId = sub.id;

      if (!tid) break;
      ctx.tenantId = tid;

      await tenantRepo().update(tid, {
        stripeSubscriptionId: null,
        billingStatus:        'canceled',
      });

      ctx.billingStatus = 'canceled';
      ctx.notify        = 'canceled';
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const custId  = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id ?? null;

      ctx.stripeCustomerId = custId ?? null;

      if (!custId) break;

      const tenant = await tenantRepo().findOne({
        where: { stripeCustomerId: custId },
        select: ['id', 'billingStatus', 'stripeSubscriptionId'],
      });
      if (!tenant) break;

      ctx.tenantId             = tenant.id;
      ctx.stripeSubscriptionId = tenant.stripeSubscriptionId ?? null;
      ctx.billingStatus        = 'past_due';

      const wasPastDue = tenant.billingStatus === 'past_due';
      if (!wasPastDue) {
        await tenantRepo().update(tenant.id, { billingStatus: 'past_due' });
        ctx.notify = 'payment_failed';
      }
      break;
    }

    default:
      break;
  }

  await saveAuditLog(event, ctx);

  if (ctx.tenantId) {
    await invalidateBillingStatusCache(ctx.tenantId);
    await sendBillingNotification(ctx);
  }
}

// ── Notificaciones email ──────────────────────────────────────────────────────

async function sendBillingNotification(ctx: DispatchResult): Promise<void> {
  if (!ctx.notify || !ctx.tenantId) return;

  try {
    const tenant = await tenantRepo().findOne({
      where: { id: ctx.tenantId },
      select: ['nombre', 'planCode'],
    });
    if (!tenant) return;

    const adminEmails = await getAdminEmailsForTenant(ctx.tenantId);
    const planLabel   = resolvePlanLimits(ctx.planCode ?? tenant.planCode).label;
    const appUrl      = process.env.FRONTEND_URL?.trim() ?? '';
    const portalUrl   = appUrl ? `${appUrl}/configuracion` : undefined;

    const emailCtx = {
      tenantNombre: tenant.nombre,
      adminEmails,
      planLabel,
      portalUrl,
    };

    if (ctx.notify === 'activated')      await sendSubscriptionActivatedEmail(emailCtx);
    if (ctx.notify === 'canceled')       await sendSubscriptionCanceledEmail(emailCtx);
    if (ctx.notify === 'payment_failed') await sendPaymentFailedEmail(emailCtx);
  } catch (e: unknown) {
    console.error('[billing/webhook] Error en notificación email:', e);
  }
}

// ── Auditoría ─────────────────────────────────────────────────────────────────

async function saveAuditLog(event: Stripe.Event, ctx: DispatchResult): Promise<void> {
  try {
    const entry = auditLogRepo().create({
      stripeEventId:        event.id,
      eventType:            event.type,
      tenantId:             ctx.tenantId ?? undefined,
      stripeCustomerId:     ctx.stripeCustomerId ?? undefined,
      stripeSubscriptionId: ctx.stripeSubscriptionId ?? undefined,
      planCode:             ctx.planCode ?? undefined,
      billingStatus:        ctx.billingStatus ?? undefined,
      rawPayload:           JSON.stringify(event),
    });
    await auditLogRepo().save(entry);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate|UQ_stripe/i.test(msg)) {
      console.warn(`[billing/webhook] Evento duplicado ignorado: ${event.id}`);
    } else {
      console.error('[billing/webhook] Error guardando auditoría:', e);
    }
  }
}
