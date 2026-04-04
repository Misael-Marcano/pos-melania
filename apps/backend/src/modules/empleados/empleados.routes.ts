import { Router } from 'express';
import { EmpleadosController } from './empleados.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new EmpleadosController();

router.use(authMiddleware);

router.get('/',       canAdminOrSoporte,  ctrl.findAll.bind(ctrl));
router.get('/:id',    canAdminOrSoporte,  ctrl.findById.bind(ctrl));
router.post('/',      canAdmin,           ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin,           ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin,           ctrl.delete.bind(ctrl));

export default router;
