import { Router } from 'express';
import { ComprobantesController } from './comprobantes.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ComprobantesController();

router.use(authMiddleware);

router.get('/',       canAdminOrSoporte,  ctrl.findAll.bind(ctrl));
router.post('/',      canAdmin,           ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin,           ctrl.update.bind(ctrl));

export default router;
