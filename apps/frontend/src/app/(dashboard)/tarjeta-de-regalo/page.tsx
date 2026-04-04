'use client';

import { useState } from 'react';
import { PageHeader }  from '@/components/layout/PageHeader';
import { Modal }       from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/store/toast.store';
import {
  useTarjetasRegalo, useCrearTarjeta,
  useRecargarTarjeta, useUsarTarjeta, useActualizarTarjeta,
} from '@/hooks/useTarjetasRegalo';
import {
  ITarjetaRegalo, MovimientoTarjeta,
} from '@/services/tarjetas-regalo.service';
import {
  Gift, Plus, Search, RefreshCw, CreditCard,
  CheckCircle, XCircle, Clock, Banknote,
  ArrowUpCircle, ArrowDownCircle, History,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';

// ─── Estado badge ─────────────────────────────────────────────────────────────
const ESTADO_CONFIG = {
  ACTIVA:    { label: 'Activa',    className: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle size={11} /> },
  AGOTADA:   { label: 'Agotada',   className: 'bg-amber-100 text-amber-700',    icon: <Banknote    size={11} /> },
  VENCIDA:   { label: 'Vencida',   className: 'bg-rose-100 text-rose-700',      icon: <Clock       size={11} /> },
  CANCELADA: { label: 'Cancelada', className: 'bg-navy-100 text-navy-500',      icon: <XCircle     size={11} /> },
} as const;

// ─── Card visual ──────────────────────────────────────────────────────────────
const CARD_GRADIENTS = [
  'from-[#273727] to-[#3D4E3D]',
  'from-[#1a2a4a] to-[#2d4a6d]',
  'from-[#3a1a2a] to-[#6d2d4a]',
  'from-[#1a3a2a] to-[#2d6d4a]',
  'from-[#2a2a1a] to-[#4a4a2d]',
];

function gradientForId(id: number) {
  return CARD_GRADIENTS[id % CARD_GRADIENTS.length];
}

function parseMovimientos(json?: string): MovimientoTarjeta[] {
  try { return JSON.parse(json ?? '[]'); } catch { return []; }
}

// ─── GiftCard visual component ────────────────────────────────────────────────
function GiftCardVisual({ tarjeta, onClick }: { tarjeta: ITarjetaRegalo; onClick: () => void }) {
  const cfg = ESTADO_CONFIG[tarjeta.estado];
  const grad = gradientForId(tarjeta.id);
  const pct = tarjeta.saldoInicial > 0
    ? Math.min(100, (Number(tarjeta.saldoActual) / Number(tarjeta.saldoInicial)) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className="group text-left w-full focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-[16px]"
    >
      <div className={`relative bg-gradient-to-br ${grad} rounded-[16px] p-5 text-white overflow-hidden transition-transform group-hover:-translate-y-1 group-hover:shadow-float`}>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-4 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute top-4 right-20 w-10 h-10 rounded-full bg-white/8" />

        {/* Header */}
        <div className="relative flex items-start justify-between mb-6">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
            <Gift size={18} className="text-white" />
          </div>
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.className}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Code */}
        <p className="relative font-mono text-sm tracking-[0.2em] text-white/70 mb-1">
          {tarjeta.codigo}
        </p>

        {/* Balance */}
        <p className="relative text-2xl font-bold tracking-tight mb-4 font-display">
          {formatCurrency(Number(tarjeta.saldoActual))}
        </p>

        {/* Progress bar */}
        <div className="relative">
          <div className="flex justify-between text-[10px] text-white/50 mb-1">
            <span>Saldo usado</span>
            <span>{pct.toFixed(0)}% disponible</span>
          </div>
          <div className="h-1 bg-white/15 rounded-full">
            <div
              className="h-1 bg-white/70 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Expiry */}
        {tarjeta.fechaVencimiento && (
          <p className="relative mt-3 text-[10px] text-white/50">
            Vence: {new Date(tarjeta.fechaVencimiento).toLocaleDateString('es-DO')}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Modal detalle / operaciones ──────────────────────────────────────────────
function TarjetaModal({
  tarjeta, onClose,
}: {
  tarjeta: ITarjetaRegalo;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'info' | 'recargar' | 'usar'>('info');
  const [monto, setMonto]   = useState('');
  const [notas, setNotas]   = useState('');

  const recargar = useRecargarTarjeta();
  const usar     = useUsarTarjeta();
  const actualizar = useActualizarTarjeta();

  const movimientos = parseMovimientos(tarjeta.movimientosJson);
  const cfg = ESTADO_CONFIG[tarjeta.estado];
  const grad = gradientForId(tarjeta.id);
  const canOperate = tarjeta.estado === 'ACTIVA';

  const handleRecargar = async () => {
    const m = parseFloat(monto);
    if (!m || m <= 0) return;
    try {
      await recargar.mutateAsync({ id: tarjeta.id, payload: { monto: m, notas: notas || undefined } });
      toast.success('Tarjeta recargada correctamente');
      setMonto(''); setNotas('');
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al recargar');
    }
  };

  const handleUsar = async () => {
    const m = parseFloat(monto);
    if (!m || m <= 0) return;
    try {
      await usar.mutateAsync({ id: tarjeta.id, payload: { monto: m, notas: notas || undefined } });
      toast.success('Pago con tarjeta procesado');
      setMonto(''); setNotas('');
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al procesar pago');
    }
  };

  const handleCancelar = async () => {
    if (!confirm('¿Cancelar esta tarjeta? Esta acción no se puede deshacer.')) return;
    try {
      await actualizar.mutateAsync({ id: tarjeta.id, payload: { estado: 'CANCELADA' } });
      toast.success('Tarjeta cancelada');
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const isPending = recargar.isPending || usar.isPending;

  return (
    <Modal open onClose={onClose} title="Tarjeta de Regalo" size="lg">
      <div className="space-y-4">
        {/* Mini card preview */}
        <div className={`bg-gradient-to-br ${grad} rounded-[12px] p-4 text-white flex items-center gap-4`}>
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <Gift size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs tracking-widest text-white/60">{tarjeta.codigo}</p>
            <p className="text-2xl font-bold font-display">{formatCurrency(Number(tarjeta.saldoActual))}</p>
          </div>
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.className}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-navy-50 rounded-xl p-1">
          {([
            ['info',     'Información', <History size={13} />],
            ['recargar', 'Recargar',    <ArrowUpCircle size={13} />],
            ['usar',     'Usar / Cobrar', <ArrowDownCircle size={13} />],
          ] as const).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              disabled={id !== 'info' && !canOperate}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                tab === id ? 'bg-white shadow-sm text-navy-800' : 'text-navy-400 hover:text-navy-600'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── INFO ── */}
        {tab === 'info' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-navy-50 rounded-xl p-3">
                <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">Saldo inicial</p>
                <p className="text-base font-bold text-navy-800">{formatCurrency(Number(tarjeta.saldoInicial))}</p>
              </div>
              <div className="bg-navy-50 rounded-xl p-3">
                <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">Saldo actual</p>
                <p className="text-base font-bold text-primary-600">{formatCurrency(Number(tarjeta.saldoActual))}</p>
              </div>
              {tarjeta.fechaVencimiento && (
                <div className="bg-navy-50 rounded-xl p-3">
                  <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">Vencimiento</p>
                  <p className="text-sm font-semibold text-navy-700">
                    {new Date(tarjeta.fechaVencimiento).toLocaleDateString('es-DO')}
                  </p>
                </div>
              )}
              <div className="bg-navy-50 rounded-xl p-3">
                <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">Creada</p>
                <p className="text-sm font-semibold text-navy-700">
                  {new Date(tarjeta.createdAt).toLocaleDateString('es-DO')}
                </p>
              </div>
            </div>

            {tarjeta.notas && (
              <div className="bg-navy-50 rounded-xl p-3">
                <p className="text-[10px] text-navy-400 uppercase tracking-wider mb-1">Notas</p>
                <p className="text-sm text-navy-700">{tarjeta.notas}</p>
              </div>
            )}

            {/* Movimientos */}
            <div>
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">Historial</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {movimientos.length === 0 && (
                  <p className="text-xs text-navy-400 text-center py-4">Sin movimientos</p>
                )}
                {[...movimientos].reverse().map((m, i) => {
                  const isPositive = m.tipo === 'CREACION' || m.tipo === 'RECARGA';
                  return (
                    <div key={i} className="flex items-center gap-3 bg-navy-50 rounded-lg px-3 py-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-100' : 'bg-rose-100'
                      }`}>
                        {isPositive
                          ? <ArrowUpCircle size={14} className="text-emerald-600" />
                          : <ArrowDownCircle size={14} className="text-rose-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-navy-700 capitalize">{m.tipo.toLowerCase()}</p>
                        {m.notas && <p className="text-[10px] text-navy-400 truncate">{m.notas}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {isPositive ? '+' : '-'}{formatCurrency(m.monto)}
                        </p>
                        <p className="text-[10px] text-navy-400">
                          {new Date(m.fecha).toLocaleDateString('es-DO')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {tarjeta.estado === 'ACTIVA' && (
              <button
                onClick={handleCancelar}
                disabled={actualizar.isPending}
                className="w-full text-xs text-rose-500 hover:text-rose-700 py-2 transition-colors border border-rose-200 rounded-xl hover:bg-rose-50"
              >
                Cancelar tarjeta
              </button>
            )}
          </div>
        )}

        {/* ── RECARGAR ── */}
        {tab === 'recargar' && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600 mb-0.5">Saldo actual</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(Number(tarjeta.saldoActual))}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-navy-500 block mb-1.5">Monto a recargar</label>
              <input
                type="number" min={1} step={0.01}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="input-field text-2xl font-bold text-center"
                placeholder="0.00"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                {[500, 1000, 2000, 5000].map((v) => (
                  <button key={v} onClick={() => setMonto(String(v))}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                      monto === String(v) ? 'bg-primary-500 text-white border-primary-500' : 'bg-navy-50 text-navy-500 border-transparent hover:bg-navy-100'
                    }`}
                  >
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-navy-500 block mb-1.5">Notas (opcional)</label>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
                className="input-field text-sm resize-none" placeholder="Observaciones..." />
            </div>
            <button
              onClick={handleRecargar}
              disabled={isPending || !monto || Number(monto) <= 0}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary-600 to-primary-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 text-sm"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
              Recargar {monto ? formatCurrency(Number(monto)) : ''}
            </button>
          </div>
        )}

        {/* ── USAR ── */}
        {tab === 'usar' && (
          <div className="space-y-3">
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 text-center">
              <p className="text-xs text-primary-600 mb-0.5">Disponible para cobrar</p>
              <p className="text-2xl font-bold text-primary-700">{formatCurrency(Number(tarjeta.saldoActual))}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-navy-500 block mb-1.5">Monto a cobrar</label>
              <input
                type="number" min={0.01} step={0.01} max={Number(tarjeta.saldoActual)}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="input-field text-2xl font-bold text-center"
                placeholder="0.00"
                autoFocus
              />
              <button
                onClick={() => setMonto(String(tarjeta.saldoActual))}
                className="mt-2 w-full text-xs py-1.5 border-2 border-emerald-400 text-emerald-700 rounded-lg hover:bg-emerald-50 font-semibold transition-colors"
              >
                Usar saldo completo
              </button>
            </div>
            {monto && Number(monto) > 0 && Number(monto) <= Number(tarjeta.saldoActual) && (
              <div className="bg-navy-50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-navy-400 mb-0.5">Saldo restante tras cobro</p>
                <p className="text-lg font-bold text-navy-700">
                  {formatCurrency(Number(tarjeta.saldoActual) - Number(monto))}
                </p>
              </div>
            )}
            {monto && Number(monto) > Number(tarjeta.saldoActual) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-xs text-red-500">Monto superior al saldo disponible</p>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-navy-500 block mb-1.5">Notas (opcional)</label>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
                className="input-field text-sm resize-none" placeholder="Nº de venta u observación..." />
            </div>
            <button
              onClick={handleUsar}
              disabled={isPending || !monto || Number(monto) <= 0 || Number(monto) > Number(tarjeta.saldoActual)}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 text-sm transition-colors"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Confirmar cobro {monto ? formatCurrency(Number(monto)) : ''}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Modal crear ──────────────────────────────────────────────────────────────
function CrearModal({ onClose }: { onClose: () => void }) {
  const [saldo, setSaldo]             = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [notas, setNotas]             = useState('');
  const crear = useCrearTarjeta();

  const handleCrear = async () => {
    const s = parseFloat(saldo);
    if (!s || s <= 0) return;
    try {
      await crear.mutateAsync({
        saldoInicial:     s,
        fechaVencimiento: vencimiento || undefined,
        notas:            notas || undefined,
      });
      toast.success('Tarjeta de regalo creada');
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear tarjeta');
    }
  };

  return (
    <Modal open onClose={onClose} title="Nueva Tarjeta de Regalo" size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button
            onClick={handleCrear}
            disabled={crear.isPending || !saldo || Number(saldo) <= 0}
            className="btn-primary flex items-center gap-2"
          >
            {crear.isPending ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />}
            Crear tarjeta
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Preview */}
        <div className="bg-gradient-to-br from-[#273727] to-[#3D4E3D] rounded-[12px] p-4 text-white text-center">
          <Gift size={24} className="mx-auto mb-2 opacity-60" />
          <p className="font-mono text-xs tracking-widest text-white/50 mb-1">GC-XXXX-XXXX</p>
          <p className="text-2xl font-bold font-display">
            {saldo ? formatCurrency(Number(saldo)) : 'RD$ —'}
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-navy-500 block mb-1.5">Saldo inicial *</label>
          <input
            type="number" min={1} step={0.01}
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            className="input-field text-xl font-bold text-center"
            placeholder="0.00"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            {[500, 1000, 2000, 5000].map((v) => (
              <button key={v} onClick={() => setSaldo(String(v))}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                  saldo === String(v) ? 'bg-primary-500 text-white border-primary-500' : 'bg-navy-50 text-navy-500 border-transparent hover:bg-navy-100'
                }`}
              >
                {formatCurrency(v)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-navy-500 block mb-1.5">Fecha de vencimiento (opcional)</label>
          <input
            type="date"
            value={vencimiento}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setVencimiento(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-navy-500 block mb-1.5">Notas (opcional)</label>
          <textarea
            rows={2} value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="input-field text-sm resize-none"
            placeholder="Para quién es, ocasión especial, etc."
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TarjetaRegaloPage() {
  const [page, setPage]           = useState(1);
  const [q, setQ]                 = useState('');
  const [estado, setEstado]       = useState('');
  const [seleccionada, setSeleccionada] = useState<ITarjetaRegalo | null>(null);
  const [showCrear, setShowCrear] = useState(false);

  const { data, isLoading } = useTarjetasRegalo(page, 12, q, estado);
  const tarjetas = data?.data ?? [];
  const total    = data?.total ?? 0;
  const totalPgs = Math.ceil(total / 12);

  // Stats
  const activas  = tarjetas.filter((t) => t.estado === 'ACTIVA').length;
  const saldoTotal = tarjetas
    .filter((t) => t.estado === 'ACTIVA')
    .reduce((s, t) => s + Number(t.saldoActual), 0);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Tarjetas de Regalo"
          breadcrumb={['Inicio', 'Tarjetas de Regalo']}
          actions={
            <button onClick={() => setShowCrear(true)} className="btn-primary flex items-center gap-2">
              <Plus size={15} /> Nueva Tarjeta
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-[12px] shadow-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
              <Gift size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-[10px] text-navy-400 uppercase tracking-wider">Total tarjetas</p>
              <p className="text-xl font-bold text-navy-800">{total}</p>
            </div>
          </div>
          <div className="bg-white rounded-[12px] shadow-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-navy-400 uppercase tracking-wider">Activas</p>
              <p className="text-xl font-bold text-navy-800">{activas}</p>
            </div>
          </div>
          <div className="bg-white rounded-[12px] shadow-card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-navy-400 uppercase tracking-wider">En circulación</p>
              <p className="text-base sm:text-xl font-bold text-navy-800 truncate">{formatCurrency(saldoTotal)}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Buscar por código…"
              className="input-field pl-8 w-full font-mono"
            />
          </div>
          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            className="input-field sm:w-44"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVA">Activas</option>
            <option value="AGOTADA">Agotadas</option>
            <option value="VENCIDA">Vencidas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>

        {/* Grid de tarjetas */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary-500" />
          </div>
        ) : tarjetas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gift size={28} className="text-navy-300" />
            </div>
            <p className="text-navy-400 font-semibold">No hay tarjetas de regalo</p>
            <p className="text-navy-300 text-sm mt-1">Crea la primera con el botón de arriba</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tarjetas.map((t) => (
              <GiftCardVisual key={t.id} tarjeta={t} onClick={() => setSeleccionada(t)} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPgs > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-navy-400">
              {total} tarjeta{total !== 1 ? 's' : ''} · Página {page} de {totalPgs}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="btn-outline px-3 py-2 disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPgs} className="btn-outline px-3 py-2 disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCrear    && <CrearModal   onClose={() => setShowCrear(false)} />}
      {seleccionada && <TarjetaModal tarjeta={seleccionada} onClose={() => setSeleccionada(null)} />}
    </>
  );
}
