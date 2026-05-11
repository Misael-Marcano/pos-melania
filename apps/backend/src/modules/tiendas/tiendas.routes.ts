import { Router } from 'express';
import { TiendasController } from './tiendas.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new TiendasController();

/**
 * @openapi
 * /api/v1/tiendas:
 *   get:
 *     tags: [Tiendas]
 *     summary: Listar sucursales / tiendas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Tiendas]
 *     summary: Crear tienda (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/tiendas/{id}:
 *   put:
 *     tags: [Tiendas]
 *     summary: Actualizar tienda (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 *   delete:
 *     tags: [Tiendas]
 *     summary: Eliminar tienda (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminada }
 */

router.use(authMiddleware);
router.get('/',       canAdminOrSoporte, ctrl.findAll.bind(ctrl));
router.post('/',      canAdmin,          ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin,          ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin,          ctrl.delete.bind(ctrl));

export default router;
