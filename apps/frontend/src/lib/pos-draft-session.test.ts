import { describe, expect, it } from 'vitest';

import {
  POS_DRAFT_SCHEMA_VERSION,
  buildPosDraftStorageKey,
  parsePosDraftV1,
  posDraftV1Schema,
  rehydrateClienteFromDraftLite,
} from './pos-draft-session';

describe('buildPosDraftStorageKey', () => {
  it('scopes by tenant, tienda and schema version', () => {
    expect(buildPosDraftStorageKey(12, 3)).toBe(
      `pos_venta_draft:v${POS_DRAFT_SCHEMA_VERSION}:12:3`,
    );
  });
});

describe('parsePosDraftV1', () => {
  it('returns null for invalid JSON', () => {
    expect(parsePosDraftV1('not-json')).toBeNull();
  });

  it('returns null for empty items', () => {
    const raw = JSON.stringify(
      posDraftV1Schema.parse({
        v: 1,
        items: [],
        clienteId: null,
        descuentoGlobal: 0,
        clienteNombre: '',
        clienteLite: null,
        selectedCajaId: undefined,
        mode: 'cart',
        pagos: [],
        usarNCF: false,
        tipoNCF: '02',
        notas: '',
        promoCodigo: '',
        promoDescuento: 0,
        promoNombre: '',
        showNCF: false,
        pagoMixto: false,
        metodoPago: 'EFECTIVO',
        efectivoRecibido: '',
        esDelivery: false,
        deliveryCargo: '',
        deliveryDireccion: '',
      }),
    );
    expect(parsePosDraftV1(raw)).toBeNull();
  });

  it('parses a minimal valid draft with one line', () => {
    const draft = posDraftV1Schema.parse({
      v: 1,
      items: [
        {
          articulo: {
            id: 9,
            codigoBarras: '750',
            nombre: 'Test',
            costo: 1,
            precioVenta: 50,
            cantidad: 10,
            categoria: { id: 1, nombre: 'G' },
            activo: true,
          },
          cantidad: 2,
          precioUnitario: 50,
          descuento: 0,
          total: 100,
        },
      ],
      clienteId: null,
      descuentoGlobal: 0,
      clienteNombre: '',
      clienteLite: null,
      mode: 'cart',
      pagos: [],
      usarNCF: false,
      tipoNCF: '02',
      notas: '',
      promoCodigo: '',
      promoDescuento: 0,
      promoNombre: '',
      showNCF: false,
      pagoMixto: false,
      metodoPago: 'EFECTIVO',
      efectivoRecibido: '',
      esDelivery: false,
      deliveryCargo: '',
      deliveryDireccion: '',
    });
    const roundTrip = parsePosDraftV1(JSON.stringify(draft));
    expect(roundTrip).toEqual(draft);
  });
});

describe('rehydrateClienteFromDraftLite', () => {
  it('fills required ICliente fields with safe defaults', () => {
    const c = rehydrateClienteFromDraftLite({
      id: 5,
      nombre: 'Ana',
      limiteCredito: 1000,
      saldo: 40,
      descuentoCliente: 5,
    });
    expect(c).toMatchObject({
      id: 5,
      nombre: 'Ana',
      limiteCredito: 1000,
      saldo: 40,
      descuentoCliente: 5,
      activo: true,
      createdAt: '',
    });
  });
});
