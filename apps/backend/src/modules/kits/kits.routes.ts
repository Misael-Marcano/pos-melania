import { Router } from 'express';
import { KitsController } from './kits.controller';
import { authMiddleware, canAdmin } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new KitsController();

router.use(authMiddleware);

router.get('/',       ctrl.findAll.bind(ctrl));
router.get('/:id',    ctrl.findById.bind(ctrl));
router.post('/',      canAdmin, ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin, ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin, ctrl.delete.bind(ctrl));

export default router;
