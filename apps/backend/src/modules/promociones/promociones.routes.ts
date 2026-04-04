import { Router } from 'express';
import { PromocionesController } from './promociones.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new PromocionesController();

router.use(authMiddleware);

router.get('/',           canAll,   ctrl.findAll.bind(ctrl));
router.get('/:id',        canAll,   ctrl.findById.bind(ctrl));
router.post('/validar',   canAll,   ctrl.validar.bind(ctrl));
router.post('/',          canAdmin, ctrl.create.bind(ctrl));
router.put('/:id',        canAdmin, ctrl.update.bind(ctrl));
router.delete('/:id',     canAdmin, ctrl.delete.bind(ctrl));

export default router;
