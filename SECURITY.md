# Política de seguridad

## Cómo reportar una vulnerabilidad

Si crees haber encontrado un problema de seguridad en este repositorio o en el software que distribuye, **no abras un issue público** con el detalle del fallo.

Envía un informe **privado** al **contacto de seguridad del responsable del repositorio** (mantenedor del proyecto o equipo de seguridad de la organización que publica el código). Incluye, cuando sea posible:

- Descripción breve del problema y su impacto aparente.
- Pasos para reproducirlo o condiciones observadas (versión, entorno, configuración relevante sin secretos).
- Si ya existe mitigación o parche sugerido, puedes indicarlo sin sustituir el análisis del mantenedor.

## Alcance

Esta política aplica al **código y documentación** de este repositorio (API, frontend, scripts, CI y configuración de ejemplo). **No** forma parte del soporte comercial general: el canal de seguridad es para divulgación responsable de fallos.

## Datos personales en los informes

**No incluyas datos personales identificables (PII)** de terceros, ni credenciales reales, ni muestras de bases de datos con información de clientes. Usa datos sintéticos o descripciones técnicas. Si el reporte contenía por error material sensible, indícalo para que pueda tratarse con cuidado.

En el texto del informe **no pegues secretos** (tokens, claves API, contraseñas, fragmentos de `.env` reales); describe el problema con valores ficticios o referencias genéricas. En PR de solo documentación, no comitees credenciales reales ni ejemplos con secretos recuperables.

## Operación, cierre y evidencia (solo documentación)

Para **go-live**, runbooks y plantillas de evidencia (Stripe, backup, legal, E2E, observabilidad), ver **[`docs/PLAN-CIERRE-PROYECTO.md`](docs/PLAN-CIERRE-PROYECTO.md)** (índice WS1–WS6) y el hub **[`docs/operacion/evidence/README.md`](docs/operacion/evidence/README.md)**. Sigue aplicando esta política: **no** pegar secretos ni PII en issues, PRs ni plantillas de log.

## Contribuciones y buenas prácticas

Para flujo de trabajo, revisiones y checklist antes de un PR, ver **[`CONTRIBUTING.md`](CONTRIBUTING.md)**.

Tras fusionar PRs de Dependabot que puedan tocar **lockfiles** o **herramientas** usadas por los checks (build, lint, tests), ejecuta **`npm run verify`** desde la **raíz del repositorio** para confirmar que todo sigue pasando. En **issues** y **PRs** (títulos, cuerpos y comentarios), **no pegues secretos en vivo** (tokens, claves API, contraseñas, fragmentos reales de `.env`); describe el caso con placeholders o datos ficticios.
