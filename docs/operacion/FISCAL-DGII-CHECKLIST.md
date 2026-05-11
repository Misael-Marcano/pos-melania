# Checklist fiscal — NCF y DGII (República Dominicana)

Índice por jurisdicción (futuras): [`docs/operacion/jurisdicciones/README.md`](jurisdicciones/README.md) · ancla RD: [`docs/operacion/jurisdicciones/DO-DGII.md`](jurisdicciones/DO-DGII.md).

Guía operativa para validar el uso de comprobantes fiscales en el POS **antes** de producción o tras cambios en series, RNC o normativa. No sustituye asesoría contable ni la documentación oficial de la DGII.

## Datos de empresa en el sistema

- [ ] **RNC** de la empresa coincide con el registrado ante DGII.
- [ ] **Nombre comercial / razón social** en configuración coincide con lo declarado.
- [ ] **Dirección y teléfono** son los que figuran en documentación oficial si aplica.

## Series y rangos (NCF)

- [ ] Cada **tipo de comprobante** (B, etc.) tiene **serie y rango** (`desde` / `hasta`) alineados con la **autorización** vigente.
- [ ] La **secuencia actual** no salta números fuera del rango autorizado.
- [ ] Hay procedimiento para **agotar un rango** y **abrir uno nuevo** (nueva fila en comprobantes + cierre del anterior si aplica).

## Ventas y NCF

- [ ] Las ventas que requieren NCF lo reciben según reglas del negocio (tipo de cliente, monto, etc.).
- [ ] El **NCF impreso / en recibo** coincide con el almacenado en la venta.
- [ ] **Anulaciones** (si el flujo las permite) quedan registradas y no reutilizan NCF de forma incorrecta.

## Auditoría y trazabilidad

- [x] Cambios en **series fiscales** (crear / editar comprobantes) quedan en **auditoría** con usuario y momento.
- [ ] Cada **impresión o reimpresión de recibo** de venta queda registrada (operación READ en auditoría; el POS llama al guardar/imprimir).
- [ ] Revisión periódica de **reportes de ventas** vs. caja y vs. expectativa fiscal.

## Impuestos en recibo

- [ ] Desglose **ITBIS** (base + tasa) es coherente con la política de precios del negocio (incluido vs. más ITBIS).
- [ ] Totales del ticket coinciden con **subtotal, descuentos y total** de la venta.

## Contingencia

- [ ] Plan si el sistema no está disponible: uso de comprobantes **manuales** autorizados, registro posterior y conciliación.
- [ ] **Backups** de base de datos según `docs/operacion/BACKUP-SQL-SERVER.md`.

---

*Actualizar este checklist cuando la DGII publique cambios en formatos, rangos o obligaciones de e-CF.*
