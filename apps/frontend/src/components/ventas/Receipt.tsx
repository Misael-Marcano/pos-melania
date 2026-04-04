'use client';

import { useEffect } from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { IVenta } from '@pos/shared';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { Printer, X, MessageCircle } from 'lucide-react';

interface Props {
  venta:      IVenta;
  onClose:    () => void;
  autoPrint?: boolean;
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:      'Efectivo',
  TARJETA:       'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CREDITO:       'Crédito',
};

export function Receipt({ venta, onClose, autoPrint = false }: Props) {
  const { data: cfg } = useConfiguracion();

  const empresa = {
    nombre:    cfg?.nombreCompania ?? 'Mi Empresa',
    rnc:       cfg?.rnc ?? '',
    direccion: cfg?.direccion ?? '',
    telefono:  cfg?.telefono ?? '',
  };

  // ITBIS incluido en el precio (18% — estándar RD)
  // Los precios en RD generalmente ya incluyen ITBIS
  const baseImponible = (venta.total / 1.18);
  const itbis         = venta.total - baseImponible;

  const numeroFactura = `F-${String(venta.id).padStart(6, '0')}`;

  const whatsappMsg = () => {
    const items = (venta.detalles ?? [])
      .map((d: any) => `  • ${d.articulo?.nombre ?? 'Artículo'} x${d.cantidad} — ${formatCurrency(d.total)}`)
      .join('\n');
    const msg = `*${empresa.nombre}*\nFactura: ${numeroFactura}${venta.comprobante ? `\nNCF: ${venta.comprobante}` : ''}\n\n${items}\n\n*Total: ${formatCurrency(venta.total)}*\n\nGracias por su compra.`;
    const tel = (venta as any).cliente?.telefono?.replace(/\D/g, '') ?? '';
    const base = tel ? `https://wa.me/1${tel}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(msg)}`;
  };

  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 450);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <>
      {/* ── Overlay (solo en pantalla, no imprime) ── */}
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:hidden">
        <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm flex flex-col max-h-[90vh]">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div>
              <p className="font-semibold text-gray-700 text-sm">Comprobante de Venta</p>
              <p className="text-xs text-gray-400">
                {numeroFactura}
                {venta.comprobante ? ` · NCF: ${venta.comprobante}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={whatsappMsg()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Printer size={13} /> Imprimir
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Preview del recibo (scroll) */}
          <div className="overflow-y-auto flex-1 p-1">
            <ReceiptContent
              empresa={empresa}
              venta={venta}
              numeroFactura={numeroFactura}
              baseImponible={baseImponible}
              itbis={itbis}
            />
          </div>
        </div>
      </div>

      {/* ── Versión imprimible — posición fija, visible solo al imprimir ── */}
      <div id="receipt-print" className="hidden print:block">
        <ReceiptContent
          empresa={empresa}
          venta={venta}
          numeroFactura={numeroFactura}
          baseImponible={baseImponible}
          itbis={itbis}
        />
      </div>

      <style jsx global>{`
        @media print {
          /* Ocultar TODO usando visibility para que el DOM no colapse */
          body * {
            visibility: hidden !important;
          }
          /* Mostrar solo el recibo imprimible */
          #receipt-print,
          #receipt-print * {
            visibility: visible !important;
          }
          #receipt-print {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            padding: 6mm !important;
            font-size: 10pt !important;
            background: white !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </>
  );
}

// ─── Contenido del recibo (reutilizado en preview e impresión) ────────────────
interface ContentProps {
  empresa:       { nombre: string; rnc: string; direccion: string; telefono: string };
  venta:         IVenta;
  numeroFactura: string;
  baseImponible: number;
  itbis:         number;
}

function ReceiptContent({ empresa, venta, numeroFactura, baseImponible, itbis }: ContentProps) {
  return (
    <div className="font-mono text-xs px-4 py-4 w-full max-w-[80mm] mx-auto">

      {/* Encabezado */}
      <div className="text-center mb-3">
        <p className="font-bold text-sm uppercase tracking-wide">{empresa.nombre}</p>
        {empresa.rnc      && <p>RNC: {empresa.rnc}</p>}
        {empresa.direccion && <p>{empresa.direccion}</p>}
        {empresa.telefono  && <p>Tel: {empresa.telefono}</p>}
      </div>

      <Separator />

      {/* Número de factura */}
      <div className="text-center my-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">Factura No.</p>
        <p className="font-bold text-base">{numeroFactura}</p>
        {venta.comprobante && (
          <div className="border border-dashed border-gray-400 rounded px-2 py-1 mt-1 inline-block">
            <p className="text-[10px] uppercase tracking-widest text-gray-500">NCF</p>
            <p className="font-bold tracking-wider">{venta.comprobante}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Info de la venta */}
      <div className="space-y-0.5 mb-2">
        <Row label="Fecha"   value={formatDateTime(venta.fecha)} />
        <Row label="Método"  value={METODO_LABEL[venta.metodoPago] ?? venta.metodoPago} />
        {venta.cliente && (
          <>
            <Row label="Cliente" value={venta.cliente.nombre} />
            {venta.cliente.tipoIdentificacion && venta.cliente.numeroIdentificacion && (
              <Row label={venta.cliente.tipoIdentificacion} value={venta.cliente.numeroIdentificacion} />
            )}
          </>
        )}
      </div>

      <Separator />

      {/* Artículos */}
      <table className="w-full mb-2">
        <thead>
          <tr className="border-b border-dashed border-gray-300">
            <th className="text-left font-normal pb-1">Descripción</th>
            <th className="text-center font-normal pb-1 w-8">Qty</th>
            <th className="text-right font-normal pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {venta.detalles.map((d) => (
            <tr key={d.id} className="border-b border-dotted border-gray-200">
              <td className="py-0.5 pr-1">
                <p className="font-medium leading-tight">{d.articulo.nombre}</p>
                <p className="text-gray-500">
                  {formatCurrency(d.precioUnitario)} c/u
                  {d.descuento > 0 && ` (desc. ${d.descuento}%)`}
                </p>
              </td>
              <td className="text-center">{d.cantidad}</td>
              <td className="text-right font-semibold">{formatCurrency(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator double />

      {/* Totales con desglose ITBIS */}
      <div className="space-y-0.5">
        <Row label="Subtotal" value={formatCurrency(venta.subtotal)} />
        {venta.descuento > 0 && (
          <Row label="Descuento" value={`-${formatCurrency(venta.descuento)}`} />
        )}
        <Separator />
        <Row label="Base imponible" value={formatCurrency(baseImponible)} />
        <Row label="ITBIS (18%)"    value={formatCurrency(itbis)} />
        <div className="flex justify-between font-bold text-sm border-t-2 border-gray-800 pt-1.5 mt-1">
          <span>TOTAL RD$</span>
          <span>{formatCurrency(venta.total)}</span>
        </div>
      </div>

      <Separator />

      {/* Pie */}
      <div className="text-center text-gray-500 space-y-0.5 mt-1">
        <p className="font-semibold">¡Gracias por su compra!</p>
        <p className="text-[10px]">Este documento es su comprobante de pago</p>
      </div>
    </div>
  );
}

function Separator({ double = false }: { double?: boolean }) {
  return <div className={`my-2 border-t ${double ? 'border-double border-gray-600' : 'border-dashed border-gray-300'}`} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-right truncate">{value}</span>
    </div>
  );
}
