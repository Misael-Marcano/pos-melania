# 🧾 POS Melania Sopa EIRL

Sistema de punto de venta completo para Melania Sopa EIRL — Santiago de los Caballeros, RD.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + TypeScript + Express |
| Base de datos | SQL Server 2019 + TypeORM |
| Cache | Redis |
| Frontend | Next.js 14 + React + Tailwind CSS |
| Estado global | Zustand + React Query |
| Autenticación | JWT (roles: admin, cajero, soporte) |
| Contenedores | Docker + Docker Compose |

## Requisitos

- Node.js 20+
- Docker y Docker Compose
- (Opcional) SQL Server local

## Inicio rápido

```bash
# 1. Clonar y entrar
cd pos-melania

# 2. Variables de entorno
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local

# 3. Levantar todo con Docker
docker-compose up -d

# 4. Migraciones (primera vez)
cd apps/backend
npm install
npm run migration:run

# 5. Seed inicial (admin por defecto)
npm run seed

# Acceso
# Frontend: http://localhost:3000
# API:      http://localhost:4000/api/v1
```

## Credenciales por defecto (seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@pos.com | Admin123! |
| Cajero | cajero@pos.com | Cajero123! |
| Soporte | soporte@wilmaxdigital.com | Soporte123! |

## Roles y permisos

| Módulo | Admin | Cajero | Soporte |
|--------|-------|--------|---------|
| Panel / Dashboard | ✅ | ✅ | ✅ |
| Ventas (POS) | ✅ | ✅ | ❌ |
| Clientes | ✅ | ✅ | ✅ |
| Inventario | ✅ | 👁️ ver | ✅ |
| Gastos | ✅ | ❌ | ✅ |
| Reportes | ✅ | ❌ | ✅ |
| Empleados | ✅ | ❌ | ✅ |
| Configuración | ✅ | ❌ | ✅ |
| Comprobantes NCF | ✅ | ❌ | ✅ |
| Tiendas | ✅ | ❌ | ✅ |

## Estructura del proyecto

```
pos-melania/
├── apps/
│   ├── backend/     # API REST Node.js + TypeScript
│   └── frontend/    # Next.js 14 + React + Tailwind
├── packages/
│   └── shared/      # Tipos compartidos entre backend y frontend
├── docker-compose.yml
└── .env.example
```
