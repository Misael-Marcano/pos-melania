import { buildNcf, parseNcfSequenceTail } from '../utils/ncf';

describe('parseNcfSequenceTail', () => {
  it('lee los últimos 8 dígitos de un NCF completo', () => {
    expect(parseNcfSequenceTail('B0200000042')).toBe(42);
  });

  it('acepta solo la parte numérica de 8 caracteres', () => {
    expect(parseNcfSequenceTail('00000001')).toBe(1);
  });

  it('toma los últimos 8 caracteres aunque haya prefijo', () => {
    expect(parseNcfSequenceTail('PREFIX00567899')).toBe(567899);
  });
});

describe('buildNcf', () => {
  it('arma NCF con tipo y secuencia rellenados', () => {
    expect(buildNcf('B', '02', 1)).toBe('B0200000001');
  });

  it('no altera tipo ya de dos dígitos', () => {
    expect(buildNcf('B', '14', 99999999)).toBe('B1499999999');
  });

  it('rellena secuencia a 8 dígitos', () => {
    expect(buildNcf('X', '01', 0)).toBe('X0100000000');
  });
});
