import { Router } from 'express';
import { EmpleadosController } from './empleados.controller';
import { authMiddleware, canAdmin, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new EmpleadosController();

/**
 * @openapi
 * /api/v1/empleados:
 *   get:
 *     tags: [Empleados]
 *     summary: Listar empleados / usuarios
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Empleados]
 *     summary: Crear empleado (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 * /api/v1/empleados/{id}:
 *   get:
 *     tags: [Empleados]
 *     summary: Obtener por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Empleado }
 *   put:
 *     tags: [Empleados]
 *     summary: Actualizar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Empleados]
 *     summary: Eliminar (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminado }
 */

router.use(authMiddleware);

router.get('/',       canAdminOrSoporte,  ctrl.findAll.bind(ctrl));
router.get('/:id',    canAdminOrSoporte,  ctrl.findById.bind(ctrl));
router.post('/',      canAdmin,           ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin,           ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin,           ctrl.delete.bind(ctrl));

export default router;
