import { Router } from 'express';
import { RecetasController } from './recetas.controller';
import {
  authMiddleware,
  canAdminOrSoporte,
  canAll,
  canSell,
} from '../../middlewares/auth.middleware';

const router  = Router();
const ctrl    = new RecetasController();

/**
 * @openapi
 * /api/v1/recetas:
 *   get:
 *     tags: [Recetas]
 *     summary: Listar recetas / BOM
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Recetas]
 *     summary: Crear receta (admin/soporte)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/recetas/{id}:
 *   get:
 *     tags: [Recetas]
 *     summary: Detalle de receta
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Receta }
 *   put:
 *     tags: [Recetas]
 *     summary: Actualizar receta (admin/soporte)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 *   delete:
 *     tags: [Recetas]
 *     summary: Eliminar receta (admin/soporte)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminada }
 * /api/v1/recetas/{id}/producir:
 *   post:
 *     tags: [Recetas]
 *     summary: Registrar producción (descuenta insumos, genera producto terminado)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Producción registrada }
 */

router.use(authMiddleware);

router.get('/', ctrl.findAll.bind(ctrl));
router.get('/:id', canAll, ctrl.findById.bind(ctrl));
router.post('/', canAdminOrSoporte, ctrl.create.bind(ctrl));
router.put('/:id', canAdminOrSoporte, ctrl.update.bind(ctrl));
router.delete('/:id', canAdminOrSoporte, ctrl.delete.bind(ctrl));
router.post('/:id/producir', canSell, ctrl.producir.bind(ctrl));

export default router;
