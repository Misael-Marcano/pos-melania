import { Router } from 'express';
import { ReportesController } from './reportes.controller';
import { authMiddleware, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ReportesController();

/**
 * @openapi
 * /api/v1/reportes/ventas-por-dia:
 *   get:
 *     tags: [Reportes]
 *     summary: Ventas agregadas por día
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/ventas-por-usuario:
 *   get:
 *     tags: [Reportes]
 *     summary: Ventas por usuario
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/ventas-por-caja:
 *   get:
 *     tags: [Reportes]
 *     summary: Ventas por caja
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/por-sucursal/{tiendaId}:
 *   get:
 *     tags: [Reportes]
 *     summary: Resumen por sucursal
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: tiendaId, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/cierre-caja/{id}:
 *   get:
 *     tags: [Reportes]
 *     summary: Detalle de cierre de caja
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/resumen-dia:
 *   get:
 *     tags: [Reportes]
 *     summary: Resumen del día
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/top-productos:
 *   get:
 *     tags: [Reportes]
 *     summary: Productos más vendidos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/ganancias:
 *   get:
 *     tags: [Reportes]
 *     summary: Reporte de ganancias
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/inventario-valorizado:
 *   get:
 *     tags: [Reportes]
 *     summary: Valorización de inventario
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/top-clientes:
 *   get:
 *     tags: [Reportes]
 *     summary: Principales clientes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/dgii-607:
 *   get:
 *     tags: [Reportes]
 *     summary: Reporte DGII 607
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 * /api/v1/reportes/dgii-606:
 *   get:
 *     tags: [Reportes]
 *     summary: Reporte DGII 606
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Datos }
 */

router.use(authMiddleware, canAdminOrSoporte);

router.get('/ventas-por-dia',        ctrl.ventasPorDia.bind(ctrl));
router.get('/ventas-por-usuario',    ctrl.ventasPorUsuario.bind(ctrl));
router.get('/ventas-por-caja',       ctrl.ventasPorCaja.bind(ctrl));
router.get('/por-sucursal/:tiendaId', ctrl.resumenPorSucursal.bind(ctrl));
router.get('/cierre-caja/:id',       ctrl.cierreCaja.bind(ctrl));
router.get('/conciliacion-caja',     ctrl.conciliacionCajaLista.bind(ctrl));
router.get('/conciliacion-caja/:id', ctrl.conciliacionCaja.bind(ctrl));
router.get('/resumen-dia',           ctrl.resumenDia.bind(ctrl));
router.get('/top-productos',         ctrl.topProductos.bind(ctrl));
router.get('/ganancias',             ctrl.ganancias.bind(ctrl));
router.get('/comparar-periodos',     ctrl.compararPeriodos.bind(ctrl));
router.get('/inventario-valorizado',        ctrl.inventarioValorizado.bind(ctrl));
router.get('/inventario-valorizado/export', ctrl.inventarioValorizadoExport.bind(ctrl));
router.get('/inventario-alertas',           ctrl.inventarioAlertas.bind(ctrl));
router.get('/cartera',                      ctrl.cartera.bind(ctrl));
router.get('/top-clientes',                 ctrl.topClientes.bind(ctrl));
router.get('/dgii-607/preview',             ctrl.dgii607Preview.bind(ctrl));
router.get('/dgii-606/preview',             ctrl.dgii606Preview.bind(ctrl));
router.get('/dgii-607',                     ctrl.dgii607.bind(ctrl));
router.get('/dgii-606',                     ctrl.dgii606.bind(ctrl));

export default router;
