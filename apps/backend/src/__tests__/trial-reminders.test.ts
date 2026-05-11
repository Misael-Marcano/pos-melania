import { trialReminderBuckets } from '../saas/trial-reminders';
import { trialStateFromEndsAt } from '../saas/trial';

describe('trialReminderBuckets', () => {
  it('envía semana solo en 2–7 días y si no se envió', () => {
    const s = { endsAt: 'x', active: true, expired: false, daysRemaining: 5 } as ReturnType<
      typeof trialStateFromEndsAt
    >;
    expect(trialReminderBuckets(s, false, false)).toEqual({ sendWeek: true, sendLastDay: false });
    expect(trialReminderBuckets(s, true, false)).toEqual({ sendWeek: false, sendLastDay: false });
  });

  it('envía último día en 0–1 días y si no se envió', () => {
    const s = { endsAt: 'x', active: true, expired: false, daysRemaining: 1 } as ReturnType<
      typeof trialStateFromEndsAt
    >;
    expect(trialReminderBuckets(s, false, false)).toEqual({ sendWeek: false, sendLastDay: true });
    const s0 = { endsAt: 'x', active: true, expired: false, daysRemaining: 0 } as ReturnType<
      typeof trialStateFromEndsAt
    >;
    expect(trialReminderBuckets(s0, false, false)).toEqual({ sendWeek: false, sendLastDay: true });
  });

  it('no envía si el trial ya expiró', () => {
    const s = { endsAt: 'x', active: false, expired: true, daysRemaining: 0 } as ReturnType<
      typeof trialStateFromEndsAt
    >;
    expect(trialReminderBuckets(s, false, false)).toEqual({ sendWeek: false, sendLastDay: false });
  });
});
