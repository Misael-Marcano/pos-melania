import { Router } from 'express';
import { GastosController } from './gastos.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new GastosController();

router.use(authMiddleware);

router.get('/',       canAdminOrSoporte,  ctrl.findAll.bind(ctrl));
router.get('/:id',    canAdminOrSoporte,  ctrl.findById.bind(ctrl));
router.post('/',      canAdminOrSoporte,  ctrl.create.bind(ctrl));
router.put('/:id',    canAdminOrSoporte,  ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin,           ctrl.delete.bind(ctrl));

export default router;
