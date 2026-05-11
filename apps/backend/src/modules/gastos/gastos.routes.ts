import { Router } from 'express';
import { GastosController } from './gastos.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte, canSell } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new GastosController();

/**
 * @openapi
 * /api/v1/gastos:
 *   get:
 *     tags: [Gastos]
 *     summary: Listar gastos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Gastos]
 *     summary: Registrar gasto
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 * /api/v1/gastos/{id}:
 *   get:
 *     tags: [Gastos]
 *     summary: Obtener gasto por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Gasto }
 *   put:
 *     tags: [Gastos]
 *     summary: Actualizar gasto
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Gastos]
 *     summary: Eliminar gasto (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminado }
 */

router.use(authMiddleware);

router.get('/',       canSell,            ctrl.findAll.bind(ctrl));
router.get('/:id',    canSell,            ctrl.findById.bind(ctrl));
router.post('/',      canAdminOrSoporte,  ctrl.create.bind(ctrl));
router.put('/:id',    canAdminOrSoporte,  ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin,           ctrl.delete.bind(ctrl));

export default router;
