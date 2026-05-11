import { trialStateFromEndsAt } from '../saas/trial';

describe('trialStateFromEndsAt', () => {
  it('sin fecha → todo en falso / null', () => {
    expect(trialStateFromEndsAt(null)).toEqual({
      endsAt: null,
      active: false,
      expired: false,
      daysRemaining: null,
    });
  });

  it('fecha futura → activo y días >= 1', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const s = trialStateFromEndsAt(future);
    expect(s.active).toBe(true);
    expect(s.expired).toBe(false);
    expect(s.daysRemaining).toBeGreaterThanOrEqual(10);
    expect(s.endsAt).toBe(future.toISOString());
  });

  it('fecha pasada → expirado', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const s = trialStateFromEndsAt(past);
    expect(s.active).toBe(false);
    expect(s.expired).toBe(true);
    expect(s.daysRemaining).toBe(0);
  });
});
