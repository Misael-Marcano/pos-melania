import { Router } from 'express';
import { AuditoriaController } from './auditoria.controller';
import { authMiddleware, canAdmin } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new AuditoriaController();

router.use(authMiddleware, canAdmin);

router.get('/',       ctrl.findAll.bind(ctrl));
router.get('/tablas', ctrl.getTablas.bind(ctrl));

export default router;
