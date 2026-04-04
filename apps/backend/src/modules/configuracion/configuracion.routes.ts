import { Router } from 'express';
import { ConfiguracionController } from './configuracion.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ConfiguracionController();

router.use(authMiddleware);
router.get('/',  canAdminOrSoporte, ctrl.get.bind(ctrl));
router.put('/',  canAdmin,          ctrl.update.bind(ctrl));

export default router;
