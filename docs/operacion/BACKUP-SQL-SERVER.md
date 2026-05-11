# Backup y restauración — SQL Server

Procedimiento operativo (fuera del código de la aplicación). Completar con nombres reales de servidor, credenciales en gestor seguro y ventanas de mantenimiento.

**Evidencia de drill:** usar la plantilla [`evidence/BACKUP-RESTORE-DRILL-LOG.md`](evidence/BACKUP-RESTORE-DRILL-LOG.md) tras cada restauración de prueba (criterio [PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md](../PLAN-IMPLEMENTACION-SAAS-MULTI-TENANT.md) Fase 4.2).

## 1. Backup completo (recomendado diario)

- Usar **SQL Server Management Studio** o `sqlcmd` / agente programado.
- Tipo: **FULL** sobre la base del POS (ej. `pos_melania`).
- Destino: disco redundante o almacenamiento de objetos (según infraestructura).
- Conservar varias generaciones (p. ej. 7 días diarios + 4 semanales).

## 2. Verificación

- Restaurar periódicamente en un entorno **no productivo** el último backup.
- Comprobar que la app arranca y que migraciones no quedan pendientes de forma inesperada.

## 3. Restauración de emergencia

1. Detener el backend que usa la BD (evitar escrituras).
2. Restaurar la base desde el backup elegido (WITH REPLACE si reemplaza la misma BD).
3. Arrancar el backend y validar login, una venta de prueba en entorno controlado.

## 4. Notas

- Los scripts de migración viven en `apps/backend/src/migrations/`; en restauración de un backup antiguo puede haber que ejecutar migraciones pendientes al arrancar el servidor actualizado.

### Higiene (documentación)

Si editas documentación de forma extensa, desde la raíz del repositorio ejecuta `npm run verify:docs-links` (sin duplicar lo ya indicado en CONTRIBUTING).
