import { Router } from 'express';
import { KitsController } from './kits.controller';
import { authMiddleware, canAdmin } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new KitsController();

/**
 * @openapi
 * /api/v1/kits:
 *   get:
 *     tags: [Kits]
 *     summary: Listar kits
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Kits]
 *     summary: Crear kit (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 * /api/v1/kits/{id}:
 *   get:
 *     tags: [Kits]
 *     summary: Obtener kit por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Kit }
 *   put:
 *     tags: [Kits]
 *     summary: Actualizar kit (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Kits]
 *     summary: Eliminar kit (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminado }
 */

router.use(authMiddleware);

router.get('/',       ctrl.findAll.bind(ctrl));
router.get('/:id',    ctrl.findById.bind(ctrl));
router.post('/',      canAdmin, ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin, ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin, ctrl.delete.bind(ctrl));

export default router;
