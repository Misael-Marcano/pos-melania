import { Router } from 'express';
import { ReportesController } from './reportes.controller';
import { authMiddleware, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ReportesController();

router.use(authMiddleware, canAdminOrSoporte);

router.get('/ventas-por-dia',        ctrl.ventasPorDia.bind(ctrl));
router.get('/cierre-caja/:id',       ctrl.cierreCaja.bind(ctrl));
router.get('/resumen-dia',           ctrl.resumenDia.bind(ctrl));
router.get('/top-productos',         ctrl.topProductos.bind(ctrl));
router.get('/ganancias',             ctrl.ganancias.bind(ctrl));
router.get('/inventario-valorizado', ctrl.inventarioValorizado.bind(ctrl));
router.get('/top-clientes',          ctrl.topClientes.bind(ctrl));
router.get('/dgii-607',              ctrl.dgii607.bind(ctrl));
router.get('/dgii-606',              ctrl.dgii606.bind(ctrl));

export default router;
