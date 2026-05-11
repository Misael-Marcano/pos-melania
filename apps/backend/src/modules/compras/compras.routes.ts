import { Router } from 'express';
import { ComprasController } from './compras.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ComprasController();

/**
 * @openapi
 * /api/v1/compras:
 *   get:
 *     tags: [Compras]
 *     summary: Listar órdenes de compra
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Compras]
 *     summary: Crear compra (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/compras/{id}:
 *   get:
 *     tags: [Compras]
 *     summary: Detalle de compra
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Compra }
 *   put:
 *     tags: [Compras]
 *     summary: Actualizar compra (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 * /api/v1/compras/{id}/enviar:
 *   patch:
 *     tags: [Compras]
 *     summary: Marcar como enviada (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: OK }
 * /api/v1/compras/{id}/recibir:
 *   patch:
 *     tags: [Compras]
 *     summary: Registrar recepción (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: OK }
 * /api/v1/compras/{id}/cancelar:
 *   patch:
 *     tags: [Compras]
 *     summary: Cancelar compra (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: OK }
 */

router.use(authMiddleware);

router.get('/',                    canAdminOrSoporte, ctrl.findAll.bind(ctrl));
router.get('/:id',                 canAdminOrSoporte, ctrl.findById.bind(ctrl));
router.post('/',                   canAdmin,          ctrl.create.bind(ctrl));
router.put('/:id',                 canAdmin,          ctrl.update.bind(ctrl));
router.patch('/:id/enviar',        canAdmin,          ctrl.enviar.bind(ctrl));
router.patch('/:id/recibir',       canAdmin,          ctrl.recibir.bind(ctrl));
router.patch('/:id/cancelar',      canAdmin,          ctrl.cancelar.bind(ctrl));

export default router;
