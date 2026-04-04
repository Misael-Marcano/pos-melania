import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new AuthController();

// Públicas
router.post('/login',    ctrl.login.bind(ctrl));
router.post('/refresh',  ctrl.refresh.bind(ctrl));

// Requieren auth
router.post('/logout',          authMiddleware, ctrl.logout.bind(ctrl));
router.get('/profile',          authMiddleware, ctrl.profile.bind(ctrl));
router.post('/change-password', authMiddleware, ctrl.changePassword.bind(ctrl));

export default router;
