/**
 * Servicio de notificaciones por email (opt-in).
 *
 * Activar con `NOTIFICATIONS_EMAIL_ENABLED=true` en `.env`.
 * Soporta cualquier proveedor SMTP (Gmail, SendGrid, Resend, Mailgun, etc.).
 *
 * Variables requeridas cuando está habilitado:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
import nodemailer, { Transporter } from 'nodemailer';

// ── Singleton del transporter ─────────────────────────────────────────────────

let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true') return null;

  if (!_transporter) {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!host || !user || !pass) {
      console.warn(
        '[email] NOTIFICATIONS_EMAIL_ENABLED=true pero faltan SMTP_HOST / SMTP_USER / SMTP_PASS.',
      );
      return null;
    }

    _transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return _transporter;
}

function from(): string {
  return process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@pos.app';
}

// ── Función de envío genérica ─────────────────────────────────────────────────

async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const t = getTransporter();
  if (!t) return; // silencioso si no está habilitado

  const recipients = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
  try {
    await t.sendMail({
      from: from(),
      to: recipients,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
  } catch (e: unknown) {
    // No relanzar — una falla de email no debe tumbar el flujo de negocio
    console.error('[email] Error al enviar:', e instanceof Error ? e.message : e);
  }
}

// ── Templates de facturación ──────────────────────────────────────────────────

export interface BillingEmailContext {
  /** Nombre de la organización. */
  tenantNombre: string;
  /** Emails de los administradores del tenant. */
  adminEmails: string[];
  /** Plan actual. */
  planLabel?: string;
  /** URL al portal de facturación para que el tenant actúe. */
  portalUrl?: string;
}

/**
 * Aviso de pago fallido / suscripción en mora.
 * Se envía ante `invoice.payment_failed` o cuando `billingStatus` pasa a `past_due`.
 */
export async function sendPaymentFailedEmail(ctx: BillingEmailContext): Promise<void> {
  if (!ctx.adminEmails.length) return;
  const action = ctx.portalUrl
    ? `<p style="margin:16px 0"><a href="${ctx.portalUrl}" style="background:#e53e3e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Actualizar método de pago</a></p>`
    : `<p>Ve a <strong>Configuración → Plan</strong> para actualizar tu suscripción.</p>`;

  await send({
    to: ctx.adminEmails,
    subject: `⚠️ Pago fallido — ${ctx.tenantNombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#c53030">Pago no procesado</h2>
        <p>Hola,</p>
        <p>No pudimos procesar el pago de la suscripción <strong>${ctx.planLabel ?? ''}</strong> para <strong>${ctx.tenantNombre}</strong>.</p>
        <p>Tu cuenta permanece activa por el momento, pero si el pago no se resuelve en los próximos días el acceso podría suspenderse.</p>
        ${action}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#888;font-size:12px">Este mensaje es automático. Si ya actualizaste tu método de pago, ignóralo.</p>
      </div>`,
    text: `Pago no procesado para ${ctx.tenantNombre}.\n\nNo pudimos cobrar la suscripción ${ctx.planLabel ?? ''}. Actualiza tu método de pago antes de que se suspenda el acceso.\n\n${ctx.portalUrl ? `Portal: ${ctx.portalUrl}` : 'Ve a Configuración → Plan.'}`,
  });
}

/**
 * Aviso de suscripción cancelada.
 * Se envía ante `customer.subscription.deleted`.
 */
export async function sendSubscriptionCanceledEmail(ctx: BillingEmailContext): Promise<void> {
  if (!ctx.adminEmails.length) return;
  const action = ctx.portalUrl
    ? `<p style="margin:16px 0"><a href="${ctx.portalUrl}" style="background:#3182ce;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Reactivar suscripción</a></p>`
    : `<p>Ve a <strong>Configuración → Plan</strong> para reactivar tu suscripción.</p>`;

  await send({
    to: ctx.adminEmails,
    subject: `Suscripción cancelada — ${ctx.tenantNombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#2d3748">Suscripción cancelada</h2>
        <p>Hola,</p>
        <p>La suscripción de <strong>${ctx.tenantNombre}</strong> ha sido cancelada. El acceso a los módulos premium se ha restringido.</p>
        ${action}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#888;font-size:12px">Si cancelaste intencionalmente, ignora este mensaje.</p>
      </div>`,
    text: `La suscripción de ${ctx.tenantNombre} fue cancelada. Para reactivarla: ${ctx.portalUrl ?? 'Configuración → Plan'}.`,
  });
}

/**
 * Confirmación de suscripción activada / actualizada.
 * Se envía ante `checkout.session.completed` o cambio a estado `active`.
 */
export async function sendSubscriptionActivatedEmail(ctx: BillingEmailContext): Promise<void> {
  if (!ctx.adminEmails.length) return;

  await send({
    to: ctx.adminEmails,
    subject: `✅ Suscripción activa — ${ctx.tenantNombre}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#276749">Suscripción confirmada</h2>
        <p>Hola,</p>
        <p>La suscripción <strong>${ctx.planLabel ?? ''}</strong> de <strong>${ctx.tenantNombre}</strong> está activa. Ya tienes acceso a todos los módulos de tu plan.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#888;font-size:12px">Gracias por tu confianza.</p>
      </div>`,
    text: `Suscripción ${ctx.planLabel ?? ''} de ${ctx.tenantNombre} confirmada y activa.`,
  });
}

export interface TrialReminderEmailContext extends BillingEmailContext {
  daysRemaining: number;
  variant: 'week' | 'lastDay';
}

/**
 * Recordatorio antes de que venza el trial (job diario vía cron).
 * Devuelve `true` solo si el correo se envió correctamente (para marcar flags en BD).
 */
export async function sendTrialReminderEmail(ctx: TrialReminderEmailContext): Promise<boolean> {
  if (process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true' || !ctx.adminEmails.length) return false;

  const t = getTransporter();
  if (!t) return false;

  const dr = ctx.daysRemaining;
  const timePhrase =
    ctx.variant === 'lastDay'
      ? dr <= 0
        ? 'finaliza hoy'
        : 'queda 1 día'
      : dr === 1
        ? 'queda 1 día'
        : `quedan ${dr} días`;

  const subject =
    ctx.variant === 'lastDay'
      ? `Último día de prueba — ${ctx.tenantNombre}`
      : `Tu periodo de prueba termina pronto — ${ctx.tenantNombre}`;

  const action = ctx.portalUrl
    ? `<p style="margin:16px 0"><a href="${ctx.portalUrl}" style="background:#2f855a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Ver planes y facturación</a></p>`
    : `<p>Entra a <strong>Configuración → Plan</strong> en la aplicación para contratar o actualizar tu suscripción.</p>`;

  const recipients = Array.isArray(ctx.adminEmails) ? ctx.adminEmails.join(', ') : ctx.adminEmails;

  try {
    await t.sendMail({
      from: from(),
      to: recipients,
      subject,
      html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#2d3748">Periodo de prueba</h2>
        <p>Hola,</p>
        <p>El periodo de prueba de <strong>${ctx.tenantNombre}</strong> (${ctx.planLabel ?? 'plan actual'}) <strong>${timePhrase}</strong>.</p>
        <p>Si deseas seguir usando el sistema sin interrupciones, elige un plan y completa el pago cuando corresponda.</p>
        ${action}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#888;font-size:12px">Mensaje automático sobre el estado de tu cuenta. Si ya contrataste un plan, puedes ignorar este correo.</p>
      </div>`,
      text: `Periodo de prueba de ${ctx.tenantNombre}: ${timePhrase}. Contrata un plan en Configuración → Plan. ${ctx.portalUrl ?? ''}`,
    });
    return true;
  } catch (e: unknown) {
    console.error('[email] trial reminder:', e instanceof Error ? e.message : e);
    return false;
  }
}
