import { Router } from 'express';
import { VentasController } from './ventas.controller';
import { authMiddleware, canAdmin, canSell, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new VentasController();

/**
 * @openapi
 * /api/v1/ventas:
 *   get:
 *     tags: [Ventas]
 *     summary: Listar ventas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Ventas]
 *     summary: Registrar venta (POS)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Venta creada }
 * /api/v1/ventas/resumen-hoy:
 *   get:
 *     tags: [Ventas]
 *     summary: Resumen de ventas del día
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Resumen }
 * /api/v1/ventas/caja/abrir:
 *   post:
 *     tags: [Ventas, Caja]
 *     summary: Abrir caja
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Caja abierta }
 * /api/v1/ventas/caja/cerrar:
 *   post:
 *     tags: [Ventas, Caja]
 *     summary: Cerrar caja
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Caja cerrada }
 * /api/v1/ventas/caja/activa-por-caja/{cajaId}:
 *   get:
 *     tags: [Ventas, Caja]
 *     summary: Caja activa por ID de caja física
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: cajaId, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Apertura activa o vacío }
 * /api/v1/ventas/caja/activa/{nombre}:
 *   get:
 *     tags: [Ventas, Caja]
 *     summary: Caja activa por nombre (legacy)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: nombre, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Apertura }
 * /api/v1/ventas/caja/historial:
 *   get:
 *     tags: [Ventas, Caja]
 *     summary: Historial de cierres
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 * /api/v1/ventas/caja/abiertas:
 *   get:
 *     tags: [Ventas, Caja]
 *     summary: Cajas abiertas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 * /api/v1/ventas/caja/resumen/{id}:
 *   get:
 *     tags: [Ventas, Caja]
 *     summary: Resumen de una apertura/cierre por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Resumen }
 * /api/v1/ventas/caja/{id}/pdf:
 *   get:
 *     tags: [Ventas, Caja]
 *     summary: PDF de cierre de caja
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: PDF }
 * /api/v1/ventas/{id}:
 *   get:
 *     tags: [Ventas]
 *     summary: Detalle de venta
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Venta }
 *   put:
 *     tags: [Ventas]
 *     summary: Reemplazo completo (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 *   patch:
 *     tags: [Ventas]
 *     summary: Actualización parcial (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 * /api/v1/ventas/{id}/anular:
 *   patch:
 *     tags: [Ventas]
 *     summary: Anular venta (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Anulada }
 */

router.use(authMiddleware);

// Ventas (rutas fijas primero, luego las paramétricas)
router.get('/',              canAdminOrSoporte, ctrl.findAll.bind(ctrl));
router.get('/resumen-hoy',   canAdminOrSoporte, ctrl.resumenHoy.bind(ctrl));
router.post('/',             canSell,           ctrl.create.bind(ctrl));

// Caja (deben ir antes de /:id para que no sean interceptadas)
router.post('/caja/abrir',        canSell,           ctrl.abrirCaja.bind(ctrl));
router.post('/caja/cerrar',       canSell,           ctrl.cerrarCaja.bind(ctrl));
router.get('/caja/activa-por-caja/:cajaId', canSell, ctrl.getCajaActivaPorCajaId.bind(ctrl));
router.get('/caja/activa/:nombre',canSell,           ctrl.getCajaActiva.bind(ctrl));
router.get('/caja/historial',     canSell,           ctrl.getHistorialCajas.bind(ctrl));
router.get('/caja/abiertas',      canSell,           ctrl.listCajasAbiertas.bind(ctrl));
router.get('/caja/resumen/:id',   canSell,           ctrl.resumenCaja.bind(ctrl));
router.get('/caja/:id/pdf',       canSell,           ctrl.pdfCierre.bind(ctrl));

// Rutas paramétricas al final
router.post('/:id/auditoria-recibo', ctrl.auditarReciboImpresion.bind(ctrl));
router.get('/:id',           canAdminOrSoporte, ctrl.findById.bind(ctrl));
router.patch('/:id',         canAdmin,          ctrl.update.bind(ctrl));
router.put('/:id',           canAdmin,          ctrl.fullUpdate.bind(ctrl));
router.patch('/:id/anular',  canAdmin,          ctrl.anular.bind(ctrl));

export default router;
