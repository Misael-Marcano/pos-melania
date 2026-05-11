import { Router } from 'express';
import { InventarioController } from './inventario.controller';
import { authMiddleware, canAdmin, canSell, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new InventarioController();

/**
 * @openapi
 * /api/v1/inventario:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar productos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Inventario]
 *     summary: Crear producto (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 * /api/v1/inventario/stock-bajo:
 *   get:
 *     tags: [Inventario]
 *     summary: Productos bajo stock mínimo (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 * /api/v1/inventario/categorias:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar categorías
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Inventario]
 *     summary: Crear categoría (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/inventario/categorias/{id}:
 *   delete:
 *     tags: [Inventario]
 *     summary: Eliminar categoría (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminada }
 * /api/v1/inventario/barcode/{codigo}:
 *   get:
 *     tags: [Inventario]
 *     summary: Buscar por código de barras (venta)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: codigo, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Producto }
 * /api/v1/inventario/importar-csv:
 *   post:
 *     tags: [Inventario]
 *     summary: Importar inventario desde CSV (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Importación }
 * /api/v1/inventario/{id}:
 *   get:
 *     tags: [Inventario]
 *     summary: Obtener producto por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Producto }
 *   put:
 *     tags: [Inventario]
 *     summary: Actualizar producto (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Inventario]
 *     summary: Eliminar producto (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminado }
 * /api/v1/inventario/{id}/movimientos:
 *   get:
 *     tags: [Inventario]
 *     summary: Movimientos de stock (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Movimientos }
 * /api/v1/inventario/{id}/clonar:
 *   post:
 *     tags: [Inventario]
 *     summary: Clonar producto (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       201: { description: Clon }
 * /api/v1/inventario/{id}/ajustar:
 *   patch:
 *     tags: [Inventario]
 *     summary: Ajuste manual de inventario (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Ajustado }
 */

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
