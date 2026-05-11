import { Router } from 'express';
import { ComprobantesController } from './comprobantes.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ComprobantesController();

/**
 * @openapi
 * /api/v1/comprobantes:
 *   get:
 *     tags: [Comprobantes]
 *     summary: Listar comprobantes fiscales
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Comprobantes]
 *     summary: Crear comprobante (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 * /api/v1/comprobantes/{id}:
 *   put:
 *     tags: [Comprobantes]
 *     summary: Actualizar comprobante (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 */

router.use(authMiddleware);

router.get('/',       canAdminOrSoporte,  ctrl.findAll.bind(ctrl));
router.post('/',      canAdmin,           ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin,           ctrl.update.bind(ctrl));

export default router;
