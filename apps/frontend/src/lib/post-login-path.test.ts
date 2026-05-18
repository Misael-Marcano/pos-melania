import { describe, expect, it } from 'vitest';
import { postLoginPath } from './post-login-path';

describe('postLoginPath', () => {
  it('envía plataforma sin org a select-organizacion', () => {
    expect(postLoginPath('plataforma', null)).toBe('/select-organizacion');
    expect(postLoginPath('plataforma', undefined)).toBe('/select-organizacion');
  });

  it('envía plataforma con org al panel', () => {
    expect(postLoginPath('plataforma', 2)).toBe('/panel');
  });

  it('envía contador a reportes', () => {
    expect(postLoginPath('contador', null)).toBe('/reportes');
  });

  it('envía admin y cajero al panel', () => {
    expect(postLoginPath('admin', null)).toBe('/panel');
    expect(postLoginPath('cajero', null)).toBe('/panel');
  });
});
