import { Router } from 'express';
import { TarjetasRegaloController } from './tarjetas-regalo.controller';
import { authMiddleware, canAdmin, canSell } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new TarjetasRegaloController();

router.use(authMiddleware);

router.get('/',                     canSell,  ctrl.findAll.bind(ctrl));
router.get('/codigo/:codigo',       canSell,  ctrl.findByCodigo.bind(ctrl));
router.get('/:id',                  canSell,  ctrl.findById.bind(ctrl));
router.post('/',                    canSell,  ctrl.create.bind(ctrl));
router.post('/:id/recargar',        canSell,  ctrl.recargar.bind(ctrl));
router.post('/:id/usar',            canSell,  ctrl.usar.bind(ctrl));
router.put('/:id',                  canSell,  ctrl.update.bind(ctrl));
router.delete('/:id',               canAdmin,          ctrl.delete.bind(ctrl));

export default router;
