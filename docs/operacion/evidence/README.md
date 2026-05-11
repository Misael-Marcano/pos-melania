# Evidencia operativa (no versionar secretos)

Carpeta para **artefactos de validación** (Stripe, backups, E2E) que el equipo genera en máquinas locales o CI. Es el **hub de evidencias** enlazado desde el plan de cierre (`docs/PLAN-CIERRE-PROYECTO.md`).

**Higiene (documentación):** Tras ediciones en bloque de `docs/`, ejecutar desde la raíz del repositorio `npm run verify:docs-links`.

## Runbooks relacionados (no sustituyen las plantillas)

- Checklist Stripe producción / pre-live: [`docs/operacion/STRIPE-PROD-CHECKLIST.md`](../STRIPE-PROD-CHECKLIST.md)
- Backup y política de restore: [`docs/operacion/BACKUP-SQL-SERVER.md`](../BACKUP-SQL-SERVER.md)

## Uso

1. **No subir** claves, JWT ni capturas con datos reales de clientes a git si el repo es público. En repos privados, valorar política interna.
2. Copiar aquí (o adjuntar al ticket) salidas de scripts, por ejemplo:
   - `scripts/ops/pre-go-live.ps1` con `-SaveReport`
   - Export CSV de `stripe_audit_logs` tras pruebas
3. Para checklist Stripe: seguir [`STRIPE-PROD-CHECKLIST.md`](../STRIPE-PROD-CHECKLIST.md) y rellenar la plantilla **[`STRIPE-VALIDATION-LOG.md`](STRIPE-VALIDATION-LOG.md)** en esta misma carpeta (copia local).
4. Para drill de restore: seguir [`BACKUP-SQL-SERVER.md`](../BACKUP-SQL-SERVER.md) y documentar en **[`BACKUP-RESTORE-DRILL-LOG.md`](BACKUP-RESTORE-DRILL-LOG.md)**.

## Plantillas

Al editar estas plantillas markdown, en la raíz del repo: `npm run verify:docs-links`; si fallan enlaces, `node scripts/check-docs-links.mjs --verbose`.

| Archivo | Propósito |
|---------|-----------|
| [STRIPE-VALIDATION-LOG.md](STRIPE-VALIDATION-LOG.md) | Registro de pruebas modo test / pre-live |
| [BACKUP-RESTORE-DRILL-LOG.md](BACKUP-RESTORE-DRILL-LOG.md) | Evidencia de restore SQL |

## Recordatorio operativo (Semana 3+)

Tras **Semana 1** y **Semana 2** del cierre (`docs/PLAN-CIERRE-PROYECTO.md`), mantener cadencia: actualizar [STRIPE-VALIDATION-LOG.md](STRIPE-VALIDATION-LOG.md) tras cambios live relevantes; repetir o programar ventanas de restore según política y [BACKUP-RESTORE-DRILL-LOG.md](BACKUP-RESTORE-DRILL-LOG.md); archivar resultados E2E/CI en tickets internos si no van a git.
