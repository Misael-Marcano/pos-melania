import { Not, IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant.entity';
import { Usuario } from '../entities/Usuario.entity';
import { trialStateFromEndsAt, TrialState } from './trial';
import { sendTrialReminderEmail } from '../notifications/email.service';
import { resolvePlanLimits } from './plan-limits';

function hasPaidStripeSubscription(billingStatus: string | null | undefined): boolean {
  return billingStatus === 'active' || billingStatus === 'trialing';
}

/**
 * Reglas de envío (idempotente con flags en `tenants`).
 * - Semana: 2–7 días restantes (primer aviso “te queda poco tiempo”).
 * - Último día: 0–1 días restantes.
 */
export function trialReminderBuckets(
  state: TrialState,
  weekSent: boolean,
  lastDaySent: boolean,
): { sendWeek: boolean; sendLastDay: boolean } {
  if (!state.active || state.daysRemaining == null) {
    return { sendWeek: false, sendLastDay: false };
  }
  const dr = state.daysRemaining;
  const sendWeek = !weekSent && dr >= 2 && dr <= 7;
  const sendLastDay = !lastDaySent && dr >= 0 && dr <= 1;
  return { sendWeek, sendLastDay };
}

export interface TrialReminderJobResult {
  tenantsScanned: number;
  weekEmailsSent: number;
  lastDayEmailsSent: number;
  skippedNoSmtp: boolean;
}

async function getAdminEmailsForTenant(tenantId: number): Promise<string[]> {
  const admins = await AppDataSource.getRepository(Usuario).find({
    where: { tenant: { id: tenantId }, rol: 'admin', activo: true },
    select: ['email'],
  });
  return admins.map((u) => u.email).filter(Boolean);
}

/**
 * Envía recordatorios de trial a administradores. Idempotente vía columnas en `tenants`.
 * Requiere `NOTIFICATIONS_EMAIL_ENABLED=true` y SMTP; si no, no actualiza flags y devuelve `skippedNoSmtp`.
 */
export async function runTrialReminderJob(): Promise<TrialReminderJobResult> {
  const skippedNoSmtp = process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true';
  if (skippedNoSmtp) {
    return {
      tenantsScanned: 0,
      weekEmailsSent: 0,
      lastDayEmailsSent: 0,
      skippedNoSmtp: true,
    };
  }

  const repo = AppDataSource.getRepository(Tenant);
  const rows = await repo.find({
    where: { trialEndsAt: Not(IsNull()) },
  });

  const now = Date.now();
  let weekEmailsSent = 0;
  let lastDayEmailsSent = 0;

  for (const tenant of rows) {
    if (!tenant.trialEndsAt || new Date(tenant.trialEndsAt).getTime() <= now) continue;
    if (hasPaidStripeSubscription(tenant.billingStatus)) continue;

    const state = trialStateFromEndsAt(tenant.trialEndsAt);
    const { sendWeek, sendLastDay } = trialReminderBuckets(
      state,
      tenant.trialReminderWeekSent,
      tenant.trialReminderLastDaySent,
    );

    if (!sendWeek && !sendLastDay) continue;

    const adminEmails = await getAdminEmailsForTenant(tenant.id);
    const planLabel = resolvePlanLimits(tenant.planCode).label;
    const appUrl = process.env.FRONTEND_URL?.trim() ?? '';
    const portalUrl = appUrl ? `${appUrl}/configuracion` : undefined;

    if (sendWeek && state.daysRemaining != null) {
      const ok = await sendTrialReminderEmail({
        tenantNombre: tenant.nombre,
        adminEmails,
        planLabel,
        portalUrl,
        daysRemaining: state.daysRemaining,
        variant: 'week',
      });
      if (ok) {
        await repo.update(tenant.id, { trialReminderWeekSent: true });
        weekEmailsSent += 1;
      }
    }

    if (sendLastDay && state.daysRemaining != null) {
      const ok = await sendTrialReminderEmail({
        tenantNombre: tenant.nombre,
        adminEmails,
        planLabel,
        portalUrl,
        daysRemaining: state.daysRemaining,
        variant: 'lastDay',
      });
      if (ok) {
        await repo.update(tenant.id, { trialReminderLastDaySent: true });
        lastDayEmailsSent += 1;
      }
    }
  }

  return {
    tenantsScanned: rows.length,
    weekEmailsSent,
    lastDayEmailsSent,
    skippedNoSmtp: false,
  };
}
