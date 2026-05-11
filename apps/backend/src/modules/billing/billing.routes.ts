import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authMiddleware, canAdminOrSoporte } from '../../middlewares/auth.middleware';

const router = Router();
const ctrl = new BillingController();

/**
 * @openapi
 * /api/v1/billing/status:
 *   get:
 *     tags: [Billing]
 *     summary: Estado de facturación (Stripe + vínculo org)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Estado }
 * /api/v1/billing/create-checkout-session:
 *   post:
 *     tags: [Billing]
 *     summary: Crear sesión Stripe Checkout (suscripción)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [successUrl, cancelUrl]
 *             properties:
 *               successUrl: { type: string, format: uri }
 *               cancelUrl: { type: string, format: uri }
 *               planCode: { type: string, enum: [starter, standard, enterprise] }
 *     responses:
 *       200: { description: url de Checkout }
 * /api/v1/billing/create-portal-session:
 *   post:
 *     tags: [Billing]
 *     summary: Sesión del portal de cliente Stripe (tarjeta, facturas, cancelar)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [returnUrl]
 *             properties:
 *               returnUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: url del portal }

 */

router.use(authMiddleware, canAdminOrSoporte);
router.get('/status', ctrl.status.bind(ctrl));
router.post('/create-checkout-session', ctrl.createCheckoutSession.bind(ctrl));
router.post('/create-portal-session', ctrl.createPortalSession.bind(ctrl));

export default router;
