import { computeConciliacionCaja } from '../../modules/reportes/conciliacion-caja';

describe('computeConciliacionCaja', () => {
  const base = {
    montoApertura: 1000,
    montoCierre: 2500,
    totalEfectivo: 1200,
    totalGastos: 100,
    totalVentas: 5000,
    cantidadVentas: 12,
    cerrada: true,
  };

  it('calcula efectivo esperado = apertura + efectivo ventas − gastos', () => {
    const r = computeConciliacionCaja(base);
    expect(r.efectivoEsperado).toBe(2100);
    expect(r.diferencia).toBe(400);
    expect(r.cuadra).toBe(false);
    expect(r.alerta).toBe('Sobrante en caja');
  });

  it('marca cuadra cuando la diferencia es menor a un centavo', () => {
    const r = computeConciliacionCaja({
      ...base,
      montoCierre: 2100,
    });
    expect(r.diferencia).toBe(0);
    expect(r.cuadra).toBe(true);
    expect(r.alerta).toBeNull();
  });

  it('detecta faltante en caja', () => {
    const r = computeConciliacionCaja({
      ...base,
      montoCierre: 2000,
    });
    expect(r.diferencia).toBe(-100);
    expect(r.alerta).toBe('Faltante en caja');
  });

  it('no calcula diferencia si la sesión sigue abierta', () => {
    const r = computeConciliacionCaja({
      ...base,
      cerrada: false,
      montoCierre: null,
    });
    expect(r.diferencia).toBeNull();
    expect(r.cuadra).toBeNull();
    expect(r.efectivoEsperado).toBe(2100);
  });

  it('expone diferencia vs apertura solo como referencia', () => {
    const r = computeConciliacionCaja(base);
    expect(r.diferenciaVsApertura).toBe(1500);
  });
});
