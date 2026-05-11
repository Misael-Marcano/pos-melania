import { PLAN_LIMITS, resolvePlanLimits } from '../saas/plan-limits';

describe('resolvePlanLimits', () => {
  it('starter → límites estrictos y features bloqueadas', () => {
    const p = resolvePlanLimits('starter');
    expect(p.code).toBe('starter');
    expect(p.maxUsers).toBe(3);
    expect(p.maxTiendas).toBe(1);
    expect(p.maxArticulos).toBe(500);
    expect(p.features.kits).toBe(false);
    expect(p.features.compras).toBe(false);
  });

  it('standard → multi-sucursal con todas las features', () => {
    const p = resolvePlanLimits('standard');
    expect(p.code).toBe('standard');
    expect(p.maxUsers).toBe(15);
    expect(p.maxTiendas).toBe(5);
    expect(p.features.kits).toBe(true);
    expect(p.features.recetas).toBe(true);
  });

  it('enterprise → sin topes (null) y features completas', () => {
    const p = resolvePlanLimits('enterprise');
    expect(p.maxUsers).toBeNull();
    expect(p.maxTiendas).toBeNull();
    expect(p.maxArticulos).toBeNull();
    expect(p.features.tarjetasRegalo).toBe(true);
  });

  it('case-insensitive: "STANDARD" se resuelve igual', () => {
    expect(resolvePlanLimits('STANDARD').code).toBe('standard');
    expect(resolvePlanLimits('Enterprise').code).toBe('enterprise');
  });

  it('null/undefined/desconocido → fallback a standard', () => {
    expect(resolvePlanLimits(null).code).toBe('standard');
    expect(resolvePlanLimits(undefined).code).toBe('standard');
    expect(resolvePlanLimits('plan-inexistente').code).toBe('standard');
  });

  it('PLAN_LIMITS expone los tres planes esperados', () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(['enterprise', 'standard', 'starter']);
  });
});
