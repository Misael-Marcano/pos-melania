/**
 * Estado de trial derivado de `tenants.trialEndsAt` (UTC).
 */
export interface TrialState {
  /** ISO 8601 o null si no hay trial configurado */
  endsAt: string | null;
  /** Ahora < endsAt */
  active: boolean;
  /** now >= endsAt (solo si hubo fecha) */
  expired: boolean;
  /** Días calendario restantes si active; 0 si acaba hoy o expiró; null si no hay trial */
  daysRemaining: number | null;
}

export function trialStateFromEndsAt(trialEndsAt: Date | null | undefined): TrialState {
  if (trialEndsAt == null) {
    return { endsAt: null, active: false, expired: false, daysRemaining: null };
  }
  const end = new Date(trialEndsAt);
  const iso = end.toISOString();
  const now = Date.now();
  const endMs = end.getTime();
  if (now < endMs) {
    const days = Math.ceil((endMs - now) / (24 * 60 * 60 * 1000));
    return { endsAt: iso, active: true, expired: false, daysRemaining: days };
  }
  return { endsAt: iso, active: false, expired: true, daysRemaining: 0 };
}
