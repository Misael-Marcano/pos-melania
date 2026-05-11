'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { nombreArticuloConUnidad } from '@/lib/format-articulo';
import { IVenta } from '@pos/shared';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { ventasService } from '@/services/ventas.service';
import { Printer, X, MessageCircle, Pencil } from 'lucide-react';

interface Props {
  venta:       IVenta;
  onClose:     () => void;
  autoPrint?:  boolean;
  /**
   * `pos` = tras cobrar en caja (barra Factura de Punto de Venta + Nueva venta, etc.).
   * `detalle` = ver desde historial / modal (Comprobante de Venta + cerrar).
   * Usar siempre `pos` desde POSScreen; no inferir solo por onContinue.
   */
  variant?:    'pos' | 'detalle';
  /** Tras cobrar en POS: cerrar comprobante y volver a nueva venta */
  onContinue?: () => void;
  /** Solo admin — abre edición de la venta (ej. cargar VentaModal) */
  onEdit?:     () => void;
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO:        'Efectivo',
  TARJETA:         'Tarjeta',
  TRANSFERENCIA:   'Transferencia',
  CREDITO:         'Crédito',
  TARJETA_REGALO:  'Tarjeta regalo',
};

export function Receipt({
  venta,
  onClose,
  autoPrint = false,
  variant = 'detalle',
  onContinue,
  onEdit,
}: Props) {
  const [duplicado, setDuplicado] = useState(false);
  const { data: cfg } = useConfiguracion();

  const simboloMoneda =
    (cfg?.simboloMoneda && String(cfg.simboloMoneda).trim()) || 'RDS';
  const logoUrl =
    (cfg?.logotipoUrl && String(cfg.logotipoUrl).trim()) || undefined;

  const empresa = {
    nombre:
      (cfg?.nombreCompania && String(cfg.nombreCompania).trim()) || 'Mi Empresa',
    rnc:       cfg?.rnc ?? '',
    direccion: cfg?.direccion ?? '',
    telefono:  cfg?.telefono ?? '',
    logoUrl,
  };
  const textoPieRecibo = (cfg?.textoPieRecibo && String(cfg.textoPieRecibo).trim()) || '';

  // ITBIS incluido en el precio (18% — estándar RD)
  // Los precios en RD generalmente ya incluyen ITBIS
  const baseImponible = (venta.total / 1.18);
  const itbis         = venta.total - baseImponible;

  const numeroFactura = `F-${String(venta.id).padStart(6, '0')}`;

  const registrarImpresionRecibo = () => {
    void ventasService.auditarReciboImpresion(venta.id).catch(() => {});
  };

  const imprimirRecibo = () => {
    registrarImpresionRecibo();
    window.print();
  };

  const whatsappMsg = () => {
    const items = (venta.detalles ?? [])
      .map((d: any) => `  • ${nombreArticuloConUnidad(d.articulo ?? { nombre: 'Artículo' })} x${d.cantidad} — ${formatCurrency(d.total, simboloMoneda)}`)
      .join('\n');
    const msg = `*${empresa.nombre}*\nFactura: ${numeroFactura}${venta.comprobante ? `\nNCF: ${venta.comprobante}` : ''}\n\n${items}\n\n*Total: ${formatCurrency(venta.total, simboloMoneda)}*\n\nGracias por su compra.`;
    const tel = (venta as any).cliente?.telefono?.replace(/\D/g, '') ?? '';
    const base = tel ? `https://wa.me/1${tel}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(msg)}`;
  };

  // Tras montar: esperar pintado (layout + tick) para que #receipt-print exista antes de imprimir
  useLayoutEffect(() => {
    if (!autoPrint) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        t = setTimeout(() => {
          registrarImpresionRecibo();
          window.print();
        }, 550);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (t) clearTimeout(t);
    };
  }, [autoPrint]);

  const dismiss = () => (onContinue ?? onClose)();

  const postSale = variant === 'pos' || Boolean(onContinue);

  const ui = (
    <>
      {/* ── POS: pantalla completa. Otros: modal centrado — no imprime ── */}
      <div
        className={`fixed inset-0 z-[400] print:hidden flex ${
          postSale
            ? 'flex-col bg-white p-0'
            : 'items-center justify-center bg-black/60 p-4'
        }`}
      >
        <div
          className={`bg-white flex flex-col w-full ${
            postSale
              ? 'h-full min-h-0 max-h-[100dvh] rounded-none shadow-none'
              : 'rounded-[12px] shadow-float max-h-[90vh] max-w-sm'
          }`}
        >

          {postSale ? (
            /* Misma línea visual que el POS: blanco, navy, primary */
            <div className="shrink-0 bg-white border-b border-navy-200 px-4 py-3 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="shrink-0 flex items-center gap-1.5 border border-navy-200 bg-white hover:bg-navy-50 text-navy-800 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  )}
                  <h2 className="text-sm font-semibold text-navy-800 truncate">
                    Factura de Punto de Venta
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <label className="flex items-center gap-2 text-[11px] text-navy-600 cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={duplicado}
                      onChange={(e) => setDuplicado(e.target.checked)}
                      className="rounded border-navy-300 text-primary-600 focus:ring-primary-400 focus:ring-offset-0"
                    />
                    Duplicado del recibo
                  </label>
                  <button
                    type="button"
                    onClick={imprimirRecibo}
                    className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Printer size={12} /> Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Nueva venta
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Vista desde historial / modal de venta */
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <p className="font-semibold text-gray-700 text-sm">Comprobante de Venta</p>
                <p className="text-xs text-gray-400 truncate">
                  {numeroFactura}
                  {venta.comprobante ? ` · NCF: ${venta.comprobante}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 shrink-0">
                <a
                  href={whatsappMsg()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-[#25D366] hover:bg-[#1da851] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={imprimirRecibo}
                  className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Printer size={12} /> Imprimir
                </button>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Preview en pantalla: ancho tipo documento en POS; ticket en modal detalle */}
          <div
            className={`overflow-y-auto flex-1 min-h-0 ${
              postSale ? 'p-4 sm:p-8 bg-navy-50/40' : 'p-1'
            }`}
          >
            <ReceiptContent
              empresa={empresa}
              venta={venta}
              numeroFactura={numeroFactura}
              baseImponible={baseImponible}
              itbis={itbis}
              esDuplicado={duplicado}
              presentation={postSale ? 'document' : 'ticket'}
              textoPieRecibo={textoPieRecibo}
              simboloMoneda={simboloMoneda}
            />
          </div>

          {postSale && (
            <div className="border-t border-gray-100 px-4 py-2 shrink-0 flex justify-center">
              <a
                href={whatsappMsg()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-primary-600 hover:text-primary-700 font-medium"
              >
                <MessageCircle size={12} /> Enviar por WhatsApp
              </a>
            </div>
          )}
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
          esDuplicado={duplicado}
          textoPieRecibo={textoPieRecibo}
          simboloMoneda={simboloMoneda}
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

  if (typeof document === 'undefined') return ui;
  return createPortal(ui, document.body);
}

// ─── Contenido del recibo (reutilizado en preview e impresión) ────────────────
interface ContentProps {
  empresa:       { nombre: string; rnc: string; direccion: string; telefono: string; logoUrl?: string };
  venta:         IVenta;
  numeroFactura: string;
  baseImponible: number;
  itbis:         number;
  esDuplicado?:  boolean;
  /** `document` = vista amplia en pantalla; `ticket` = 80mm (modal detalle e impresión térmica) */
  presentation?: 'ticket' | 'document';
  /** Texto adicional de configuración bajo el pie estándar */
  textoPieRecibo?: string;
  /** Símbolo de moneda desde configuración (ej. RDS, RD$) */
  simboloMoneda?: string;
}

function ReceiptContent({
  empresa,
  venta,
  numeroFactura,
  baseImponible,
  itbis,
  esDuplicado = false,
  presentation = 'ticket',
  textoPieRecibo = '',
  simboloMoneda = 'RDS',
}: ContentProps) {
  const isDoc = presentation === 'document';
  const fmt = (n: number) => formatCurrency(n, simboloMoneda);

  if (isDoc) {
    return (
      <div
        className={cn(
          'w-full max-w-4xl mx-auto bg-white rounded-xl border border-navy-200/60 shadow-sm',
          'px-6 py-8 sm:px-10 sm:py-10 text-navy-800',
          'text-sm sm:text-[15px] leading-relaxed',
        )}
      >
        {esDuplicado && (
          <p className="text-center font-bold text-sm border-2 border-dashed border-navy-400 py-2 mb-6 uppercase tracking-widest text-navy-600">
            Duplicado del recibo
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-8 pb-8 border-b border-navy-200">
          <div className="text-left space-y-1">
            {empresa.logoUrl && (
              <img
                src={empresa.logoUrl}
                alt=""
                className="h-12 sm:h-14 w-auto max-w-[200px] object-contain object-left mb-3"
              />
            )}
            <p className="font-bold text-lg sm:text-xl uppercase tracking-wide text-navy-900">{empresa.nombre}</p>
            {empresa.direccion && <p className="text-navy-600">{empresa.direccion}</p>}
            {empresa.telefono  && <p className="text-navy-600">Tel: {empresa.telefono}</p>}
            {empresa.rnc       && <p className="text-navy-600">RNC: {empresa.rnc}</p>}
          </div>
          <div className="text-left md:text-right space-y-1.5 text-navy-600">
            <p><span className="text-navy-400 font-medium">Fecha: </span>{formatDateTime(venta.fecha)}</p>
            <p><span className="text-navy-400 font-medium">Factura: </span><span className="font-semibold text-navy-900">{numeroFactura}</span></p>
            {venta.comprobante && (
              <p><span className="text-navy-400 font-medium">NCF: </span><span className="font-mono font-semibold">{venta.comprobante}</span></p>
            )}
            <p><span className="text-navy-400 font-medium">Método: </span>{METODO_LABEL[venta.metodoPago] ?? venta.metodoPago}</p>
            {venta.cliente && (
              <p><span className="text-navy-400 font-medium">Cliente: </span>{venta.cliente.nombre}</p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm sm:text-[15px] border-collapse">
            <thead>
              <tr className="border-b-2 border-navy-300">
                <th className="text-left py-3 pr-4 font-semibold text-navy-900">Nombre</th>
                <th className="text-right py-3 px-2 font-semibold text-navy-900 whitespace-nowrap w-28">Precio</th>
                <th className="text-center py-3 px-2 font-semibold text-navy-900 w-24">Cant.</th>
                <th className="text-right py-3 pl-4 font-semibold text-navy-900 whitespace-nowrap w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {(venta.detalles ?? []).map((d) => (
                <tr key={d.id} className="border-b border-navy-100">
                  <td className="py-3 pr-4 align-top">
                    <p className="font-semibold text-navy-900">{nombreArticuloConUnidad(d.articulo ?? { nombre: 'Artículo' })}</p>
                    {d.descuento > 0 && (
                      <p className="text-xs text-navy-500 mt-0.5">Descuento {d.descuento}%</p>
                    )}
                  </td>
                  <td className="text-right tabular-nums text-navy-700 py-3 align-top">{fmt(d.precioUnitario)}</td>
                  <td className="text-center tabular-nums py-3 align-top">{d.cantidad}</td>
                  <td className="text-right font-semibold tabular-nums text-navy-900 py-3 align-top">{fmt(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col items-end gap-1 max-w-md ml-auto text-sm sm:text-[15px]">
          <RowDoc label="Subtotal" value={fmt(venta.subtotal)} />
          {venta.descuento > 0 && (
            <RowDoc label="Descuento" value={`−${fmt(venta.descuento)}`} />
          )}
          {venta.esDelivery && Number(venta.deliveryCargo) > 0 && (
            <RowDoc label="Cargo delivery" value={`+${fmt(Number(venta.deliveryCargo))}`} />
          )}
          <RowDoc label="Base imponible" value={fmt(baseImponible)} />
          <RowDoc label="ITBIS (18%)" value={fmt(itbis)} />
          <div className="flex justify-between gap-12 w-full max-w-sm pt-3 mt-2 border-t-2 border-navy-800 font-bold text-lg text-navy-900">
            <span>TOTAL</span>
            <span className="tabular-nums">{fmt(venta.total)}</span>
          </div>
          {venta.metodoPago === 'EFECTIVO' && venta.efectivoRecibido != null && (
            <>
              <RowDoc label="Efectivo recibido" value={fmt(Number(venta.efectivoRecibido))} />
              <RowDoc label="Cambio" value={fmt(Number(venta.cambio ?? 0))} />
            </>
          )}
          {venta.esDelivery && venta.deliveryDireccion && (
            <div className="w-full max-w-sm mt-2 text-xs text-navy-500">
              <span className="font-medium text-navy-700">Dirección: </span>{venta.deliveryDireccion}
            </div>
          )}
          <p className="text-navy-500 text-xs mt-2 w-full text-right">
            N.º artículos: {(venta.detalles ?? []).reduce((n, d) => n + d.cantidad, 0)}
          </p>
        </div>

        <div className="mt-10 pt-8 border-t border-navy-200 text-center text-navy-500 text-sm">
          <p className="font-semibold text-navy-700">¡Gracias por su compra!</p>
          <p className="mt-1 text-xs">Este documento es su comprobante de pago</p>
          {textoPieRecibo && (
            <p className="mt-4 text-xs text-navy-600 whitespace-pre-wrap max-w-md mx-auto leading-relaxed">
              {textoPieRecibo}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono text-xs px-4 py-4 w-full max-w-[80mm] mx-auto">

      {esDuplicado && (
        <p className="text-center font-bold text-[11px] border-2 border-dashed border-gray-800 py-1.5 mb-3 uppercase tracking-widest">
          Duplicado del recibo
        </p>
      )}

      {/* Encabezado */}
      <div className="text-center mb-3">
        {empresa.logoUrl && (
          <img
            src={empresa.logoUrl}
            alt=""
            className="mx-auto h-10 max-w-[160px] object-contain mb-2"
          />
        )}
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
          {(venta.detalles ?? []).map((d) => (
            <tr key={d.id} className="border-b border-dotted border-gray-200">
              <td className="py-0.5 pr-1">
                <p className="font-medium leading-tight">{nombreArticuloConUnidad(d.articulo ?? { nombre: 'Artículo' })}</p>
                <p className="text-gray-500">
                  {fmt(d.precioUnitario)} c/u
                  {d.descuento > 0 && ` (desc. ${d.descuento}%)`}
                </p>
              </td>
              <td className="text-center">{d.cantidad}</td>
              <td className="text-right font-semibold">{fmt(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator double />

      {/* Totales con desglose ITBIS */}
      <div className="space-y-0.5">
        <Row label="Subtotal" value={fmt(venta.subtotal)} />
        {venta.descuento > 0 && (
          <Row label="Descuento" value={`-${fmt(venta.descuento)}`} />
        )}
        {venta.esDelivery && Number(venta.deliveryCargo) > 0 && (
          <Row label="Delivery" value={`+${fmt(Number(venta.deliveryCargo))}`} />
        )}
        <Separator />
        <Row label="Base imponible" value={fmt(baseImponible)} />
        <Row label="ITBIS (18%)"    value={fmt(itbis)} />
        <div className="flex justify-between font-bold text-sm border-t-2 border-gray-800 pt-1.5 mt-1">
          <span>TOTAL {simboloMoneda}</span>
          <span>{fmt(venta.total)}</span>
        </div>
        {venta.metodoPago === 'EFECTIVO' && venta.efectivoRecibido != null && (
          <>
            <Separator />
            <Row label="Efectivo" value={fmt(Number(venta.efectivoRecibido))} />
            <Row label="Cambio"   value={fmt(Number(venta.cambio ?? 0))} />
          </>
        )}
      </div>
      {venta.esDelivery && venta.deliveryDireccion && (
        <>
          <Separator />
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Dirección de entrega</p>
          <p className="text-[10px] mt-0.5">{venta.deliveryDireccion}</p>
        </>
      )}

      <Separator />

      {/* Pie */}
      <div className="text-center text-gray-500 space-y-0.5 mt-1">
        <p className="font-semibold">¡Gracias por su compra!</p>
        <p className="text-[10px]">Este documento es su comprobante de pago</p>
        {textoPieRecibo && (
          <p className="text-[10px] mt-2 whitespace-pre-wrap leading-snug text-gray-600 px-1">
            {textoPieRecibo}
          </p>
        )}
      </div>
    </div>
  );
}

function RowDoc({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-8 w-full max-w-sm">
      <span className="text-navy-500">{label}</span>
      <span className="font-medium tabular-nums text-navy-900">{value}</span>
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
