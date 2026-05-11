import 'reflect-metadata';
import express, { Request } from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorMiddleware } from './middlewares/error.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { billingGuard } from './middlewares/billing-guard.middleware';

// Routes
import authRoutes           from './modules/auth/auth.routes';
import clientesRoutes       from './modules/clientes/clientes.routes';
import inventarioRoutes     from './modules/inventario/inventario.routes';
import ventasRoutes         from './modules/ventas/ventas.routes';
import gastosRoutes         from './modules/gastos/gastos.routes';
import empleadosRoutes      from './modules/empleados/empleados.routes';
import comprobantesRoutes   from './modules/comprobantes/comprobantes.routes';
import kitsRoutes           from './modules/kits/kits.routes';
import proveedoresRoutes    from './modules/proveedores/proveedores.routes';
import reportesRoutes       from './modules/reportes/reportes.routes';
import tiendasRoutes        from './modules/tiendas/tiendas.routes';
import cajasRoutes          from './modules/cajas/cajas.routes';
import configuracionRoutes  from './modules/configuracion/configuracion.routes';
import comprasRoutes        from './modules/compras/compras.routes';
import devolucionesRoutes   from './modules/devoluciones/devoluciones.routes';
import auditoriaRoutes      from './modules/auditoria/auditoria.routes';
import tarjetasRegaloRoutes from './modules/tarjetas-regalo/tarjetas-regalo.routes';
import promocionesRoutes    from './modules/promociones/promociones.routes';
import cotizacionesRoutes   from './modules/cotizaciones/cotizaciones.routes';
import recetasRoutes        from './modules/recetas/recetas.routes';
import tenantsRoutes        from './modules/tenants/tenants.routes';
import saasRoutes           from './modules/saas/saas.routes';
import billingRoutes        from './modules/billing/billing.routes';
import internalRoutes       from './modules/internal/internal.routes';
import { billingWebhookHandler } from './modules/billing/billing.webhook';
import { swaggerSpec } from './config/swagger';

const app = express();

/** Prefijo API v1 (también usado antes de express.json para el webhook Stripe). */
const API = '/api/v1';

const swaggerEnabled =
  process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';

// ── Trust proxy (Docker / nginx) ─────────────────────────────────────────────
// Necesario para que express-rate-limit use la IP real del cliente
// en lugar de la IP del contenedor/proxy
app.set('trust proxy', 1);

app.use(requestIdMiddleware);

// ── Seguridad — Helmet ───────────────────────────────────────────────────────
app.use(helmet({
  // Evita que el browser detecte el MIME tipo incorrecto
  noSniff: true,
  // No cachear respuestas con info sensible
  dnsPrefetchControl: { allow: false },
  // Ocultar que el servidor es Express
  hidePoweredBy: true,
  // Previene clickjacking
  frameguard: { action: 'deny' },
  // Fuerza HTTPS en producción
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
  // Deshabilitar CSP aquí — la API solo devuelve JSON, no HTML
  contentSecurityPolicy: false,
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Tenant-Id', 'X-Tenant-Slug'],
  exposedHeaders: ['X-Request-Id'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Login: muy estricto — 10 intentos cada 15 minutos
app.use('/api/v1/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos, intenta más tarde' },
}));

// Refresh token: 30 por 15 minutos
app.use('/api/v1/auth/refresh', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde' },
}));

// Reportes: agregaciones pesadas — más estricto que el API general
app.use('/api/v1/reportes', rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas consultas a reportes, intenta en un minuto' },
}));

// API general: 300 requests por minuto por IP
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Límite de peticiones alcanzado' },
  skip: (req) => {
    const pathOnly = req.originalUrl.split('?')[0];
    if (pathOnly === '/health') return true;
    if (pathOnly === `${API}/billing/webhook` || pathOnly.endsWith('/billing/webhook')) return true;
    return false;
  },
}));

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(compression());

// Stripe webhook: cuerpo **raw** para verificar firma (no usar express.json aquí)
app.post(
  `${API}/billing/webhook`,
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    void billingWebhookHandler(req, res).catch(next);
  },
);

// Body limit reducido — la API solo recibe JSON con datos de POS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// PDF cierre de caja (generación server-side) — límite aparte
const pdfCierreLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas descargas de PDF de cierre, intenta en un minuto' },
});
app.use((req, res, next) => {
  const pathOnly = req.originalUrl.split('?')[0];
  if (req.method === 'GET' && /\/api\/v1\/ventas\/caja\/\d+\/pdf$/.test(pathOnly)) {
    return pdfCierreLimiter(req, res, next);
  }
  next();
});

// Logging — incluye request ID para correlación
if (process.env.NODE_ENV !== 'test') {
  morgan.token('req-id', (req: Request) => req.requestId ?? '-');
  app.use(
    morgan(
      process.env.NODE_ENV === 'production'
        ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :req-id'
        : ':method :url :status :response-time ms :req-id'
    )
  );
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── OpenAPI (Swagger UI) — desactivar en producción salvo SWAGGER_ENABLED=true ─
if (swaggerEnabled) {
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ── Billing guard (bloqueo por impago, opt-in con BILLING_ENFORCE_PAYMENT=true) ─
app.use(billingGuard);

// ── Rutas API v1 ──────────────────────────────────────────────────────────────
app.use(`${API}/auth`,           authRoutes);
app.use(`${API}/clientes`,       clientesRoutes);
app.use(`${API}/inventario`,     inventarioRoutes);
app.use(`${API}/ventas`,         ventasRoutes);
app.use(`${API}/gastos`,         gastosRoutes);
app.use(`${API}/empleados`,      empleadosRoutes);
app.use(`${API}/comprobantes`,   comprobantesRoutes);
app.use(`${API}/kits`,           kitsRoutes);
app.use(`${API}/proveedores`,    proveedoresRoutes);
app.use(`${API}/reportes`,       reportesRoutes);
app.use(`${API}/tiendas`,        tiendasRoutes);
app.use(`${API}/cajas`,          cajasRoutes);
app.use(`${API}/configuracion`,  configuracionRoutes);
app.use(`${API}/compras`,        comprasRoutes);
app.use(`${API}/devoluciones`,   devolucionesRoutes);
app.use(`${API}/auditoria`,      auditoriaRoutes);
app.use(`${API}/tarjetas-regalo`, tarjetasRegaloRoutes);
app.use(`${API}/promociones`,     promocionesRoutes);
app.use(`${API}/cotizaciones`,    cotizacionesRoutes);
app.use(`${API}/recetas`,         recetasRoutes);
app.use(`${API}/tenants`,         tenantsRoutes);
app.use(`${API}/saas`,            saasRoutes);
app.use(`${API}/billing`,         billingRoutes);
app.use(`${API}/internal`,        internalRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ── Error handler global ──────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
