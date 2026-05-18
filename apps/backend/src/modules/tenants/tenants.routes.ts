import { Router } from 'express';
import { TenantsController } from './tenants.controller';
import { authMiddleware, canPlataforma } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl = new TenantsController();

/**
 * @openapi
 * /api/v1/tenants:
 *   get:
 *     tags: [Tenants]
 *     summary: Listar organizaciones activas (solo rol plataforma)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista básica de tenants }
 * /api/v1/tenants/panel:
 *   get:
 *     tags: [Tenants]
 *     summary: Panel admin — organizaciones con métricas de uso y facturación
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista enriquecida con usage y billing }
 */

router.use(authMiddleware, canPlataforma);
router.get('/',      ctrl.list.bind(ctrl));
router.get('/panel', ctrl.listWithUsage.bind(ctrl));
router.post('/:id/operate', ctrl.operate.bind(ctrl));

export default router;
