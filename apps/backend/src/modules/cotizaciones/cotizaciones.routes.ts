import { Router } from 'express';
import { CotizacionesController } from './cotizaciones.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new CotizacionesController();

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
