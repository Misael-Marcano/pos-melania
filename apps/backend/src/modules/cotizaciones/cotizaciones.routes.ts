import { Router } from 'express';
import { CotizacionesController } from './cotizaciones.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new CotizacionesController();

/**
 * @openapi
 * /api/v1/cotizaciones:
 *   get:
 *     tags: [Cotizaciones]
 *     summary: Listar cotizaciones
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Cotizaciones]
 *     summary: Crear cotización
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/cotizaciones/check-vencidas:
 *   get:
 *     tags: [Cotizaciones]
 *     summary: Revisar cotizaciones vencidas (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Resultado }
 * /api/v1/cotizaciones/{id}:
 *   get:
 *     tags: [Cotizaciones]
 *     summary: Detalle de cotización
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cotización }
 *   put:
 *     tags: [Cotizaciones]
 *     summary: Actualizar cotización
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 *   delete:
 *     tags: [Cotizaciones]
 *     summary: Eliminar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminada }
 * /api/v1/cotizaciones/{id}/estado:
 *   patch:
 *     tags: [Cotizaciones]
 *     summary: Cambiar estado (aprobada, rechazada, etc.)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 * /api/v1/cotizaciones/{id}/convertir:
 *   post:
 *     tags: [Cotizaciones]
 *     summary: Convertir cotización en venta (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Venta creada }
 */

router.use(authMiddleware);

router.get('/',                   canAll,    ctrl.findAll.bind(ctrl));
router.get('/check-vencidas',     canAdmin,  ctrl.checkVencidas.bind(ctrl));
router.get('/:id',                canAll,    ctrl.findById.bind(ctrl));
router.post('/',                  canAll,    ctrl.create.bind(ctrl));
router.put('/:id',                canAll,    ctrl.update.bind(ctrl));
router.patch('/:id/estado',       canAll,    ctrl.cambiarEstado.bind(ctrl));
router.post('/:id/convertir',     canAdmin,  ctrl.convertirAVenta.bind(ctrl));
router.delete('/:id',             canAdmin,  ctrl.delete.bind(ctrl));

export default router;
