import { Router } from 'express';
import { AuditoriaController } from './auditoria.controller';
import { authMiddleware, canAdmin } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new AuditoriaController();

/**
 * @openapi
 * /api/v1/auditoria:
 *   get:
 *     tags: [Auditoría]
 *     summary: Registro de auditoría (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 * /api/v1/auditoria/tablas:
 *   get:
 *     tags: [Auditoría]
 *     summary: Tablas auditables
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tablas }
 */

router.use(authMiddleware, canAdmin);

router.get('/',       ctrl.findAll.bind(ctrl));
router.get('/tablas', ctrl.getTablas.bind(ctrl));

export default router;
