import { Router } from 'express';
import { ClientesController } from './clientes.controller';
import { authMiddleware, canAdmin, canAll } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl   = new ClientesController();

/**
 * @openapi
 * /api/v1/clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 *   post:
 *     tags: [Clientes]
 *     summary: Crear cliente
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Creado }
 * /api/v1/clientes/con-saldo:
 *   get:
 *     tags: [Clientes]
 *     summary: Clientes con saldo / cuenta por cobrar
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista }
 * /api/v1/clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Obtener cliente por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente }
 *       404: { description: No encontrado }
 *   put:
 *     tags: [Clientes]
 *     summary: Actualizar cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Actualizado }
 *   delete:
 *     tags: [Clientes]
 *     summary: Eliminar cliente (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Eliminado }
 * /api/v1/clientes/{id}/historial:
 *   get:
 *     tags: [Clientes]
 *     summary: Historial del cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Historial }
 * /api/v1/clientes/{id}/estado-cuenta:
 *   get:
 *     tags: [Clientes]
 *     summary: Estado de cuenta
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Estado de cuenta }
 * /api/v1/clientes/{id}/abonar:
 *   post:
 *     tags: [Clientes]
 *     summary: Registrar abono (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Abono registrado }
 */

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
