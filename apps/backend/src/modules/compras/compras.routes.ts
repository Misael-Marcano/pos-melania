import { Router } from 'express';
import { ComprasController } from './compras.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ComprasController();

router.use(authMiddleware);

router.get('/',                    canAdminOrSoporte, ctrl.findAll.bind(ctrl));
router.get('/:id',                 canAdminOrSoporte, ctrl.findById.bind(ctrl));
router.post('/',                   canAdmin,          ctrl.create.bind(ctrl));
router.put('/:id',                 canAdmin,          ctrl.update.bind(ctrl));
router.patch('/:id/enviar',        canAdmin,          ctrl.enviar.bind(ctrl));
router.patch('/:id/recibir',       canAdmin,          ctrl.recibir.bind(ctrl));
router.patch('/:id/cancelar',      canAdmin,          ctrl.cancelar.bind(ctrl));

export default router;
