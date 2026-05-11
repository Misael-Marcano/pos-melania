# Operación por jurisdicción fiscal

Cada despliegue suele responder a **un solo régimen** a la vez (`FISCAL_JURISDICTION` / `configuracion.fiscalJurisdiccion` y el `FiscalProvider` correspondiente en el backend).

Este directorio agrupa **puntos de entrada y plantillas** por país o régimen. El contenido detallado de República Dominicana (DGII) sigue viviendo en un único checklist canónico para no duplicar listas de verificación en dos sitios.

| Código / carpeta | Régimen | Checklist operativo | Implementación en código |
|------------------|---------|----------------------|---------------------------|
| [DO — DGII](DO-DGII.md) | República Dominicana (NCF, ITBIS) | Enlace al checklist canónico | `DgiiRdFiscalProvider` (`apps/backend/src/fiscal/`) |
| [NONE / MOCK](NONE-MOCK.md) | Sin NCF (retail fuera de RD o ticket interno) | — | `NoFiscalProvider` (`NONE`, `OFF`, `MOCK` → mismo proveedor) |
| (futuro) | Añadir fila + carpeta | Copiar [plantilla](_PLANTILLA-NUEVA-JURISDICCION.md) | Nuevo `FiscalProvider` + registro en `resolveFiscalProvider` |

## Añadir una nueva jurisdicción

1. Implementar un `FiscalProvider` y registrarlo en `resolve-fiscal-provider.ts`.
2. Documentar variables de entorno y columnas de BD relevantes en `.env.example` y en `docs/PLAN-EVOLUCION-POS-GENERICO.md` si aplica.
3. Crear aquí un archivo corto `XX-NOMBRE.md` que enlace al checklist detallado (o al documento canónico si prefieres un solo archivo largo en `docs/operacion/`).
4. Completar la plantilla `_PLANTILLA-NUEVA-JURISDICCION.md` como borrador operativo y revisarlo con asesoría local.
