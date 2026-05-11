import { Router } from 'express';
import { DevolucionesController } from './devoluciones.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new DevolucionesController();

/**
 * @openapi
 * /api/v1/devoluciones:
 *   get:
 *     tags: [Devoluciones]
 *     summary: Listar devoluciones
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Devoluciones]
 *     summary: Crear solicitud de devolución (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/devoluciones/venta/{ventaId}:
 *   get:
 *     tags: [Devoluciones]
 *     summary: Devoluciones asociadas a una venta
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: ventaId, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Lista }
 * /api/v1/devoluciones/{id}:
 *   get:
 *     tags: [Devoluciones]
 *     summary: Detalle de devolución
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Devolución }
 * /api/v1/devoluciones/{id}/aprobar:
 *   patch:
 *     tags: [Devoluciones]
 *     summary: Aprobar devolución (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: OK }
 * /api/v1/devoluciones/{id}/rechazar:
 *   patch:
 *     tags: [Devoluciones]
 *     summary: Rechazar devolución (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: OK }
 */

router.use(authMiddleware);

router.get('/',                          canAdminOrSoporte, ctrl.findAll.bind(ctrl));
/** Debe ir antes de `/:id` para que `/venta/...` no se interprete como id numérico. */
router.get('/venta/:ventaId',            canAdminOrSoporte, ctrl.findByVenta.bind(ctrl));
router.get('/:id',                       canAdminOrSoporte, ctrl.findById.bind(ctrl));
router.post('/',                         canAdmin,          ctrl.create.bind(ctrl));
router.patch('/:id/aprobar',             canAdmin,          ctrl.aprobar.bind(ctrl));
router.patch('/:id/rechazar',            canAdmin,          ctrl.rechazar.bind(ctrl));

export default router;
