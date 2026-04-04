import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorMiddleware } from './middlewares/error.middleware';

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
import configuracionRoutes  from './modules/configuracion/configuracion.routes';
import comprasRoutes        from './modules/compras/compras.routes';
import devolucionesRoutes   from './modules/devoluciones/devoluciones.routes';
import auditoriaRoutes      from './modules/auditoria/auditoria.routes';
import tarjetasRegaloRoutes from './modules/tarjetas-regalo/tarjetas-regalo.routes';
import promocionesRoutes    from './modules/promociones/promociones.routes';
import cotizacionesRoutes   from './modules/cotizaciones/cotizaciones.routes';

const app = express();

// ── Trust proxy (Docker / nginx) ─────────────────────────────────────────────
// Necesario para que express-rate-limit use la IP real del cliente
// en lugar de la IP del contenedor/proxy
app.set('trust proxy', 1);

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
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// API general: 300 requests por minuto por IP
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Límite de peticiones alcanzado' },
  skip: (req) => req.path === '/health',
}));

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(compression());

// Body limit reducido — la API solo recibe JSON con datos de POS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging: en producción usar 'combined' (Apache format sin datos sensibles)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── Rutas API v1 ──────────────────────────────────────────────────────────────
const API = '/api/v1';

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
app.use(`${API}/configuracion`,  configuracionRoutes);
app.use(`${API}/compras`,        comprasRoutes);
app.use(`${API}/devoluciones`,   devolucionesRoutes);
app.use(`${API}/auditoria`,      auditoriaRoutes);
app.use(`${API}/tarjetas-regalo`, tarjetasRegaloRoutes);
app.use(`${API}/promociones`,     promocionesRoutes);
app.use(`${API}/cotizaciones`,    cotizacionesRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ── Error handler global ──────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
