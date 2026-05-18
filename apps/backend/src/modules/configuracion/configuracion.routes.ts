import { Router, Request, Response, NextFunction } from 'express';
import { ConfiguracionController } from './configuracion.controller';
import { authMiddleware, canAdmin, canConfigRead } from '../../middlewares/auth.middleware';
import { logotipoUploadMiddleware } from './logotipo-upload';

const router = Router();
const ctrl   = new ConfiguracionController();

/**
 * @openapi
 * /api/v1/configuracion:
 *   get:
 *     tags: [Configuración]
 *     summary: Obtener configuración global (nombre comercial, RNC, pie de recibo, etc.)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Configuración }
 *   put:
 *     tags: [Configuración]
 *     summary: Actualizar configuración (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Actualizada }
 */

router.use(authMiddleware);
/** Lectura: roles operativos + contador (solo lectura). Escritura solo admin. */
router.get('/fiscal-status', canConfigRead, ctrl.fiscalStatus.bind(ctrl));
router.get('/',            canConfigRead, ctrl.get.bind(ctrl));
router.put('/',            canAdmin,      ctrl.update.bind(ctrl));
router.post(
  '/logotipo',
  canAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    logotipoUploadMiddleware(req, res, (err: unknown) => {
      if (err) {
        const msg =
          err instanceof Error ? err.message : 'Error al subir el logotipo';
        const status = /tamaño|size|large|permitido|formato/i.test(msg) ? 400 : 500;
        res.status(status).json({ success: false, message: msg });
        return;
      }
      void ctrl.uploadLogotipo(req, res);
    });
  },
);

export default router;
