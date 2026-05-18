import { describe, expect, it } from 'vitest';

import {
  formatSessionDuration,
  isIntegrationCajaSession,
} from './caja-session';

describe('isIntegrationCajaSession', () => {
  it('matches INTEG prefix', () => {
    expect(isIntegrationCajaSession('INTEG-1778613463742')).toBe(true);
    expect(isIntegrationCajaSession('Caja 1')).toBe(false);
  });
});

describe('formatSessionDuration', () => {
  it('formats positive duration with normalized minutes', () => {
    const r = formatSessionDuration(
      '2026-05-12T08:00:00.000Z',
      '2026-05-12T12:30:00.000Z',
    );
    expect(r).toEqual({ kind: 'ok', label: '4h 30m' });
  });

  it('avoids negative minutes when close is before open', () => {
    const r = formatSessionDuration(
      '2026-05-12T18:00:00.000Z',
      '2026-05-12T08:00:00.000Z',
    );
    expect(r).toEqual({ kind: 'inconsistent' });
  });

  it('returns open when no close date', () => {
    expect(formatSessionDuration('2026-05-12T08:00:00.000Z')).toEqual({ kind: 'open' });
  });
});
