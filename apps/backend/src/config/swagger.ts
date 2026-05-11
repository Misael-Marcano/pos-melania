import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

/** URL pública de la API (para “Try it out” en Swagger UI). */
const serverUrl = process.env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`;

const apis = [
  path.join(__dirname, '../modules/**/*.routes.ts'),
  path.join(__dirname, '../modules/**/*.routes.js'),
];

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: process.env.OPENAPI_TITLE ?? 'POS API',
      version: '1.0.0',
      description:
        process.env.OPENAPI_DESCRIPTION ??
        'API REST del punto de venta. Documentación vía `@openapi` en `*.routes.ts`.',
    },
    servers: [{ url: serverUrl, description: 'Servidor' }],
    tags: [
      { name: 'Sistema', description: 'Salud del servicio' },
      { name: 'Auth', description: 'Login, tokens y perfil' },
      { name: 'Configuración', description: 'Datos del negocio y pie de recibo' },
      { name: 'Tiendas', description: 'Sucursales' },
      { name: 'Cajas', description: 'Cajas registradoras' },
      { name: 'Caja', description: 'Apertura, cierre y resúmenes de caja (ventas)' },
      { name: 'Ventas', description: 'Ventas y POS' },
      { name: 'Clientes', description: 'Cartera y abonos' },
      { name: 'Inventario', description: 'Productos, categorías y stock' },
      { name: 'Compras', description: 'Órdenes a proveedores' },
      { name: 'Cotizaciones', description: 'Cotizaciones y conversión a venta' },
      { name: 'Devoluciones', description: 'Devoluciones y aprobaciones' },
      { name: 'Empleados', description: 'Usuarios del sistema' },
      { name: 'Gastos', description: 'Gastos operativos' },
      { name: 'Kits', description: 'Kits y bundles' },
      { name: 'Promociones', description: 'Descuentos y validación' },
      { name: 'Proveedores', description: 'Proveedores' },
      { name: 'Recetas', description: 'Producción y BOM' },
      { name: 'Reportes', description: 'Reportes y DGII' },
      { name: 'Tarjetas regalo', description: 'Gift cards' },
      { name: 'Comprobantes', description: 'NCF / comprobantes fiscales' },
      { name: 'Auditoría', description: 'Registro de cambios (admin)' },
      { name: 'Tenants', description: 'Organizaciones (rol plataforma)' },
      { name: 'SaaS', description: 'Plan y límites por organización' },
      { name: 'Billing', description: 'Facturación del producto (esqueleto Stripe / estado)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          description: 'Respuesta exitosa estándar (`sendSuccess`)',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { description: 'Carga útil; puede ser null' },
          },
          required: ['success', 'message'],
        },
        ApiError: {
          type: 'object',
          description: 'Error (`sendError`)',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            data: { type: 'null', nullable: true },
          },
          required: ['success', 'message'],
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        ApiPaginated: {
          type: 'object',
          description: 'Lista paginada (`sendPaginated`)',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: {} },
            pagination: { $ref: '#/components/schemas/PaginationMeta' },
          },
          required: ['success', 'data', 'pagination'],
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nombre: { type: 'string' },
            email: { type: 'string', format: 'email' },
            rol: { type: 'string', enum: ['admin', 'cajero', 'soporte', 'plataforma'] },
            tenantId: { type: 'integer', description: 'Organización (multi-tenant)' },
            tiendaId: { type: 'integer', nullable: true },
          },
        },
        TokenPayload: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/AuthUser' },
          },
        },
        LoginResponse: {
          type: 'object',
          description: 'Login exitoso',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { $ref: '#/components/schemas/TokenPayload' },
          },
          required: ['success', 'message', 'data'],
        },
        RefreshTokenData: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        RefreshResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { $ref: '#/components/schemas/RefreshTokenData' },
          },
          required: ['success', 'message', 'data'],
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Health check',
          security: [],
          responses: {
            '200': {
              description: 'Servicio activo',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { status: { type: 'string', example: 'ok' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis,
});
