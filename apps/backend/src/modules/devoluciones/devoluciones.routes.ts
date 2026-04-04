import { Router } from 'express';
import { DevolucionesController } from './devoluciones.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new DevolucionesController();

router.use(authMiddleware);

router.get('/',                          canAdminOrSoporte, ctrl.findAll.bind(ctrl));
router.get('/:id',                       canAdminOrSoporte, ctrl.findById.bind(ctrl));
router.get('/venta/:ventaId',            canAdminOrSoporte, ctrl.findByVenta.bind(ctrl));
router.post('/',                         canAdmin,          ctrl.create.bind(ctrl));
router.patch('/:id/aprobar',             canAdmin,          ctrl.aprobar.bind(ctrl));
router.patch('/:id/rechazar',            canAdmin,          ctrl.rechazar.bind(ctrl));

export default router;
