## Resumen

<!-- Qué cambia y por qué (1–3 frases). -->

## Checklist

- **Cierre / go-live (Stripe live, evidencia, WS1–WS6):** [`docs/PLAN-CIERRE-PROYECTO.md`](../docs/PLAN-CIERRE-PROYECTO.md) — ejecución humana y checklist; no declarar operativo cerrado sin artefactos acordados.
- **Índice de apoyo:** sección *Índice — documentación de apoyo* en el mismo plan + hub [`docs/operacion/evidence/README.md`](../docs/operacion/evidence/README.md).
- [ ] Tests relevantes pasan (unit / integración / e2e según el cambio). Si falla **integración** en CI o en local: [`docs/operacion/INTEGRATION-TESTS-LOCAL.md`](../docs/operacion/INTEGRATION-TESTS-LOCAL.md).
- [ ] Fallos locales (PowerShell, Docker, DB, enlaces en docs) → `docs/operacion/TROUBLESHOOTING-DEV.md`.
- [ ] No se commitean secretos ni `.env` con datos reales.
- [ ] Si toqué textos o límites de la landing de planes: `npm run verify:landing-plans` en **exit 0**.
- [ ] Si toqué `apps/frontend/src/app/page.tsx` o `apps/backend/src/saas/plan-limits.ts`: `npm run verify` en **exit 0**.
- [ ] Si toqué `docs/**/*.md`: `npm run verify:docs-links` en local en **exit 0**.
  Checker en `scripts/check-docs-links.mjs`.
- [ ] Si cambié rutas o contratos públicos: export / revisión OpenAPI según [`docs/operacion/OPENAPI.md`](../docs/operacion/OPENAPI.md).
- [ ] Revisé [`CONTRIBUTING.md`](../CONTRIBUTING.md) (checklist de PR y evidencia operativa).
