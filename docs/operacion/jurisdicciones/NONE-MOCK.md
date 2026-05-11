# Jurisdicción NONE / MOCK (sin comprobante fiscal formal)

Códigos admitidos en `FISCAL_JURISDICTION` o en `configuracion.fiscalJurisdiccion`:

| Valor   | Comportamiento |
|---------|----------------|
| `NONE`  | `NoFiscalProvider`: las ventas con **usarNCF** rechazan con mensaje claro (no NCF). |
| `OFF`   | Igual que `NONE`. |
| `MOCK`  | Igual que `NONE` (alias útil en documentación o entornos donde “mock” indica “sin DGII”). |

No genera números NCF de prueba: para pruebas de flujo fiscal RD use un entorno con `DO` / `DGII_RD` y series de **comprobantes** de sandbox o rangos de prueba según su política.

Implementación: `apps/backend/src/fiscal/no-fiscal.provider.ts`, registro en `resolve-fiscal-provider.ts`.
