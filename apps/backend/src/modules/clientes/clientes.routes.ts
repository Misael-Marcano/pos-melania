import { Router } from 'express';
import { ClientesController } from './clientes.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ClientesController();

router.use(authMiddleware);

router.get('/',                     ctrl.findAll.bind(ctrl));
router.get('/con-saldo',            ctrl.getConSaldo.bind(ctrl));
router.get('/:id',                  ctrl.findById.bind(ctrl));
router.get('/:id/historial',        ctrl.getHistorial.bind(ctrl));
router.get('/:id/estado-cuenta',    ctrl.getEstadoCuenta.bind(ctrl));
router.post('/',                    canAll,   ctrl.create.bind(ctrl));
router.post('/:id/abonar',          canAdmin, ctrl.registrarAbono.bind(ctrl));
router.put('/:id',                  canAll,   ctrl.update.bind(ctrl));
router.delete('/:id',               canAdmin, ctrl.delete.bind(ctrl));

export default router;
