'use client';

import { useState, useRef } from 'react';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeCamera } from '@/components/common/BarcodeCamera';
import { AjustarInventarioModal } from '@/components/inventario/AjustarInventarioModal';
import { ArticuloForm } from '@/components/inventario/ArticuloForm';
import { inventarioService } from '@/services/inventario.service';
import { IArticulo, IMovimientoInventario } from '@pos/shared';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import {
  Camera, Search, ScanLine, Pencil, Sliders, ArrowLeft,
  ArrowUp, ArrowDown, Package, AlertTriangle, Loader2,
} from 'lucide-react';
import { toast } from '@/store/toast.store';

const TIPO_LABEL: Record<IMovimientoInventario['tipo'], string> = {
  VENTA:          'Venta',
  DEVOLUCION:     'Devolución',
  AJUSTE:         'Ajuste',
  COMPRA:         'Compra',
  ENTRADA_MANUAL: 'Entrada manual',
  SALIDA_MANUAL:  'Salida manual',
};

const TIPO_COLOR: Record<IMovimientoInventario['tipo'], string> = {
  VENTA:          'bg-red-100 text-red-700',
  DEVOLUCION:     'bg-emerald-100 text-emerald-700',
  AJUSTE:         'bg-blue-100 text-blue-700',
  COMPRA:         'bg-purple-100 text-purple-700',
  ENTRADA_MANUAL: 'bg-emerald-100 text-emerald-700',
  SALIDA_MANUAL:  'bg-amber-100 text-amber-700',
};

export default function BuscarPage() {
  const [inputCode,    setInputCode]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [articulo,     setArticulo]     = useState<IArticulo | null>(null);
  const [movimientos,  setMovimientos]  = useState<IMovimientoInventario[]>([]);
  const [showCamera,   setShowCamera]   = useState(false);
  const [ajustarOpen,  setAjustarOpen]  = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [scanFlash,    setScanFlash]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const anyModalOpen = ajustarOpen || editOpen || showCamera;

  const buscarPorCodigo = async (codigo: string) => {
    if (!codigo.trim()) return;
    setLoading(true);
    setArticulo(null);
    setMovimientos([]);
    try {
      const art = await inventarioService.getByBarcode(codigo.trim());
      setArticulo(art);
      // Cargar últimos 10 movimientos
      const mov = await inventarioService.getMovimientos(art.id, 1, 10);
      setMovimientos(mov.data ?? []);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 400);
    } catch {
      toast.error(`No se encontró artículo con código "${codigo.trim()}"`);
    } finally {
      setLoading(false);
    }
  };

  // Scanner físico activo cuando no hay modales abiertos
  useBarcodeScanner(async (codigo) => {
    setInputCode(codigo);
    await buscarPorCodigo(codigo);
  }, { disabled: anyModalOpen });

  const handleCameraDetect = async (codigo: string) => {
    setShowCamera(false);
    setInputCode(codigo);
    await buscarPorCodigo(codigo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    buscarPorCodigo(inputCode);
  };

  const handleAjustarClose = () => {
    setAjustarOpen(false);
    // Recargar datos del artículo para mostrar stock actualizado
    if (articulo) buscarPorCodigo(articulo.codigoBarras ?? '');
  };

  const stockBajo = articulo?.cantidad !== null &&
    articulo?.cantidad !== undefined &&
    articulo.cantidad <= 10;

  return (
    <>
      <main aria-labelledby="inventario-buscar-heading" className="max-w-2xl mx-auto space-y-5">
        <h1 id="inventario-buscar-heading" className="sr-only">
          Búsqueda Rápida
        </h1>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/inventario"
          className="p-2 rounded-lg hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
            <ScanLine size={20} className="text-primary-500" />
            Búsqueda Rápida
          </h2>
          <p className="text-sm text-navy-400">Escanea o escribe un código de barras</p>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className={`relative flex-1 transition-all duration-300 ${
          scanFlash ? 'ring-2 ring-emerald-400 rounded-xl' : ''
        }`}>
          <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            ref={inputRef}
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Código de barras..."
            className="input-field pl-9 pr-4 w-full text-sm font-mono"
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          className="btn-outline px-3"
          title="Usar cámara"
        >
          <Camera size={16} />
        </button>
        <button type="submit" disabled={loading || !inputCode.trim()} className="btn-primary flex items-center gap-2 px-4">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </form>

      {/* Resultado */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-navy-400">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm">Buscando artículo...</p>
          </div>
        </div>
      )}

      {!loading && articulo && (
        <div className="space-y-4">
          {/* Ficha del artículo */}
          <div className={`bg-white rounded-[12px] shadow-card p-5 space-y-4 transition-all duration-300 ${
            scanFlash ? 'ring-2 ring-emerald-400' : ''
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-navy-400 font-mono mb-1">{articulo.codigoBarras}</p>
                <h2 className="text-lg font-bold text-navy-900 leading-tight">{articulo.nombre}</h2>
                {articulo.categoria?.nombre && (
                  <span className="badge-orange mt-1 inline-block">{articulo.categoria.nombre}</span>
                )}
              </div>
              <div className="shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                  stockBajo
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {stockBajo && <AlertTriangle size={13} />}
                  <Package size={13} />
                  {articulo.cantidad !== null && articulo.cantidad !== undefined
                    ? articulo.cantidad.toLocaleString()
                    : '—'}
                  {articulo.unidadMedida?.trim() ? ` ${articulo.unidadMedida.trim()}` : ''}
                </div>
              </div>
            </div>

            {/* Grid de datos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-navy-50 rounded-lg p-3">
                <p className="text-xs text-navy-400 mb-0.5">Precio de venta</p>
                <p className="text-lg font-bold text-navy-900">{formatCurrency(articulo.precioVenta)}</p>
              </div>
              <div className="bg-navy-50 rounded-lg p-3">
                <p className="text-xs text-navy-400 mb-0.5">Costo</p>
                <p className="text-lg font-bold text-navy-700">{formatCurrency(articulo.costo)}</p>
              </div>
              {articulo.tamanio && (
                <div className="bg-navy-50 rounded-lg p-3">
                  <p className="text-xs text-navy-400 mb-0.5">Tamaño</p>
                  <p className="text-sm font-semibold text-navy-700">{articulo.tamanio}</p>
                </div>
              )}
              {articulo.unidadMedida?.trim() && (
                <div className="bg-navy-50 rounded-lg p-3">
                  <p className="text-xs text-navy-400 mb-0.5">Unidad</p>
                  <p className="text-sm font-semibold text-navy-700">{articulo.unidadMedida.trim()}</p>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAjustarOpen(true)}
                className="btn-primary flex items-center gap-2 flex-1 justify-center"
              >
                <Sliders size={15} />
                Ajustar Inventario
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="btn-outline flex items-center gap-2 flex-1 justify-center"
              >
                <Pencil size={15} />
                Editar
              </button>
            </div>
          </div>

          {/* Historial de movimientos */}
          <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-navy-100/40 flex items-center justify-between">
              <h3 className="font-semibold text-navy-800 text-sm">Últimos movimientos</h3>
              <span className="text-xs text-navy-400">{movimientos.length} registros</span>
            </div>

            {movimientos.length === 0 ? (
              <p className="text-center text-navy-400 text-sm py-8">Sin movimientos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-100/40 text-left">
                      <th className="px-4 py-2.5 text-navy-500 font-medium text-xs">Fecha</th>
                      <th className="px-4 py-2.5 text-navy-500 font-medium text-xs">Tipo</th>
                      <th className="px-4 py-2.5 text-navy-500 font-medium text-xs text-right">Cantidad</th>
                      <th className="px-4 py-2.5 text-navy-500 font-medium text-xs text-right">Stock</th>
                      <th className="px-4 py-2.5 text-navy-500 font-medium text-xs">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-navy-50/40">
                        <td className="px-4 py-2.5 text-navy-500 text-xs whitespace-nowrap">
                          {format(new Date(m.createdAt), 'dd MMM yy HH:mm', { locale: es })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[m.tipo]}`}>
                            {TIPO_LABEL[m.tipo]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`flex items-center justify-end gap-1 font-semibold text-sm ${
                            m.cantidad >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {m.cantidad >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            {Math.abs(m.cantidad)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-navy-700 font-semibold text-sm">
                          {m.stockDespues}
                        </td>
                        <td className="px-4 py-2.5 text-navy-400 text-xs">{m.usuario?.nombre ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estado vacío inicial */}
      {!loading && !articulo && (
        <div className="flex flex-col items-center justify-center py-20 text-navy-400">
          <ScanLine size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium">Escanea o escribe un código de barras</p>
          <p className="text-xs mt-1 opacity-70">El scanner físico funciona sin hacer clic en nada</p>
        </div>
      )}
      </main>

      {/* Modales */}
      {showCamera && (
        <BarcodeCamera
          onDetect={handleCameraDetect}
          onClose={() => setShowCamera(false)}
        />
      )}

      <AjustarInventarioModal
        open={ajustarOpen}
        onClose={handleAjustarClose}
        articulo={articulo}
      />

      <ArticuloForm
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          if (articulo) buscarPorCodigo(articulo.codigoBarras ?? '');
        }}
        articulo={articulo}
      />
    </>
  );
}
