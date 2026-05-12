import { AppError } from '../middlewares/error.middleware';
import { sendFail } from '../utils/response';

type ExpressResponse = Parameters<typeof sendFail>[0];

function mockRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status } as unknown as ExpressResponse, status, json };
}

describe('sendFail', () => {
  it('sends AppError statusCode 403 and message', () => {
    const { res, status, json } = mockRes();
    sendFail(res, new AppError('Prohibido', 403));
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Prohibido',
      data: null,
    });
  });

  it('sends AppError statusCode 404 and message', () => {
    const { res, status, json } = mockRes();
    sendFail(res, new AppError('No encontrado', 404));
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'No encontrado',
      data: null,
    });
  });

  it('uses default HTTP status for generic Error (message from Error)', () => {
    const { res, status, json } = mockRes();
    sendFail(res, new Error('Algo salió mal'));
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Algo salió mal',
      data: null,
    });
  });
});
