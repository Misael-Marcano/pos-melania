import { Router } from 'express';
import { VentasController } from './ventas.controller';
import { authMiddleware, canAdmin, canSell, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new VentasController();

router.use(authMiddleware);

// Ventas (rutas fijas primero, luego las paramétricas)
router.get('/',              canAdminOrSoporte, ctrl.findAll.bind(ctrl));
router.get('/resumen-hoy',   canAdminOrSoporte, ctrl.resumenHoy.bind(ctrl));
router.post('/',             canSell,           ctrl.create.bind(ctrl));

// Caja (deben ir antes de /:id para que no sean interceptadas)
router.post('/caja/abrir',        canSell,           ctrl.abrirCaja.bind(ctrl));
router.post('/caja/cerrar',       canSell,           ctrl.cerrarCaja.bind(ctrl));
router.get('/caja/activa/:nombre',canSell,           ctrl.getCajaActiva.bind(ctrl));
router.get('/caja/historial',     canAdminOrSoporte, ctrl.getHistorialCajas.bind(ctrl));
router.get('/caja/resumen/:id',   canSell,           ctrl.resumenCaja.bind(ctrl));
router.get('/caja/:id/pdf',       canAdminOrSoporte, ctrl.pdfCierre.bind(ctrl));

// Rutas paramétricas al final
router.get('/:id',           canAdminOrSoporte, ctrl.findById.bind(ctrl));
router.patch('/:id',         canAdmin,          ctrl.update.bind(ctrl));
router.put('/:id',           canAdmin,          ctrl.fullUpdate.bind(ctrl));
router.patch('/:id/anular',  canAdmin,          ctrl.anular.bind(ctrl));

export default router;
