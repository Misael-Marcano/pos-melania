import { trialStateFromEndsAt } from '../saas/trial';

describe('trialStateFromEndsAt (pure, clock-frozen)', () => {
  const frozen = new Date('2026-05-01T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(frozen);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('undefined → sin trial', () => {
    expect(trialStateFromEndsAt(undefined)).toEqual({
      endsAt: null,
      active: false,
      expired: false,
      daysRemaining: null,
    });
  });

  it('fin igual al ahora → expirado (no estrictamente futuro)', () => {
    const s = trialStateFromEndsAt(new Date(frozen.getTime()));
    expect(s.active).toBe(false);
    expect(s.expired).toBe(true);
    expect(s.daysRemaining).toBe(0);
    expect(s.endsAt).toBe(frozen.toISOString());
  });

  it('1 ms después del ahora → activo; ceil da 1 día', () => {
    const s = trialStateFromEndsAt(new Date(frozen.getTime() + 1));
    expect(s.active).toBe(true);
    expect(s.expired).toBe(false);
    expect(s.daysRemaining).toBe(1);
  });

  it('23 h restantes → ceil a 1 día calendario', () => {
    const end = new Date(frozen.getTime() + 23 * 60 * 60 * 1000);
    const s = trialStateFromEndsAt(end);
    expect(s.active).toBe(true);
    expect(s.daysRemaining).toBe(1);
  });
});
