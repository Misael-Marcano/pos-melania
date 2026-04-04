import { Router } from 'express';
import { InventarioController } from './inventario.controller';
import { authMiddleware, canAdmin, canSell, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new InventarioController();

router.use(authMiddleware);

// Lectura — todos los roles
router.get('/',                    canAll,   ctrl.findAll.bind(ctrl));
router.get('/stock-bajo',          canAdmin, ctrl.getStockBajo.bind(ctrl));
router.get('/categorias',          canAll,   ctrl.getCategorias.bind(ctrl));
router.get('/barcode/:codigo',     canSell,  ctrl.findByBarcode.bind(ctrl));
router.get('/:id',                 canAll,   ctrl.findById.bind(ctrl));
router.get('/:id/movimientos',     canAdmin, ctrl.getMovimientos.bind(ctrl));

// Importación CSV
router.post('/importar-csv',       canAdmin, ctrl.importarCSV.bind(ctrl));

// Escritura — solo admin
router.post('/',                   canAdmin, ctrl.create.bind(ctrl));
router.put('/:id',                 canAdmin, ctrl.update.bind(ctrl));
router.post('/:id/clonar',         canAdmin, ctrl.clone.bind(ctrl));
router.delete('/:id',              canAdmin, ctrl.delete.bind(ctrl));
router.patch('/:id/ajustar',       canAdmin, ctrl.ajustarInventario.bind(ctrl));

// Categorías
router.post('/categorias',         canAdmin, ctrl.createCategoria.bind(ctrl));
router.delete('/categorias/:id',   canAdmin, ctrl.deleteCategoria.bind(ctrl));

export default router;
