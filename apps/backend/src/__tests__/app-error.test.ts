import { AppError } from '../middlewares/error.middleware';

describe('AppError', () => {
  it('sets message and statusCode', () => {
    const e = new AppError('Recurso no encontrado', 404);
    expect(e.message).toBe('Recurso no encontrado');
    expect(e.statusCode).toBe(404);
    expect(e.name).toBe('AppError');
  });

  it('defaults statusCode to 400', () => {
    const e = new AppError('Solicitud inválida');
    expect(e.statusCode).toBe(400);
  });

  it('is an instance of Error', () => {
    const e = new AppError('Conflicto', 409);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(AppError);
  });

  it('supports 5xx status codes', () => {
    const e = new AppError('Fallo interno', 500);
    expect(e.statusCode).toBe(500);
  });
});
