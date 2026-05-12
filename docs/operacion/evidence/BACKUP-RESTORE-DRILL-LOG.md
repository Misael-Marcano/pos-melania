# Registro — drill de restore SQL Server

**Referencia:** `docs/operacion/BACKUP-SQL-SERVER.md`

## Checklist previa al drill (antes de la ventana)

No sustituye los pasos técnicos del runbook; sirve para alinear responsables y evitar restores ad hoc.

- [ ] Ventana acordada con ops y, si aplica, ingeniería para validar la aplicación tras el restore.
- [ ] Backup de origen identificado (archivo, copia o política) acorde al entorno (se recomienda **staging** para la primera corrida documentada).
- [ ] Nombre de la base de datos de destino acordado; confirmar que no se sobrescribe producción sin procedimiento explícito aprobado.
- [ ] Credenciales y permisos revisados solo en consola segura o gestor de secretos (nunca en git ni tickets públicos).
- [ ] Plan de abort o rollback si el restore falla (contacto de guardia, snapshot previo si la política lo exige).
- [ ] Si la política interna lo pide, copiar esta plantilla bajo `docs/operacion/evidence/` según [README](README.md) antes de rellenar fechas y resultados.

| Campo | Valor |
|-------|--------|
| Fecha del drill | YYYY-MM-DD |
| Responsable | |
| Entorno (staging / prod / otro) | |
| Backup origen (archivo o ruta) | |
| Base restaurada (nombre) | |
| Resultado | OK / Falló (notas) |
| Tiempo total (aprox.) | |

## Pasos ejecutados

1. …
2. …

## Notas / incidencias

…
