'use client';

import { useCallback, useLayoutEffect, useState } from 'react';
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

const TIPO_NCF_LABEL: Record<string, string> = {
  '01': 'Factura de crédito fiscal',
  '02': 'Factura de consumo',
  '03': 'Nota de débito',
  '04': 'Nota de crédito',
  '11': 'Comprobante de compras',
  '12': 'Registro único de ingresos',
  '13': 'Gastos menores',
  '14': 'Régimen especial',
  '15': 'Gubernamental',
  '16': 'Exportaciones',
  '17': 'Pagos al exterior',
};

const IDENT_LABEL: Record<string, string> = {
  CEDULA:    'Cédula',
  RNC:       'RNC',
  PASAPORTE: 'Pasaporte',
};

function ncfTipoLabel(comprobante?: string | null): string | null {
  if (!comprobante?.trim()) return null;
  const digits = comprobante.replace(/\D/g, '');
  const tipo = digits.length >= 10 ? digits.slice(8, 10) : comprobante.replace(/^B/i, '').slice(0, 2);
  return TIPO_NCF_LABEL[tipo] ?? null;
}

function computeTaxBreakdown(
  venta: IVenta,
  cfg?: { tasaImpuesto1?: number; tasaImpuesto1Nombre?: string; preciosIncluyenImpuesto?: boolean },
) {
  const tasaNombre = (cfg?.tasaImpuesto1Nombre && String(cfg.tasaImpuesto1Nombre).trim()) || 'ITBIS';
  const tasaPct = cfg?.tasaImpuesto1 ?? 18;
  const incluye = cfg?.preciosIncluyenImpuesto ?? true;

  if (venta.impuesto > 0) {
    return {
      baseImponible: Math.max(0, venta.total - venta.impuesto),
      itbis: venta.impuesto,
      tasaNombre,
      tasaPct,
    };
  }

  if (tasaPct <= 0) {
    return { baseImponible: venta.total, itbis: 0, tasaNombre, tasaPct };
  }

  const rate = tasaPct / 100;
  if (incluye) {
    const baseImponible = venta.total / (1 + rate);
    return { baseImponible, itbis: venta.total - baseImponible, tasaNombre, tasaPct };
  }

  const baseImponible = venta.subtotal - venta.descuento;
  const itbis = baseImponible * rate;
  return { baseImponible, itbis, tasaNombre, tasaPct };
}

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
    sitioWeb:  cfg?.sitioWeb ?? '',
    logoUrl,
  };
  const textoPieRecibo = (cfg?.textoPieRecibo && String(cfg.textoPieRecibo).trim()) || '';

  const { baseImponible, itbis, tasaNombre, tasaPct } = computeTaxBreakdown(venta, cfg);
  const tipoComprobante = ncfTipoLabel(venta.comprobante);
  const cantidadArticulos = (venta.detalles ?? []).reduce((n, d) => n + d.cantidad, 0);
  const tiendaNombre =
    venta.cajaApertura?.tienda?.nombre ??
    cfg?.caja?.tienda?.nombre ??
    null;
  const cajaNombre =
    venta.cajaApertura?.caja?.nombre ??
    venta.cajaApertura?.cajaNombre ??
    cfg?.caja?.nombre ??
    cfg?.nombreCaja ??
    null;

  const numeroFactura = `F-${String(venta.id).padStart(6, '0')}`;

  const registrarImpresionRecibo = useCallback(() => {
    void ventasService.auditarReciboImpresion(venta.id).catch(() => {});
  }, [venta.id]);

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
  }, [autoPrint, registrarImpresionRecibo]);

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
            className={`overflow-y-auto flex-1 min-h-0 flex justify-center ${
              postSale ? 'p-4 sm:p-8 bg-navy-50/40' : 'p-3'
            }`}
          >
            <ReceiptContent
              empresa={empresa}
              venta={venta}
              numeroFactura={numeroFactura}
              baseImponible={baseImponible}
              itbis={itbis}
              tasaNombre={tasaNombre}
              tasaPct={tasaPct}
              tipoComprobante={tipoComprobante}
              cantidadArticulos={cantidadArticulos}
              tiendaNombre={tiendaNombre}
              cajaNombre={cajaNombre}
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
          tasaNombre={tasaNombre}
          tasaPct={tasaPct}
          tipoComprobante={tipoComprobante}
          cantidadArticulos={cantidadArticulos}
          tiendaNombre={tiendaNombre}
          cajaNombre={cajaNombre}
          esDuplicado={duplicado}
          textoPieRecibo={textoPieRecibo}
          simboloMoneda={simboloMoneda}
        />
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #receipt-print,
          #receipt-print * {
            visibility: visible !important;
          }
          #receipt-print {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            width: 100% !important;
            padding: 3mm 0 !important;
            margin: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #receipt-print .receipt-sheet {
            width: 72mm !important;
            max-width: 72mm !important;
            margin: 0 auto !important;
            padding: 2mm 2.5mm !important;
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important;
            font-size: 11pt !important;
            line-height: 1.45 !important;
            color: #000 !important;
            text-rendering: geometricPrecision !important;
            -webkit-font-smoothing: auto !important;
          }
          #receipt-print .receipt-sheet * {
            font-family: inherit !important;
            color: #000 !important;
          }
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
        }
      `}</style>
    </>
  );

  if (typeof document === 'undefined') return ui;
  return createPortal(ui, document.body);
}

/** Logotipo en recibo: `<img>` (URLs arbitrarias; `next/image` está acotado en `next.config`). */
function ReceiptLogo({
  url,
  empresaNombre,
  className,
}: {
  url: string;
  empresaNombre: string;
  className: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logotipoUrl es URL pública arbitraria (no está en `images.remotePatterns`)
    <img
      src={url}
      alt={`Logotipo de ${empresaNombre}`}
      className={className}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.remove();
      }}
    />
  );
}

// ─── Contenido del recibo (reutilizado en preview e impresión) ────────────────
interface ContentProps {
  empresa:       { nombre: string; rnc: string; direccion: string; telefono: string; sitioWeb?: string; logoUrl?: string };
  venta:         IVenta;
  numeroFactura: string;
  baseImponible: number;
  itbis:         number;
  tasaNombre:    string;
  tasaPct:       number;
  tipoComprobante?: string | null;
  cantidadArticulos: number;
  tiendaNombre?: string | null;
  cajaNombre?:   string | null;
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
  tasaNombre,
  tasaPct,
  tipoComprobante = null,
  cantidadArticulos,
  tiendaNombre = null,
  cajaNombre = null,
  esDuplicado = false,
  presentation = 'ticket',
  textoPieRecibo = '',
  simboloMoneda = 'RDS',
}: ContentProps) {
  const isDoc = presentation === 'document';
  const fmt = (n: number) => formatCurrency(n, simboloMoneda);
  const impuestoLabel = tasaPct > 0 ? `${tasaNombre} (${tasaPct}%)` : tasaNombre;

  const metaRows: { label: string; value: string }[] = [
    { label: 'Fecha', value: formatDateTime(venta.fecha) },
    { label: 'Factura', value: numeroFactura },
  ];
  if (venta.comprobante) {
    metaRows.push({ label: 'NCF', value: venta.comprobante });
  }
  if (tipoComprobante) {
    metaRows.push({ label: 'Tipo', value: tipoComprobante });
  }
  metaRows.push({ label: 'Método de pago', value: METODO_LABEL[venta.metodoPago] ?? venta.metodoPago });
  if (tiendaNombre) metaRows.push({ label: 'Sucursal', value: tiendaNombre });
  if (cajaNombre) metaRows.push({ label: 'Caja', value: cajaNombre });
  if (venta.usuario?.nombre) metaRows.push({ label: 'Atendido por', value: venta.usuario.nombre });
  if (venta.cliente) {
    metaRows.push({ label: 'Cliente', value: venta.cliente.nombre });
    if (venta.cliente.compania) metaRows.push({ label: 'Empresa', value: venta.cliente.compania });
    if (venta.cliente.tipoIdentificacion && venta.cliente.numeroIdentificacion) {
      metaRows.push({
        label: IDENT_LABEL[venta.cliente.tipoIdentificacion] ?? venta.cliente.tipoIdentificacion,
        value: venta.cliente.numeroIdentificacion,
      });
    }
    if (venta.cliente.telefono) metaRows.push({ label: 'Tel. cliente', value: venta.cliente.telefono });
    if (venta.cliente.correo) metaRows.push({ label: 'Correo', value: venta.cliente.correo });
  }
  if (venta.notas?.trim()) metaRows.push({ label: 'Notas', value: venta.notas.trim() });

  if (isDoc) {
    return (
      <div
        className={cn(
          'w-full max-w-3xl mx-auto bg-white rounded-xl border border-navy-200/60 shadow-sm',
          'px-6 py-8 sm:px-10 sm:py-10 text-navy-900 antialiased',
          'text-[15px] leading-relaxed',
        )}
      >
        {esDuplicado && (
          <p className="text-center font-bold text-sm border-2 border-dashed border-navy-400 py-2 mb-6 uppercase tracking-wide text-navy-600">
            Duplicado del recibo
          </p>
        )}

        <header className="text-center mb-8 pb-6 border-b-2 border-navy-200">
          {empresa.logoUrl && (
            <ReceiptLogo
              url={empresa.logoUrl}
              empresaNombre={empresa.nombre}
              className="mx-auto h-14 sm:h-16 w-auto max-w-[220px] object-contain mb-4"
            />
          )}
          <h1 className="font-bold text-xl sm:text-2xl uppercase tracking-wide text-navy-900">{empresa.nombre}</h1>
          <div className="mt-2 space-y-0.5 text-navy-600 text-sm">
            {empresa.rnc && <p>RNC: {empresa.rnc}</p>}
            {empresa.direccion && <p>{empresa.direccion}</p>}
            {empresa.telefono && <p>Tel: {empresa.telefono}</p>}
            {empresa.sitioWeb && <p>{empresa.sitioWeb}</p>}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 p-4 rounded-lg bg-navy-50/60 border border-navy-100">
          {metaRows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="flex flex-col sm:flex-row sm:gap-2 min-w-0">
              <span className="text-navy-500 font-medium shrink-0">{row.label}:</span>
              <span className="text-navy-900 font-semibold break-words">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-navy-300 bg-navy-50/50">
                <th className="text-left py-3 px-2 font-semibold">Descripción</th>
                <th className="text-right py-3 px-2 font-semibold whitespace-nowrap w-28">Precio</th>
                <th className="text-center py-3 px-2 font-semibold w-20">Cant.</th>
                <th className="text-right py-3 px-2 font-semibold whitespace-nowrap w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {(venta.detalles ?? []).map((d) => (
                <tr key={d.id} className="border-b border-navy-100">
                  <td className="py-3 px-2 align-top">
                    <p className="font-semibold">{nombreArticuloConUnidad(d.articulo ?? { nombre: 'Artículo' })}</p>
                    {d.articulo?.codigoBarras && (
                      <p className="text-xs text-navy-500 mt-0.5">Cód: {d.articulo.codigoBarras}</p>
                    )}
                    {d.descuento > 0 && (
                      <p className="text-xs text-navy-500 mt-0.5">Descuento {d.descuento}%</p>
                    )}
                  </td>
                  <td className="text-right tabular-nums py-3 px-2 align-top">{fmt(d.precioUnitario)}</td>
                  <td className="text-center tabular-nums py-3 px-2 align-top">{d.cantidad}</td>
                  <td className="text-right font-semibold tabular-nums py-3 px-2 align-top">{fmt(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-col items-center gap-1 max-w-sm mx-auto text-[15px]">
          <RowDoc label="Subtotal" value={fmt(venta.subtotal)} />
          {venta.descuento > 0 && <RowDoc label="Descuento" value={`−${fmt(venta.descuento)}`} />}
          {venta.esDelivery && Number(venta.deliveryCargo) > 0 && (
            <RowDoc label="Cargo delivery" value={`+${fmt(Number(venta.deliveryCargo))}`} />
          )}
          {tasaPct > 0 && <RowDoc label="Base imponible" value={fmt(baseImponible)} />}
          {tasaPct > 0 && itbis > 0 && <RowDoc label={impuestoLabel} value={fmt(itbis)} />}
          <div className="flex justify-between gap-8 w-full pt-3 mt-2 border-t-2 border-navy-800 font-bold text-xl text-navy-900">
            <span>TOTAL {simboloMoneda}</span>
            <span className="tabular-nums">{fmt(venta.total)}</span>
          </div>
          {venta.metodoPago === 'EFECTIVO' && venta.efectivoRecibido != null && (
            <>
              <RowDoc label="Efectivo recibido" value={fmt(Number(venta.efectivoRecibido))} />
              <RowDoc label="Cambio" value={fmt(Number(venta.cambio ?? 0))} />
            </>
          )}
          {venta.esDelivery && venta.deliveryDireccion && (
            <p className="w-full mt-2 text-sm text-navy-600 text-center">
              <span className="font-medium text-navy-800">Dirección de entrega: </span>
              {venta.deliveryDireccion}
            </p>
          )}
          <p className="text-navy-500 text-sm mt-2 w-full text-center">
            Artículos vendidos: {cantidadArticulos}
          </p>
        </div>

        <footer className="mt-10 pt-6 border-t border-navy-200 text-center text-navy-600">
          <p className="font-semibold text-navy-800 text-base">¡Gracias por su compra!</p>
          <p className="mt-1 text-sm">Este documento es su comprobante de pago</p>
          {textoPieRecibo && (
            <p className="mt-4 text-sm text-navy-600 whitespace-pre-wrap max-w-md mx-auto leading-relaxed">
              {textoPieRecibo}
            </p>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="receipt-sheet w-full max-w-[80mm] mx-auto px-3 py-4 text-[13px] leading-snug text-gray-900 antialiased font-sans">

      {esDuplicado && (
        <p className="text-center font-bold text-xs border-2 border-dashed border-gray-800 py-1.5 mb-3 uppercase tracking-wide">
          Duplicado del recibo
        </p>
      )}

      <header className="text-center mb-3 space-y-0.5">
        {empresa.logoUrl && (
          <ReceiptLogo
            url={empresa.logoUrl}
            empresaNombre={empresa.nombre}
            className="mx-auto h-11 max-w-[170px] object-contain mb-2"
          />
        )}
        <p className="font-bold text-base uppercase tracking-wide leading-tight">{empresa.nombre}</p>
        {empresa.rnc && <p className="text-[13px]">RNC: {empresa.rnc}</p>}
        {empresa.direccion && <p className="text-[13px] leading-snug px-1">{empresa.direccion}</p>}
        {empresa.telefono && <p className="text-[13px]">Tel: {empresa.telefono}</p>}
        {empresa.sitioWeb && <p className="text-[13px]">{empresa.sitioWeb}</p>}
      </header>

      <Separator />

      <section className="text-center my-3 space-y-1">
        <p className="text-xs uppercase tracking-wide text-gray-600 font-semibold">Comprobante de venta</p>
        <p className="font-bold text-lg leading-none">{numeroFactura}</p>
        {venta.comprobante && (
          <div className="inline-block border border-gray-400 rounded px-3 py-1.5 mt-1 mx-auto">
            <p className="text-xs uppercase tracking-wide text-gray-600 font-semibold">NCF</p>
            <p className="font-bold text-sm tracking-wide">{venta.comprobante}</p>
            {tipoComprobante && (
              <p className="text-xs text-gray-600 mt-0.5">{tipoComprobante}</p>
            )}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-1 mb-2">
        {metaRows.map((row) => (
          <Row key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
        ))}
      </section>

      <Separator />

      <table className="w-full mb-2 border-collapse">
        <thead>
          <tr className="border-b border-gray-400">
            <th className="text-left font-semibold pb-1 pr-1 text-xs">Descripción</th>
            <th className="text-center font-semibold pb-1 w-9 text-xs">Cant</th>
            <th className="text-right font-semibold pb-1 pl-1 w-[4.5rem] text-xs">Total</th>
          </tr>
        </thead>
        <tbody>
          {(venta.detalles ?? []).map((d) => (
            <tr key={d.id} className="border-b border-dotted border-gray-300 align-top">
              <td className="py-1 pr-1">
                <p className="font-semibold leading-tight">{nombreArticuloConUnidad(d.articulo ?? { nombre: 'Artículo' })}</p>
                <p className="text-xs text-gray-600 tabular-nums">
                  {fmt(d.precioUnitario)} c/u
                  {d.descuento > 0 && ` · desc. ${d.descuento}%`}
                </p>
                {d.articulo?.codigoBarras && (
                  <p className="text-[11px] text-gray-500">Cód: {d.articulo.codigoBarras}</p>
                )}
              </td>
              <td className="text-center tabular-nums py-1 align-top">{d.cantidad}</td>
              <td className="text-right font-semibold tabular-nums py-1 pl-1 align-top">{fmt(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator double />

      <section className="space-y-1">
        <Row label="Subtotal" value={fmt(venta.subtotal)} />
        {venta.descuento > 0 && <Row label="Descuento" value={`−${fmt(venta.descuento)}`} />}
        {venta.esDelivery && Number(venta.deliveryCargo) > 0 && (
          <Row label="Delivery" value={`+${fmt(Number(venta.deliveryCargo))}`} />
        )}
        {tasaPct > 0 && (
          <>
            <Separator />
            <Row label="Base imponible" value={fmt(baseImponible)} />
            {itbis > 0 && <Row label={impuestoLabel} value={fmt(itbis)} />}
          </>
        )}
        <div className="flex justify-between items-center font-bold text-base border-t-2 border-gray-900 pt-1.5 mt-1 gap-2">
          <span>TOTAL {simboloMoneda}</span>
          <span className="tabular-nums">{fmt(venta.total)}</span>
        </div>
        {venta.metodoPago === 'EFECTIVO' && venta.efectivoRecibido != null && (
          <>
            <Separator />
            <Row label="Efectivo recibido" value={fmt(Number(venta.efectivoRecibido))} />
            <Row label="Cambio" value={fmt(Number(venta.cambio ?? 0))} />
          </>
        )}
      </section>

      {venta.esDelivery && venta.deliveryDireccion && (
        <>
          <Separator />
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 text-center">Dirección de entrega</p>
          <p className="text-xs mt-0.5 text-center leading-snug px-1">{venta.deliveryDireccion}</p>
        </>
      )}

      <Separator />

      <footer className="text-center text-gray-600 space-y-1 mt-1">
        <p className="font-semibold text-gray-800">¡Gracias por su compra!</p>
        <p className="text-xs">Este documento es su comprobante de pago</p>
        <p className="text-xs tabular-nums">Artículos: {cantidadArticulos}</p>
        {textoPieRecibo && (
          <p className="text-xs mt-2 whitespace-pre-wrap leading-snug px-1">{textoPieRecibo}</p>
        )}
      </footer>
    </div>
  );
}

function RowDoc({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 w-full">
      <span className="text-navy-500 shrink-0">{label}</span>
      <span className="font-medium tabular-nums text-navy-900 text-right">{value}</span>
    </div>
  );
}

function Separator({ double = false }: { double?: boolean }) {
  return <div className={`my-2 border-t ${double ? 'border-double border-gray-700' : 'border-dashed border-gray-400'}`} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto,1fr] gap-x-2 items-start">
      <span className="text-gray-600 shrink-0">{label}:</span>
      <span className="text-right font-medium break-words leading-snug">{value}</span>
    </div>
  );
}
