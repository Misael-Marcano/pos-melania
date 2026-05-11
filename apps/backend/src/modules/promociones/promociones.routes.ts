import { Router } from 'express';
import { PromocionesController } from './promociones.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new PromocionesController();

/**
 * @openapi
 * /api/v1/promociones:
 *   get:
 *     tags: [Promociones]
 *     summary: Listar promociones activas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Promociones]
 *     summary: Crear promoción (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/promociones/validar:
 *   post:
 *     tags: [Promociones]
 *     summary: Validar código o reglas en el carrito
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Resultado }
 * /api/v1/promociones/{id}:
 *   get:
 *     tags: [Promociones]
 *     summary: Detalle de promoción
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Promoción }
 *   put:
 *     tags: [Promociones]
 *     summary: Actualizar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 *   delete:
 *     tags: [Promociones]
 *     summary: Eliminar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminada }
 */

router.use(authMiddleware);

router.get('/',           canAll,   ctrl.findAll.bind(ctrl));
router.get('/:id',        canAll,   ctrl.findById.bind(ctrl));
router.post('/validar',   canAll,   ctrl.validar.bind(ctrl));
router.post('/',          canAdmin, ctrl.create.bind(ctrl));
router.put('/:id',        canAdmin, ctrl.update.bind(ctrl));
router.delete('/:id',     canAdmin, ctrl.delete.bind(ctrl));

export default router;
