import { Router } from 'express';
import { CajasController } from './cajas.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new CajasController();

/**
 * @openapi
 * /api/v1/cajas:
 *   get:
 *     tags: [Cajas]
 *     summary: Listar cajas registradoras (filtrado por sucursal según rol)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Cajas]
 *     summary: Crear caja (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creada }
 * /api/v1/cajas/{id}:
 *   get:
 *     tags: [Cajas]
 *     summary: Obtener caja por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Caja }
 *   put:
 *     tags: [Cajas]
 *     summary: Actualizar caja (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizada }
 *   delete:
 *     tags: [Cajas]
 *     summary: Eliminar caja (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminada }
 */

router.use(authMiddleware);
/** Lectura: todos los roles autenticados; el servicio limita por sucursal (cajero/soporte ven solo la suya). */
router.get('/',    canAll, ctrl.findAll.bind(ctrl));
router.get('/:id', canAll, ctrl.findById.bind(ctrl));
router.post('/',      canAdmin,          ctrl.create.bind(ctrl));
router.put('/:id',    canAdmin,          ctrl.update.bind(ctrl));
router.delete('/:id', canAdmin,          ctrl.delete.bind(ctrl));

export default router;
