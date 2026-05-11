import { Router } from 'express';
import { ProveedoresController } from './proveedores.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ProveedoresController();

/**
 * @openapi
 * /api/v1/proveedores:
 *   get:
 *     tags: [Proveedores]
 *     summary: Listar proveedores
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Proveedores]
 *     summary: Crear proveedor (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 * /api/v1/proveedores/{id}:
 *   get:
 *     tags: [Proveedores]
 *     summary: Obtener por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Proveedor }
 *   put:
 *     tags: [Proveedores]
 *     summary: Actualizar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Proveedores]
 *     summary: Eliminar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminado }
 */

router.use(authMiddleware);

router.get('/',       canAdminOrSoporte, ctrl.findAll.bind(ctrl));
router.get('/:id',    canAdminOrSoporte, ctrl.findById.bind(ctrl));
router.post('/',      canAdmin,          ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin,          ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin,          ctrl.delete.bind(ctrl));

export default router;
