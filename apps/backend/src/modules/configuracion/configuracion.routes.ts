import { Router } from 'express';
import { ConfiguracionController } from './configuracion.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

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
/** Lectura: todos los roles (cajero necesita nombre/RNC en recibos y POS). Escritura solo admin. */
router.get('/', canAll,   ctrl.get.bind(ctrl));
router.put('/', canAdmin, ctrl.update.bind(ctrl));

export default router;
