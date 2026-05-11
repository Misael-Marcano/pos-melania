import { Router } from 'express';
import { TarjetasRegaloController } from './tarjetas-regalo.controller';
import { authMiddleware, canAdmin, canSell } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new TarjetasRegaloController();

/**
 * @openapi
 * /api/v1/tarjetas-regalo:
 *   get:
 *     tags: [Tarjetas regalo]
 *     summary: Listar tarjetas regalo
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Tarjetas regalo]
 *     summary: Emitir tarjeta
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/tarjetas-regalo/codigo/{codigo}:
 *   get:
 *     tags: [Tarjetas regalo]
 *     summary: Buscar por código
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: codigo, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Tarjeta }
 * /api/v1/tarjetas-regalo/{id}:
 *   get:
 *     tags: [Tarjetas regalo]
 *     summary: Obtener por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Tarjeta }
 *   put:
 *     tags: [Tarjetas regalo]
 *     summary: Actualizar
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 *   delete:
 *     tags: [Tarjetas regalo]
 *     summary: Eliminar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminada }
 * /api/v1/tarjetas-regalo/{id}/recargar:
 *   post:
 *     tags: [Tarjetas regalo]
 *     summary: Recargar saldo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: OK }
 * /api/v1/tarjetas-regalo/{id}/usar:
 *   post:
 *     tags: [Tarjetas regalo]
 *     summary: Usar / descontar saldo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: OK }
 */

router.use(authMiddleware);

router.get('/',                     canSell,  ctrl.findAll.bind(ctrl));
router.get('/codigo/:codigo',       canSell,  ctrl.findByCodigo.bind(ctrl));
router.get('/:id',                  canSell,  ctrl.findById.bind(ctrl));
router.post('/',                    canSell,  ctrl.create.bind(ctrl));
router.post('/:id/recargar',        canSell,  ctrl.recargar.bind(ctrl));
router.post('/:id/usar',            canSell,  ctrl.usar.bind(ctrl));
router.put('/:id',                  canSell,  ctrl.update.bind(ctrl));
router.delete('/:id',               canAdmin,          ctrl.delete.bind(ctrl));

export default router;
