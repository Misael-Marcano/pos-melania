# Checklist — reconciliación de caja

Uso recomendado al **cerrar turno** o cuando haya dudas entre POS, pantalla de cierres y PDF.

## Antes de cerrar

1. **Sesión correcta**: el POS muestra la misma caja / sucursal que la operación real.
2. **Ventas anuladas**: revisar que las anulaciones del día figuren como tales y no entren en totales de ventas válidas.
3. **Pagos mixtos**: el resumen “por método real” puede diferir del “método principal” de la factura; ambos son coherentes si se entiende ese criterio.

## Al cerrar

4. **Efectivo esperado** = apertura + ventas en efectivo − gastos atribuibles al período (según reglas del sistema).
5. **Conteo físico**: completar denominaciones; la **diferencia** debe explicarse (redondeo, error de caja, etc.).
6. **Notas del cierre**: usar el campo si hubo incidencias (para auditoría y PDF).

## Después del cierre

7. **PDF**: descargar y archivar; comprobar fechas de apertura/cierre y totales.
8. **Auditoría**: en *Administración → Auditoría* deberían registrarse cierre y exportación del PDF (tabla `caja_aperturas`).

## Si algo no cuadra

- Repetir resumen desde **Ventas → Cierres de caja** (mismo período que la sesión cerrada).
- No reabrir sesión sin procedimiento acordado; en su lugar documentar en notas y escalar.
