import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant.entity';
import { cache } from '../config/redis';
import { env } from '../config/env';
import { sendError } from '../utils/response';
import { AuthUser } from '@pos/shared';
import { trialStateFromEndsAt } from '../saas/trial';

/**
 * Estados de facturación que bloquean el acceso al API de negocio.
 * `active`, `trialing` y `null` (sin facturación configurada) se dejan pasar.
 */
const BLOCKED_STATUSES = new Set(['past_due', 'canceled', 'unpaid', 'incomplete_expired']);

/** TTL del caché de estado de guard (segundos). */
const CACHE_TTL_SECONDS = 300;

/** Prefijo de clave Redis — v2 almacena JSON `{ billingStatus, trialEndsAt }`. */
const CACHE_PREFIX = 'tenant:guard:v2:';

/**
 * Rutas exentas del billing guard aunque el tenant esté en mora.
 * - auth (login, refresh, logout — el usuario debe poder autenticarse para pagar)
 * - billing (para que pueda reactivar su suscripción desde la UI)
 * - saas/context (solo lectura de plan/trial para la UI)
 * - health (infraestructura)
 */
const EXEMPT_PREFIXES = [
  '/api/v1/auth/',
  '/api/v1/billing/',
  '/api/v1/saas/',
  '/api/v1/internal/',
  '/health',
  '/api-docs',
  '/api-docs.json',
];

interface TenantGuardState {
  billingStatus: string | null;
  trialEndsAt: Date | null;
}

function isExemptRequest(req: Request): boolean {
  const pathOnly = req.originalUrl.split('?')[0];
  if (EXEMPT_PREFIXES.some((p) => pathOnly.startsWith(p))) return true;
  /** GET configuración: ver pantalla Plan y abrir portal; PUT sigue bloqueado si aplica. */
  if (req.method === 'GET' && pathOnly.startsWith('/api/v1/configuracion')) return true;
  return false;
}

function isPaidSubscriptionActive(billingStatus: string | null): boolean {
  return billingStatus === 'active' || billingStatus === 'trialing';
}

/**
 * Lee el tenantId del JWT sin verificar la firma completa (la verificación real
 * la hace authMiddleware). Si el token es inválido o no existe, devuelve null
 * (y el guard simplemente pasa — authMiddleware lo rechazará después).
 */
function decodeTenantId(req: Request): number | null {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    // plataforma sin X-Tenant-Id no tiene organización — no aplica el guard
    if (payload.rol === 'plataforma') return null;
    const tid = Number(payload.tenantId);
    return tid > 0 ? tid : null;
  } catch {
    return null;
  }
}

async function getTenantGuardState(tenantId: number): Promise<TenantGuardState> {
  const cacheKey = `${CACHE_PREFIX}${tenantId}`;

  try {
    const cached = await cache.get<string | null>(cacheKey);
    if (cached !== undefined && cached !== null && cached !== '') {
      try {
        const parsed = JSON.parse(cached) as {
          billingStatus?: string | null;
          trialEndsAt?: string | null;
        };
        return {
          billingStatus: parsed.billingStatus ?? null,
          trialEndsAt: parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : null,
        };
      } catch {
        /* seguir a BD */
      }
    }
  } catch {
    /* Redis */
  }

  if (!AppDataSource.isInitialized) {
    return { billingStatus: null, trialEndsAt: null };
  }

  const tenant = await AppDataSource.getRepository(Tenant).findOne({
    where: { id: tenantId },
    select: ['billingStatus', 'trialEndsAt'],
  });
  const state: TenantGuardState = {
    billingStatus: tenant?.billingStatus ?? null,
    trialEndsAt: tenant?.trialEndsAt ?? null,
  };

  try {
    await cache.set(
      cacheKey,
      JSON.stringify({
        billingStatus: state.billingStatus,
        trialEndsAt: state.trialEndsAt ? state.trialEndsAt.toISOString() : null,
      }),
      CACHE_TTL_SECONDS,
    );
  } catch {
    /* ignorar si Redis no está disponible */
  }

  return state;
}

/**
 * Invalida el caché de estado de guard (facturación + trial) de un tenant.
 * Llamar desde el webhook de Stripe o al cambiar trial en BD.
 */
export async function invalidateBillingStatusCache(tenantId: number): Promise<void> {
  try {
    await cache.del(`${CACHE_PREFIX}${tenantId}`);
  } catch {
    /* ignorar */
  }
}

/**
 * Middleware global de bloqueo por impago y (opcional) trial vencido.
 *
 * - `BILLING_ENFORCE_PAYMENT=true`: 402 si `billingStatus` está en mora/cancelada.
 * - `TRIAL_ENFORCE_EXPIRED=true`: 402 si `trialEndsAt` venció y no hay suscripción activa/trialing.
 *
 * Rutas exentas: auth, billing, saas, GET configuración, health.
 * Rol exento: `plataforma` (sin tenant en JWT).
 */
export function billingGuard(req: Request, res: Response, next: NextFunction): void {
  const billingEnforce = process.env.BILLING_ENFORCE_PAYMENT === 'true';
  const trialEnforce = process.env.TRIAL_ENFORCE_EXPIRED === 'true';

  if (!billingEnforce && !trialEnforce) {
    next();
    return;
  }

  if (isExemptRequest(req)) {
    next();
    return;
  }

  const tenantId = decodeTenantId(req);
  if (!tenantId) {
    next();
    return;
  }

  getTenantGuardState(tenantId)
    .then((state) => {
      if (billingEnforce && state.billingStatus && BLOCKED_STATUSES.has(state.billingStatus)) {
        sendError(
          res,
          `Acceso suspendido por estado de facturación: ${state.billingStatus}. Actualiza tu suscripción en Configuración → Plan.`,
          402,
          { code: 'BILLING_SUSPENDED', billingStatus: state.billingStatus },
        );
        return;
      }

      if (
        trialEnforce &&
        state.trialEndsAt &&
        trialStateFromEndsAt(state.trialEndsAt).expired &&
        !isPaidSubscriptionActive(state.billingStatus)
      ) {
        sendError(
          res,
          'El periodo de prueba ha finalizado. Contrata un plan en Configuración → Plan para continuar.',
          402,
          { code: 'TRIAL_EXPIRED' },
        );
        return;
      }

      next();
    })
    .catch(() => {
      next();
    });
}
