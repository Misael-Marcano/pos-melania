'use client';

import { useState } from 'react';
import { useAuditoria, useAuditoriaTablas } from '@/hooks/useAuditoria';
import { IAuditLog, AuditOperacion } from '@pos/shared';
import { Shield, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

const OP_STYLES: Record<AuditOperacion, string> = {
  CREATE: 'bg-primary-100 text-primary-600',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-rose-100 text-rose-700',
};

const OP_LABELS: Record<AuditOperacion, string> = {
  CREATE: 'Creó',
  UPDATE: 'Actualizó',
  DELETE: 'Eliminó',
};

function JsonViewer({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  let parsed: unknown = value;
  try { parsed = JSON.parse(value); } catch { /* raw string */ }
  return (
    <div className="mt-1">
      <p className="text-xs font-semibold text-navy-500 mb-1">{label}</p>
      <pre className="text-xs bg-navy-800 text-primary-200 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap font-mono">
        {typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed)}
      </pre>
    </div>
  );
}

function LogRow({ log }: { log: IAuditLog }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(log.valorAnterior || log.valorNuevo);

  return (
    <>
      <tr
        className={`border-b border-navy-100/60 transition-colors ${hasDetail ? 'cursor-pointer hover:bg-navy-50/60' : 'hover:bg-navy-50/40'}`}
        onClick={() => hasDetail && setOpen((o) => !o)}
      >
        <td className="px-4 py-3 text-xs text-navy-400 whitespace-nowrap font-mono">
          {new Date(log.createdAt).toLocaleString('es-DO')}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${OP_STYLES[log.operacion]}`}>
            {OP_LABELS[log.operacion]}
          </span>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-navy-500 bg-navy-50/50">
          <span className="bg-navy-100 px-2 py-0.5 rounded">{log.tabla}</span>
        </td>
        <td className="px-4 py-3 text-sm text-navy-700 max-w-xs truncate">{log.descripcion}</td>
        <td className="px-4 py-3 text-sm text-navy-500">{log.usuarioNombre ?? '—'}</td>
        <td className="px-4 py-3 text-xs text-navy-400 font-mono">{log.ip ?? '—'}</td>
        <td className="px-4 py-3 text-center w-8">
          {hasDetail && (
            open
              ? <ChevronDown className="w-4 h-4 text-navy-400 mx-auto" />
              : <ChevronRight className="w-4 h-4 text-navy-400 mx-auto" />
          )}
        </td>
      </tr>
      {open && hasDetail && (
        <tr className="bg-navy-50/60">
          <td colSpan={7} className="px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <JsonViewer label="Valor anterior" value={log.valorAnterior} />
              <JsonViewer label="Valor nuevo"    value={log.valorNuevo}    />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditoriaPage() {
  const today   = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0];

  const [page,      setPage]      = useState(1);
  const [tabla,     setTabla]     = useState('');
  const [operacion, setOperacion] = useState('');
  const [desde,     setDesde]     = useState(weekAgo);
  const [hasta,     setHasta]     = useState(today);
  const [search,    setSearch]    = useState('');

  const params = { page, limit: 50, tabla: tabla || undefined, operacion: operacion || undefined, desde, hasta };
  const { data, isLoading } = useAuditoria(params);
  const { data: tablas = [] } = useAuditoriaTablas();

  const logs: IAuditLog[]  = data?.data ?? [];
  const pagination         = data?.pagination;

  const filtered = search
    ? logs.filter((l) =>
        l.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        (l.usuarioNombre ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Auditoría del Sistema"
        breadcrumb={['Panel', 'Auditoría']}
      />

      {/* Filtros */}
      <div className="bg-white rounded-[12px] shadow-card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1.5">Desde</label>
            <input type="date" value={desde}
              onChange={(e) => { setDesde(e.target.value); setPage(1); }}
              className="input-field w-auto" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1.5">Hasta</label>
            <input type="date" value={hasta}
              onChange={(e) => { setHasta(e.target.value); setPage(1); }}
              className="input-field w-auto" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1.5">Tabla</label>
            <select value={tabla}
              onChange={(e) => { setTabla(e.target.value); setPage(1); }}
              className="input-field w-auto">
              <option value="">Todas</option>
              {tablas.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1.5">Operación</label>
            <select value={operacion}
              onChange={(e) => { setOperacion(e.target.value); setPage(1); }}
              className="input-field w-auto">
              <option value="">Todas</option>
              <option value="CREATE">Crear</option>
              <option value="UPDATE">Actualizar</option>
              <option value="DELETE">Eliminar</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-navy-500 mb-1.5">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
              <input
                placeholder="Descripción o usuario…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
            <Shield size={14} className="text-primary-600" />
          </div>
          <span className="font-semibold text-navy-800 text-sm font-display">Registro de actividad</span>
          {pagination && (
            <span className="ml-auto text-xs text-navy-400">{pagination.total} registros</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-navy-50">
              <tr>
                {['Fecha', 'Acción', 'Tabla', 'Descripción', 'Usuario', 'IP', ''].map((h) => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-navy-400 text-sm">Cargando registros…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-navy-400 text-sm">Sin registros para los filtros seleccionados</td></tr>
              )}
              {filtered.map((log) => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 bg-navy-50/50 flex items-center justify-between text-sm text-navy-500">
            <span>Página {pagination.page} de {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="btn-outline py-1 px-3 disabled:opacity-40">
                Anterior
              </button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                className="btn-outline py-1 px-3 disabled:opacity-40">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
