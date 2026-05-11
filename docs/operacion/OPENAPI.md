# OpenAPI / Swagger (export local)

El spec se genera desde la configuración Swagger del backend (`apps/backend/src/config/swagger.ts` y anotaciones JSDoc en rutas/controladores). **No versionamos** el JSON generado en el repo por defecto (evita diffs masivos y merge noise); si más adelante se adopta un proceso de release con artefacto fijado en git, se puede cambiar esa política y añadir comprobación en CI.

Antes de cambiar mucha documentación en `docs/`, ejecuta desde la raíz del repo `npm run verify:docs-links` para detectar enlaces rotos. Convenciones y el comprobador de enlaces: [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Cuándo ejecutar

- Tras cambios en rutas públicas, DTOs documentados o metadatos OpenAPI que quieras compartir con integradores o con herramientas (Postman, codegen).
- Antes de publicar documentación externa que cite el contrato HTTP.

## Comando

Desde `apps/backend`:

```powershell
npm run openapi:export
```

Salida: `apps/backend/openapi/openapi.json` (el directorio se crea si no existe).

## Swagger en vivo

En desarrollo, la UI suele exponerse con el servidor (ruta típica `/api-docs` o la configurada en `app.ts`); el export es una **instantánea estática** útil para diffs locales o adjuntos, no sustituye la UI interactiva.
