import { Router } from 'express';
import { ConfiguracionController } from './configuracion.controller';
import { authMiddleware, canAdmin, canConfigRead } from '../../middlewares/auth.middleware';

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

export default router;
