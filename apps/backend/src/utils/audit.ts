import { AppDataSource } from '../config/database';
import { AuditLog, AuditOperacion } from '../entities/AuditLog.entity';

interface AuditOptions {
  tabla:        string;
  operacion:    AuditOperacion;
  registroId?:  number;
  descripcion:  string;
  valorAnterior?: object | null;
  valorNuevo?:    object | null;
  usuarioId?:   number;
  usuarioNombre?: string;
  ip?:          string;
}

export async function registrarAudit(opts: AuditOptions): Promise<void> {
  try {
    const repo = AppDataSource.getRepository(AuditLog);
    const log  = repo.create({
      tabla:         opts.tabla,
      operacion:     opts.operacion,
      registroId:    opts.registroId,
      descripcion:   opts.descripcion,
      valorAnterior: opts.valorAnterior ? JSON.stringify(opts.valorAnterior) : undefined,
      valorNuevo:    opts.valorNuevo    ? JSON.stringify(opts.valorNuevo)    : undefined,
      usuarioId:     opts.usuarioId,
      usuarioNombre: opts.usuarioNombre,
      ip:            opts.ip,
    });
    await repo.save(log);
  } catch {
    // audit must never break the main flow
  }
}
