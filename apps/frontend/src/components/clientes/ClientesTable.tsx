'use client';

import { useState, useEffect } from 'react';
import {
  useClientes, useCrearCliente, useActualizarCliente, useEliminarCliente,
  useEstadoCuenta, useAbonar,
} from '@/hooks/useClientes';
import { ICliente, IMovimientoCredito, TipoIdentificacion } from '@pos/shared';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/toast.store';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import {
  Search, UserPlus, Pencil, Wallet, X, Loader2,
  AlertTriangle, TrendingUp, TrendingDown, ArrowDownCircle, Trash2,
} from 'lucide-react';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCedula(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3)  return d;
  if (d.length <= 10) return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,10)}-${d.slice(10)}`;
}

function formatRNC(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 9);
  if (d.length <= 1)  return d;
  if (d.length <= 3)  return `${d.slice(0,1)}-${d.slice(1)}`;
  if (d.length <= 8)  return `${d.slice(0,1)}-${d.slice(1,3)}-${d.slice(3)}`;
  return `${d.slice(0,1)}-${d.slice(1,3)}-${d.slice(3,8)}-${d.slice(8)}`;
}

function formatTelefono(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3)  return d;
  if (d.length <= 6)  return `${d.slice(0,3)}-${d.slice(3)}`;
  return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
}

function formatIdentificacion(tipo: TipoIdentificacion | '', raw: string): string {
  if (tipo === 'CEDULA')    return formatCedula(raw);
  if (tipo === 'RNC')       return formatRNC(raw);
  return raw.slice(0, 20); // Pasaporte: sin formato estricto
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

const TIPO_ID_LABELS: Record<TipoIdentificacion, string> = {
  CEDULA:    'Cédula',
  RNC:       'RNC',
  PASAPORTE: 'Pasaporte',
};

const TIPO_ID_PLACEHOLDERS: Record<TipoIdentificacion, string> = {
  CEDULA:    '001-1234567-8',
  RNC:       '1-23-45678-9',
  PASAPORTE: 'AB123456',
};

// ── Modal: Estado de cuenta + abono ──────────────────────────────────────────

function EstadoCuentaModal({ cliente, onClose }: { cliente: ICliente; onClose: () => void }) {
  const [monto,     setMonto]     = useState('');
  const [notas,     setNotas]     = useState('');
  const [showAbono, setShowAbono] = useState(false);
  const [error,     setError]     = useState('');

  const { data: cuenta, isLoading } = useEstadoCuenta(cliente.id);
  const abonar = useAbonar();

  const handleAbonar = async () => {
    const n = Number(monto);
    if (!n || n <= 0) { setError('Ingresa un monto válido'); return; }
    if (n > (cuenta?.cliente.saldo ?? 0)) { setError('El monto supera el saldo pendiente'); return; }
    try {
      setError('');
      await abonar.mutateAsync({ id: cliente.id, monto: n, notas: notas || undefined });
      setMonto(''); setNotas(''); setShowAbono(false);
      toast.success('Pago registrado exitosamente');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar pago');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-navy-800">Estado de cuenta</h3>
            <p className="text-xs text-navy-400 mt-0.5">{cliente.nombre}</p>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-navy-400 text-sm py-16">
            <Loader2 size={16} className="animate-spin" /> Cargando...
          </div>
        ) : cuenta ? (
          <>
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-rose-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-rose-400 mb-0.5">Total cargos</p>
                  <p className="text-base font-bold text-rose-600">{formatCurrency(cuenta.totalCargos)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-500 mb-0.5">Total abonos</p>
                  <p className="text-base font-bold text-emerald-600">{formatCurrency(cuenta.totalAbonos)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${cuenta.cliente.saldo > 0 ? 'bg-amber-50' : 'bg-navy-50'}`}>
                  <p className={`text-xs mb-0.5 ${cuenta.cliente.saldo > 0 ? 'text-amber-500' : 'text-navy-400'}`}>Saldo pendiente</p>
                  <p className={`text-base font-bold ${cuenta.cliente.saldo > 0 ? 'text-amber-600' : 'text-navy-500'}`}>
                    {formatCurrency(cuenta.cliente.saldo)}
                  </p>
                </div>
              </div>

              {cuenta.cliente.saldo > 0 && (
                <div className="mt-3">
                  {!showAbono ? (
                    <button onClick={() => setShowAbono(true)}
                      className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2">
                      <ArrowDownCircle size={15} /> Registrar pago
                    </button>
                  ) : (
                    <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/40 space-y-2">
                      <p className="text-xs font-semibold text-emerald-700 mb-2">Registrar abono</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-navy-600 block mb-1">Monto *</label>
                          <input type="number" className="input-field text-sm py-1.5"
                            value={monto} onChange={(e) => setMonto(e.target.value)}
                            min={0.01} step={0.01} max={cuenta.cliente.saldo}
                            placeholder={`Máx. ${formatCurrency(cuenta.cliente.saldo)}`} />
                        </div>
                        <div>
                          <label className="text-xs text-navy-600 block mb-1">Notas</label>
                          <input className="input-field text-sm py-1.5" value={notas}
                            onChange={(e) => setNotas(e.target.value)} placeholder="Referencia..." />
                        </div>
                      </div>
                      {error && (
                        <div className="flex items-center gap-1.5 text-rose-500 text-xs bg-rose-50 rounded px-2 py-1.5">
                          <AlertTriangle size={12} /> {error}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => { setShowAbono(false); setError(''); }}
                          className="btn-outline text-sm py-1.5 flex-1">Cancelar</button>
                        <button onClick={handleAbonar} disabled={abonar.isPending}
                          className="btn-primary text-sm py-1.5 flex-1 flex items-center justify-center gap-1.5">
                          {abonar.isPending ? <Loader2 size={13} className="animate-spin" /> : <ArrowDownCircle size={13} />}
                          {abonar.isPending ? 'Guardando...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-navy-100/40 flex-1 overflow-y-auto">
              {cuenta.movimientos.length === 0 ? (
                <p className="text-center text-navy-400 text-sm py-8">Sin movimientos</p>
              ) : (
                <div className="divide-y divide-navy-50">
                  {cuenta.movimientos.map((m: IMovimientoCredito, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        m.tipo === 'CARGO' ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                        {m.tipo === 'CARGO'
                          ? <TrendingUp size={13} className="text-rose-500" />
                          : <TrendingDown size={13} className="text-emerald-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-700 truncate">{m.notas}</p>
                        <p className="text-xs text-navy-400">
                          {formatDateTime(m.fecha)}{m.creadoPor && ` · ${m.creadoPor}`}
                        </p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${
                        m.tipo === 'CARGO' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {m.tipo === 'CARGO' ? '+' : '−'}{formatCurrency(m.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        <div className="flex justify-end px-5 py-4 border-t border-navy-100/40 flex-shrink-0">
          <button onClick={onClose} className="btn-outline">Cerrar</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Modal: Crear / Editar cliente ─────────────────────────────────────────────

interface FormCliente {
  nombre:               string;
  compania:             string;
  correo:               string;
  telefono:             string;
  tipoIdentificacion:   TipoIdentificacion | '';
  numeroIdentificacion: string;
  limiteCredito:        string;
  descuentoCliente:     string;
}

const EMPTY_FORM: FormCliente = {
  nombre: '', compania: '', correo: '', telefono: '',
  tipoIdentificacion: '', numeroIdentificacion: '',
  limiteCredito: '', descuentoCliente: '',
};

function ClienteModal({ cliente, onClose }: { cliente: ICliente | null; onClose: () => void }) {
  const [form,  setForm]  = useState<FormCliente>(
    cliente ? {
      nombre:               cliente.nombre,
      compania:             cliente.compania             ?? '',
      correo:               cliente.correo               ?? '',
      telefono:             formatTelefono(cliente.telefono ?? ''),
      tipoIdentificacion:   cliente.tipoIdentificacion   ?? '',
      numeroIdentificacion: cliente.numeroIdentificacion ?? '',
      limiteCredito:        cliente.limiteCredito > 0 ? String(cliente.limiteCredito) : '',
      descuentoCliente:     Number(cliente.descuentoCliente) > 0 ? String(cliente.descuentoCliente) : '',
    } : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const crear      = useCrearCliente();
  const actualizar = useActualizarCliente();
  const isPending  = crear.isPending || actualizar.isPending;

  const set = (k: keyof FormCliente, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleTelefono = (v: string) => set('telefono', formatTelefono(v));
  const handleIdNumero = (v: string) =>
    set('numeroIdentificacion', formatIdentificacion(form.tipoIdentificacion, v));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (form.tipoIdentificacion && !form.numeroIdentificacion.trim()) {
      setError('Ingresa el número de identificación'); return;
    }
    if (!form.tipoIdentificacion && form.numeroIdentificacion.trim()) {
      setError('Selecciona el tipo de identificación'); return;
    }
    try {
      setError('');
      const payload = {
        nombre:               form.nombre.trim(),
        compania:             form.compania             || undefined,
        correo:               form.correo               || undefined,
        telefono:             form.telefono             || undefined,
        tipoIdentificacion:   (form.tipoIdentificacion  || undefined) as TipoIdentificacion | undefined,
        numeroIdentificacion: form.numeroIdentificacion || undefined,
        limiteCredito:        form.limiteCredito ? Number(form.limiteCredito) : 0,
        descuentoCliente:     form.descuentoCliente ? Math.min(100, Math.max(0, Number(form.descuentoCliente))) : 0,
      };
      if (cliente) {
        await actualizar.mutateAsync({ id: cliente.id, payload });
        toast.success('Cliente actualizado correctamente');
      } else {
        await crear.mutateAsync(payload);
        toast.success('Cliente creado correctamente');
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40">
          <h3 className="font-semibold text-navy-800">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Nombre *</label>
            <input className="input-field" value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre completo" />
          </div>

          {/* Identificación */}
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Identificación</label>
            <div className="flex gap-2">
              <select
                value={form.tipoIdentificacion}
                onChange={(e) => { set('tipoIdentificacion', e.target.value); set('numeroIdentificacion', ''); }}
                className="input-field w-36 shrink-0"
              >
                <option value="">Tipo</option>
                <option value="CEDULA">Cédula</option>
                <option value="RNC">RNC</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
              <input
                className="input-field flex-1 font-mono"
                value={form.numeroIdentificacion}
                onChange={(e) => handleIdNumero(e.target.value)}
                placeholder={form.tipoIdentificacion
                  ? TIPO_ID_PLACEHOLDERS[form.tipoIdentificacion as TipoIdentificacion]
                  : 'Número'}
                disabled={!form.tipoIdentificacion}
              />
            </div>
          </div>

          {/* Compañía + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Compañía</label>
              <input className="input-field" value={form.compania}
                onChange={(e) => set('compania', e.target.value)} placeholder="Empresa (opcional)" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Teléfono</label>
              <input className="input-field font-mono" value={form.telefono}
                onChange={(e) => handleTelefono(e.target.value)} placeholder="809-000-0000" />
            </div>
          </div>

          {/* Correo */}
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Correo</label>
            <input type="email" className="input-field" value={form.correo}
              onChange={(e) => set('correo', e.target.value)} placeholder="correo@ejemplo.com" />
          </div>

          {/* Límite de crédito + Descuento automático */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">
                Límite de crédito <span className="text-navy-400 font-normal text-xs">(0 = sin límite)</span>
              </label>
              <input type="number" min={0} step={0.01} className="input-field" value={form.limiteCredito}
                onChange={(e) => set('limiteCredito', e.target.value)} placeholder="Ej: 5000.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">
                Descuento automático % <span className="text-navy-400 font-normal text-xs">(POS)</span>
              </label>
              <input type="number" min={0} max={100} step={0.5} className="input-field" value={form.descuentoCliente}
                onChange={(e) => set('descuentoCliente', e.target.value)} placeholder="0" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {isPending ? 'Guardando...' : cliente ? 'Actualizar' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ── Tabla principal ───────────────────────────────────────────────────────────

export function ClientesTable() {
  const user = useAuthStore((s) => s.user);
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [q,      setQ]      = useState('');
  const [modalCliente,  setModalCliente]  = useState<ICliente | null | 'nuevo'>(null);
  const [cuentaCliente, setCuentaCliente] = useState<ICliente | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<ICliente | null>(null);

  const { data, isLoading } = useClientes(page, 20, q);
  const eliminar = useEliminarCliente();

  const clientes   = data?.data ?? [];
  const pagination = data?.pagination;

  const handleEliminar = async (c: ICliente) => {
    try {
      await eliminar.mutateAsync(c.id);
      setConfirmEliminar(null);
      toast.success(`Cliente "${c.nombre}" eliminado`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  return (
    <>
      <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-navy-100/40">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input className="input-field pl-9" placeholder="Buscar por nombre o identificación..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setQ(search); setPage(1); } }} />
          </div>
          <button onClick={() => { setQ(search); setPage(1); }} className="btn-outline">Buscar</button>
          {q && <button onClick={() => { setSearch(''); setQ(''); setPage(1); }}
            className="btn-ghost text-navy-400 text-sm">Limpiar</button>}
          <button onClick={() => setModalCliente('nuevo')}
            className="btn-primary flex items-center gap-2 ml-auto">
            <UserPlus size={15} /> Nuevo Cliente
          </button>
        </div>

        <div className="px-4 py-2.5 bg-navy-50/60 border-b border-navy-100/40 flex items-center gap-2">
          <span className="text-sm font-semibold text-navy-700">Clientes</span>
          <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            {pagination?.total ?? 0}
          </span>
          {pagination && (
            <span className="ml-auto text-xs text-navy-400">Pág {pagination.page} / {pagination.totalPages}</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Nombre</th>
                <th className="table-header hidden md:table-cell">Identificación</th>
                <th className="table-header hidden lg:table-cell">Compañía</th>
                <th className="table-header hidden md:table-cell">Teléfono</th>
                <th className="table-header text-right">Saldo</th>
                <th className="table-header text-right hidden xl:table-cell">Límite crédito</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-navy-400 text-sm">
                  <Loader2 size={16} className="animate-spin mx-auto mb-1" /> Cargando...
                </td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-navy-400 text-sm">
                  No hay clientes{q ? ` para "${q}"` : ''}
                </td></tr>
              ) : (
                clientes.map((c: ICliente) => (
                  <tr key={c.id} className="table-row-hover">
                    <td className="table-cell">
                      <p className="font-medium text-navy-800">{c.nombre}</p>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      {c.tipoIdentificacion && c.numeroIdentificacion ? (
                        <div>
                          <span className="text-[10px] font-semibold text-navy-400 uppercase tracking-wide">
                            {TIPO_ID_LABELS[c.tipoIdentificacion]}
                          </span>
                          <p className="text-sm font-mono text-navy-700">{c.numeroIdentificacion}</p>
                        </div>
                      ) : <span className="text-navy-300 text-sm">—</span>}
                    </td>
                    <td className="table-cell hidden lg:table-cell text-navy-500 text-sm">
                      {c.compania ?? '—'}
                    </td>
                    <td className="table-cell hidden md:table-cell text-navy-500 text-sm font-mono">
                      {c.telefono ?? '—'}
                    </td>
                    <td className="table-cell text-right">
                      {Number(c.saldo) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          {formatCurrency(Number(c.saldo))}
                        </span>
                      ) : (
                        <span className="text-sm text-navy-400">{formatCurrency(0)}</span>
                      )}
                    </td>
                    <td className="table-cell text-right hidden xl:table-cell">
                      {Number(c.limiteCredito) > 0 ? (
                        <span className="text-sm text-navy-600">{formatCurrency(Number(c.limiteCredito))}</span>
                      ) : (
                        <span className="text-xs text-navy-300">Sin límite</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-0.5">
                        {(Number(c.saldo) > 0 || user?.rol === 'admin') && (
                          <button onClick={() => setCuentaCliente(c)} title="Estado de cuenta"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-amber-500 hover:bg-amber-50 transition-colors">
                            <Wallet size={13} />
                          </button>
                        )}
                        <button onClick={() => setModalCliente(c)} title="Editar"
                          className="w-7 h-7 flex items-center justify-center rounded-md text-primary-500 hover:bg-primary-50 transition-colors">
                          <Pencil size={13} />
                        </button>
                        {user?.rol === 'admin' && (
                          <button onClick={() => setConfirmEliminar(c)}
                            disabled={eliminar.isPending} title="Eliminar"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center gap-1.5 p-4 justify-center border-t border-navy-100/40">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-navy-100 text-navy-600 hover:bg-navy-200 disabled:opacity-40 font-medium">← Ant</button>
            {Array.from({ length: Math.min(pagination.totalPages, 8) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 text-xs rounded-lg font-semibold ${p === page ? 'bg-primary-600 text-white' : 'bg-navy-100 text-navy-600 hover:bg-navy-200'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-navy-100 text-navy-600 hover:bg-navy-200 disabled:opacity-40 font-medium">Sig →</button>
          </div>
        )}
      </div>

      {modalCliente !== null && (
        <ClienteModal
          cliente={modalCliente === 'nuevo' ? null : modalCliente}
          onClose={() => setModalCliente(null)}
        />
      )}
      {cuentaCliente && (
        <EstadoCuentaModal cliente={cuentaCliente} onClose={() => setCuentaCliente(null)} />
      )}
      {confirmEliminar && (
        <ModalOverlay onClose={() => setConfirmEliminar(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6">
            <h3 className="font-semibold text-navy-800 mb-2">¿Eliminar cliente?</h3>
            <p className="text-sm text-navy-500 mb-5">
              Se eliminará a <strong>{confirmEliminar.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmEliminar(null)} className="btn-outline">Cancelar</button>
              <button
                onClick={() => handleEliminar(confirmEliminar)}
                disabled={eliminar.isPending}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {eliminar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {eliminar.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
