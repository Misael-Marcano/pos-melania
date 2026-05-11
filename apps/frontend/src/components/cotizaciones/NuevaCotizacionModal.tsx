'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Plus, Trash2, Search } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { inventarioService } from '@/services/inventario.service';
import { clientesService } from '@/services/clientes.service';
import { useCrearCotizacion } from '@/hooks/useCotizaciones';
import { IArticulo, ICliente } from '@pos/shared';
import { formatCurrency } from '@/lib/utils';
import { CreateCotizacionPayload } from '@/services/cotizaciones.service';

type Linea = {
  articuloId:     number;
  cantidad:       number;
  precioUnitario: number;
  descuento:      number;
  articulo?:      IArticulo;
};

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function NuevaCotizacionModal({ open, onClose }: Props) {
  const crear = useCrearCotizacion();

  const [clienteId, setClienteId]   = useState<number | ''>('');
  const [validezDias, setValidez]   = useState('30');
  const [notas, setNotas]           = useState('');
  const [descuentoGlobal, setDescG] = useState('0');
  const [lineas, setLineas]         = useState<Linea[]>([]);

  const [qArt, setQArt]       = useState('');
  const [debouncedArt, setDA] = useState('');
  const [qCli, setQCli]       = useState('');
  const [debouncedCli, setDC] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDA(qArt), 300);
    return () => clearTimeout(t);
  }, [qArt]);

  useEffect(() => {
    const t = setTimeout(() => setDC(qCli), 300);
    return () => clearTimeout(t);
  }, [qCli]);

  const { data: arts } = useQuery({
    queryKey:  ['inv-pick', debouncedArt],
    queryFn:   () => inventarioService.getAll(1, 15, debouncedArt),
    enabled:   open && debouncedArt.length >= 1,
  });

  const { data: clis } = useQuery({
    queryKey:  ['cli-pick', debouncedCli],
    queryFn:   () => clientesService.getAll(1, 10, debouncedCli),
    enabled:   open && debouncedCli.length >= 1,
  });

  const artRows = arts?.data ?? [];
  const cliRows = clis?.data ?? [];

  const subtotal = useMemo(() => {
    let s = 0;
    for (const L of lineas) {
      s += L.precioUnitario * L.cantidad * (1 - (L.descuento || 0) / 100);
    }
    return s;
  }, [lineas]);

  const total = subtotal * (1 - (Number(descuentoGlobal) || 0) / 100);

  const addLinea = (a: IArticulo) => {
    if (lineas.some((l) => l.articuloId === a.id)) return;
    setLineas((prev) => [
      ...prev,
      {
        articuloId:     a.id,
        cantidad:       1,
        precioUnitario: Number(a.precioVenta ?? 0),
        descuento:      0,
        articulo:       a,
      },
    ]);
    setQArt('');
  };

  const setLine = (i: number, patch: Partial<Linea>) => {
    setLineas((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  };

  const removeLine = (i: number) => setLineas((prev) => prev.filter((_, j) => j !== i));

  const handleSubmit = async () => {
    if (lineas.length === 0) return;
    const payload: CreateCotizacionPayload = {
      clienteId:   clienteId === '' ? undefined : Number(clienteId),
      validezDias: Number(validezDias) || 30,
      notas:       notas.trim() || undefined,
      descuento:   Number(descuentoGlobal) || 0,
      detalles:    lineas.map((l) => ({
        articuloId:     l.articuloId,
        cantidad:       Math.max(1, Math.floor(l.cantidad)),
        precioUnitario: l.precioUnitario,
        descuento:      l.descuento || 0,
      })),
    };
    await crear.mutateAsync(payload);
    setClienteId('');
    setValidez('30');
    setNotas('');
    setDescG('0');
    setLineas([]);
    onClose();
  };

  if (!open) return null;

  return (
    <ModalOverlay
      onClose={onClose}
    >
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/50">
          <h3 className="font-semibold text-navy-800 font-display">Nueva cotización</h3>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div>
            <label className="text-xs font-medium text-navy-600">Cliente (opcional)</label>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                className="input-field pl-9"
                placeholder="Buscar por nombre…"
                value={qCli}
                onChange={(e) => setQCli(e.target.value)}
              />
            </div>
            {cliRows.length > 0 && qCli.length >= 1 && (
              <ul className="mt-1 rounded-lg border border-navy-100/80 bg-white max-h-36 overflow-y-auto shadow-ambient">
                {cliRows.map((c: ICliente) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-navy-50"
                      onClick={() => { setClienteId(c.id); setQCli(c.nombre); }}
                    >
                      {c.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-navy-600">Validez (días)</label>
              <input
                className="input-field mt-1"
                value={validezDias}
                onChange={(e) => setValidez(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-navy-600">Desc. global %</label>
              <input
                className="input-field mt-1"
                value={descuentoGlobal}
                onChange={(e) => setDescG(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">Notas</label>
            <textarea
              className="input-field mt-1 resize-none min-h-[64px]"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={500}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">Artículos</label>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                className="input-field pl-9"
                placeholder="Buscar artículo para agregar…"
                value={qArt}
                onChange={(e) => setQArt(e.target.value)}
              />
            </div>
            {artRows.length > 0 && qArt.length >= 1 && (
              <ul className="mt-1 rounded-lg border border-navy-100/80 bg-white max-h-40 overflow-y-auto shadow-ambient">
                {artRows.map((a: IArticulo) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-navy-50 flex justify-between gap-2"
                      onClick={() => addLinea(a)}
                    >
                      <span className="truncate">{a.nombre}</span>
                      <span className="shrink-0 text-navy-400">{formatCurrency(Number(a.precioVenta))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-navy-50/80 p-3 space-y-2">
            {lineas.length === 0 ? (
              <p className="text-xs text-navy-400 text-center py-4">Agrega al menos un artículo.</p>
            ) : (
              lineas.map((L, i) => (
                <div key={`${L.articuloId}-${i}`} className="flex flex-wrap items-end gap-2 pb-2 border-b border-navy-100/50 last:border-0">
                  <div className="flex-1 min-w-[120px]">
                    <p className="text-xs text-navy-500 truncate">{L.articulo?.nombre ?? `ID ${L.articuloId}`}</p>
                    <div className="flex gap-1 mt-1">
                      <input
                        className="input-field w-16 py-1.5 text-xs"
                        title="Cantidad"
                        value={L.cantidad}
                        onChange={(e) => setLine(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                      />
                      <input
                        className="input-field flex-1 min-w-[72px] py-1.5 text-xs"
                        title="Precio unit."
                        value={L.precioUnitario}
                        onChange={(e) => setLine(i, { precioUnitario: Number(e.target.value) || 0 })}
                      />
                      <input
                        className="input-field w-14 py-1.5 text-xs"
                        title="% desc."
                        value={L.descuento}
                        onChange={(e) => setLine(i, { descuento: Number(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <button type="button" className="text-rose-500 p-1.5" onClick={() => removeLine(i)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between text-sm pt-1">
            <span className="text-navy-500">Subtotal</span>
            <span className="font-semibold text-navy-800">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">Total</span>
            <span className="font-bold text-navy-900">{formatCurrency(total)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-outline text-sm" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="btn-primary text-sm inline-flex items-center gap-2"
              disabled={lineas.length === 0 || crear.isPending}
              onClick={() => handleSubmit()}
            >
              {crear.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Crear borrador
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
