import { Router } from 'express';
import { SaasController } from './saas.controller';
import { authMiddleware, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl = new SaasController();

/**
 * @openapi
 * /api/v1/saas/context:
 *   get:
 *     tags: [SaaS]
 *     summary: Plan y límites de la organización del usuario
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Contexto }
 */

router.use(authMiddleware, canAll);
router.get('/context', ctrl.context.bind(ctrl));

export default router;
