'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useConfiguracion, useActualizarConfiguracion } from '@/hooks/useConfiguracion';
import { useSaasContext, SAAS_CONTEXT_KEY } from '@/hooks/useSaasContext';
import { BILLING_STATUS_KEY, useBillingMutations, useBillingStatus } from '@/hooks/useBilling';
import { useTiendas } from '@/hooks/useTiendas';
import { useCajas } from '@/hooks/useCajas';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuthStore } from '@/store/auth.store';
import {
  Building2, DollarSign, FileText, Save, Loader2, Image, Hash, Info,
  BookOpen, Store, Users, ArrowRight, Wallet, Layers, CreditCard,
} from 'lucide-react';
import { toast } from '@/store/toast.store';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '—';
const APP_ENTORNO =
  process.env.NODE_ENV === 'production'
    ? 'Producción'
    : process.env.NODE_ENV === 'development'
      ? 'Desarrollo'
      : process.env.NODE_ENV ?? '—';

function SectionCard({ title, icon, description, children }: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[12px] shadow-card">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-navy-100/40">
        <span className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0 mt-0.5">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold text-navy-800">{title}</h3>
          {description && <p className="text-xs text-navy-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, col }: {
  label: string;
  hint?: string;
  col?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={col ? 'col-span-1' : ''}>
      <label className="block text-sm font-medium text-navy-700 mb-1.5">{label}</label>
      {children}
      {hint && (
        <p className="flex items-start gap-1 text-xs text-navy-400 mt-1.5">
          <Info size={11} className="mt-0.5 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-4 py-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 mt-0.5 ${
          checked ? 'bg-primary-500' : 'bg-navy-200'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <div>
        <span className="text-sm font-medium text-navy-700">{label}</span>
        {hint && <p className="text-xs text-navy-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function BillingStripePanel() {
  const user = useAuthStore((s) => s.user);
  const can =
    user &&
    ['admin', 'soporte', 'plataforma'].includes(user.rol);

  const { data: billing, isLoading } = useBillingStatus();
  const { checkout, portal } = useBillingMutations();
  const [plan, setPlan] = useState<'starter' | 'standard' | 'enterprise'>('standard');

  if (!can) return null;

  if (isLoading) {
    return (
      <div className="border-t border-navy-100/40 pt-4 mt-4 flex items-center gap-2 text-sm text-navy-500">
        <Loader2 className="animate-spin shrink-0" size={16} />
        Cargando estado de facturación…
      </div>
    );
  }

  if (!billing) return null;

  if (billing.provider === 'none') {
    return (
      <div className="border-t border-navy-100/40 pt-4 mt-4">
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">
          Facturación SaaS
        </p>
        <p className="text-sm text-navy-600">{billing.hint}</p>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const successUrl = `${origin}/configuracion?billing=success`;
  const cancelUrl = `${origin}/configuracion?billing=cancel`;
  const returnUrl = `${origin}/configuracion`;

  const hasCustomer = Boolean(billing.tenant?.stripeCustomerId?.trim());
  const canCheckout =
    billing.configured && billing.pricesConfigured;

  return (
    <div className="border-t border-navy-100/40 pt-4 mt-4 space-y-4">
      <div className="flex items-start gap-2">
        <CreditCard size={16} className="text-primary-600 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider">
            Facturación (Stripe)
          </p>
          <p className="text-xs text-navy-500 mt-1">{billing.hint}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 border ${
          billing.configured ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          API: {billing.configured ? 'OK' : 'pendiente'}
        </span>
        <span className={`rounded-full px-2 py-0.5 border ${
          billing.webhookConfigured ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-navy-50 border-navy-200 text-navy-600'
        }`}>
          Webhook: {billing.webhookConfigured ? 'OK' : 'opcional'}
        </span>
        <span className={`rounded-full px-2 py-0.5 border ${
          billing.pricesConfigured ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-navy-50 border-navy-200 text-navy-600'
        }`}>
          Precios: {billing.pricesConfigured ? 'OK' : 'STRIPE_PRICE_*'}
        </span>
      </div>

      {billing.tenant && (
        <div className="text-xs text-navy-600 space-y-0.5">
          <p>
            <span className="text-navy-400">Estado Stripe:</span>{' '}
            {billing.tenant.billingStatus ?? '—'}
          </p>
          {billing.tenant.stripeSubscriptionId && (
            <p className="font-mono text-[11px] text-navy-500 truncate" title={billing.tenant.stripeSubscriptionId}>
              Suscripción: {billing.tenant.stripeSubscriptionId}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        {canCheckout && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-xs text-navy-500 sm:sr-only" htmlFor="billing-plan">
              Plan
            </label>
            <select
              id="billing-plan"
              className="input-field text-sm py-2 max-w-[200px]"
              value={plan}
              onChange={(e) =>
                setPlan(e.target.value as 'starter' | 'standard' | 'enterprise')
              }
              disabled={checkout.isPending}
            >
              <option value="starter">Starter</option>
              <option value="standard">Standard</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              type="button"
              className="btn-primary text-sm py-2 px-4 inline-flex items-center justify-center gap-2"
              disabled={checkout.isPending}
              onClick={() =>
                checkout.mutate({ successUrl, cancelUrl, planCode: plan })
              }
            >
              {checkout.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : <CreditCard size={16} />}
              Suscribirse / cambiar plan
            </button>
          </div>
        )}

        {hasCustomer && (
          <button
            type="button"
            className="btn-outline text-sm py-2 px-4 inline-flex items-center justify-center gap-2"
            disabled={portal.isPending}
            onClick={() => portal.mutate({ returnUrl })}
          >
            {portal.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <CreditCard size={16} />}
            Portal de facturación
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const qc = useQueryClient();
  const { data: cfg, isLoading } = useConfiguracion();
  const actualizar = useActualizarConfiguracion();
  const { data: saas, isSuccess: saasOk } = useSaasContext();
  const { data: tiendas = [] } = useTiendas();
  const { data: cajasLista = [] } = useCajas();

  const [form, setForm] = useState({
    nombreCompania:          '',
    rnc:                     '',
    direccion:               '',
    telefono:                '',
    sitioWeb:                '',
    logotipoUrl:             '',
    textoPieRecibo:          '',
    simboloMoneda:           'RDS',
    numeroDecimales:         2,
    tasaImpuesto1Nombre:     '',
    tasaImpuesto1:           0,
    tasaImpuesto2Nombre:     '',
    tasaImpuesto2:           0,
    preciosIncluyenImpuesto: true,
    comprobanteDefecto:      '02',
    /** vacío = usar solo FISCAL_JURISDICTION del servidor */
    fiscalJurisdiccion:      '' as '' | 'DO' | 'NONE',
    nombreCaja:              'CAJA 1',
    /** vacío = sin sucursal fija */
    tiendaId:                '' as number | '',
    /** Catálogo de cajas — vacío = solo nombre manual */
    cajaId:                  '' as number | '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cfg) {
      setForm({
        nombreCompania:          cfg.nombreCompania          ?? '',
        rnc:                     cfg.rnc                     ?? '',
        direccion:               cfg.direccion               ?? '',
        telefono:                cfg.telefono                ?? '',
        sitioWeb:                cfg.sitioWeb                ?? '',
        logotipoUrl:             (cfg as any).logotipoUrl    ?? '',
        textoPieRecibo:          (cfg as any).textoPieRecibo ?? '',
        simboloMoneda:           cfg.simboloMoneda           ?? 'RDS',
        numeroDecimales:         (cfg as any).numeroDecimales ?? 2,
        tasaImpuesto1Nombre:     cfg.tasaImpuesto1Nombre     ?? '',
        tasaImpuesto1:           cfg.tasaImpuesto1           ?? 0,
        tasaImpuesto2Nombre:     (cfg as any).tasaImpuesto2Nombre ?? '',
        tasaImpuesto2:           (cfg as any).tasaImpuesto2  ?? 0,
        preciosIncluyenImpuesto: cfg.preciosIncluyenImpuesto ?? true,
        comprobanteDefecto:      cfg.comprobanteDefecto      ?? '02',
        fiscalJurisdiccion:
          cfg.fiscalJurisdiccion === 'DO' || cfg.fiscalJurisdiccion === 'NONE'
            ? cfg.fiscalJurisdiccion
            : '',
        nombreCaja:              cfg.nombreCaja              ?? 'CAJA 1',
        tiendaId:                cfg.tiendaId != null ? cfg.tiendaId : '',
        cajaId:                  cfg.cajaId != null ? cfg.cajaId : '',
      });
    }
  }, [cfg]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const b = sp.get('billing');
    if (b !== 'success' && b !== 'cancel') return;
    void qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
    void qc.invalidateQueries({ queryKey: [BILLING_STATUS_KEY] });
    if (b === 'success') toast.success('Facturación actualizada');
    if (b === 'cancel') toast.info('Checkout cerrado sin completar el pago');
    window.history.replaceState({}, '', '/configuracion');
  }, [qc]);

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGuardar = async () => {
    if (!form.nombreCompania.trim()) {
      if (!window.confirm(
        'El nombre de la empresa está vacío. Los recibos y comprobantes pueden verse incompletos. ¿Deseas guardar de todos modos?'
      )) return;
    }

    if (form.cajaId !== '' && form.tiendaId !== '') {
      const c = cajasLista.find((x) => x.id === form.cajaId);
      if (c?.tienda?.id != null && Number(form.tiendaId) !== c.tienda.id) {
        if (!window.confirm(
          'La caja del catálogo no pertenece a la sucursal POS seleccionada. ¿Guardar de todos modos? (Revisa que coincida con tu operación real.)'
        )) return;
      }
    }

    if (form.cajaId !== '' && form.tiendaId === '') {
      const c = cajasLista.find((x) => x.id === form.cajaId);
      if (c?.tienda) {
        if (!window.confirm(
          'Hay una caja del catálogo seleccionada pero no hay sucursal POS asignada. Conviene elegir la misma sucursal que la de la caja. ¿Guardar de todos modos?'
        )) return;
      }
    }

    try {
      await actualizar.mutateAsync({
        ...form,
        tiendaId: form.tiendaId === '' ? null : form.tiendaId,
        cajaId:   form.cajaId === '' ? null : form.cajaId,
        textoPieRecibo: form.textoPieRecibo.trim() || null,
        fiscalJurisdiccion: form.fiscalJurisdiccion === '' ? null : form.fiscalJurisdiccion,
      });
      toast.success('Configuración guardada');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" breadcrumb={['Panel', 'Configuración']} />

      {saasOk && saas ? (
        <SectionCard
          title="Plan y uso"
          icon={<Layers size={16} />}
          description="Resumen del plan comercial de esta organización (también visible en la cabecera)."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-navy-400 mb-0.5">Organización</p>
              <p className="font-medium text-navy-800">{saas.tenant.nombre}</p>
              <p className="text-xs text-navy-500 mt-0.5 font-mono">{saas.tenant.slug}</p>
            </div>
            <div>
              <p className="text-xs text-navy-400 mb-0.5">Plan</p>
              <p className="font-semibold text-navy-800">{saas.limits.label}</p>
            </div>
            <div>
              <p className="text-xs text-navy-400 mb-0.5">Usuarios (asientos)</p>
              <p className="text-navy-800">
                {saas.usage.seats}
                {saas.limits.maxUsers != null ? (
                  <span className="text-navy-500"> / {saas.limits.maxUsers}</span>
                ) : (
                  <span className="text-navy-400 text-xs ml-1">(sin tope en este plan)</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-navy-400 mb-0.5">Sucursales activas</p>
              <p className="text-navy-800">
                {saas.usage.tiendasActivas}
                {saas.limits.maxTiendas != null ? (
                  <span className="text-navy-500"> / {saas.limits.maxTiendas}</span>
                ) : (
                  <span className="text-navy-400 text-xs ml-1">(sin tope en este plan)</span>
                )}
              </p>
            </div>
          </div>
          <BillingStripePanel />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Guía rápida — sucursales, cajas y equipo"
        icon={<BookOpen size={16} />}
        description="Estos módulos trabajan junto con el POS y los recibos. Mantén los datos alineados para evitar errores al cobrar."
      >
        <ul className="space-y-3 text-sm text-navy-700">
          <li className="flex items-start gap-2">
            <span className="text-navy-400 mt-0.5">•</span>
            <span>
              Registra cada <strong>ubicación</strong> en{' '}
              <Link href="/tiendas" className="text-primary-600 font-medium inline-flex items-center gap-1 hover:underline">
                Tiendas <Store size={14} /><ArrowRight size={12} className="opacity-60" />
              </Link>
              {' '}antes de asignar cajas o empleados.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-navy-400 mt-0.5">•</span>
            <span>
              Cada <strong>caja física o lógica</strong> debe existir en{' '}
              <Link href="/cajas" className="text-primary-600 font-medium inline-flex items-center gap-1 hover:underline">
                Cajas <Wallet size={14} /><ArrowRight size={12} className="opacity-60" />
              </Link>
              {' '}vinculada a su sucursal. Los cajeros solo ven las cajas de su tienda.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-navy-400 mt-0.5">•</span>
            <span>
              En{' '}
              <Link href="/empleados" className="text-primary-600 font-medium inline-flex items-center gap-1 hover:underline">
                Empleados <Users size={14} /><ArrowRight size={12} className="opacity-60" />
              </Link>
              {' '}asigna la <strong>misma sucursal</strong> al cajero que la de las cajas que usará. Los administradores no llevan sucursal fija.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-navy-400 mt-0.5">•</span>
            <span>
              Abajo, <strong>Sucursal (POS)</strong> y <strong>Caja (catálogo)</strong> definen el terminal por defecto; el cajero con varias cajas puede elegir al abrir sesión.
            </span>
          </li>
        </ul>
      </SectionCard>

      {/* Información de la empresa */}
      <SectionCard
        title="Información de la Empresa"
        icon={<Building2 size={16} />}
        description="Datos que aparecerán en facturas, comprobantes y reportes"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field
            label="Nombre de la empresa"
            hint="Aparece en recibos e impresiones. Si queda vacío, el sistema usará un nombre genérico."
            col
          >
            <input className="input-field" value={form.nombreCompania}
              onChange={(e) => set('nombreCompania', e.target.value)}
              placeholder="Ej: Mi Negocio EIRL" />
          </Field>
          <Field label="RNC" hint="Registro Nacional del Contribuyente (DGII)" col>
            <input className="input-field" value={form.rnc}
              onChange={(e) => set('rnc', e.target.value)}
              placeholder="Ej: 132428668" />
          </Field>
          <Field label="Teléfono" col>
            <input className="input-field" value={form.telefono}
              onChange={(e) => set('telefono', e.target.value)}
              placeholder="Ej: 809-000-0000" />
          </Field>
          <Field label="Sitio web" col>
            <input className="input-field" value={form.sitioWeb}
              onChange={(e) => set('sitioWeb', e.target.value)}
              placeholder="Ej: www.minegocio.com" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dirección">
              <input className="input-field" value={form.direccion}
                onChange={(e) => set('direccion', e.target.value)}
                placeholder="Ej: Calle 15 #26, Santiago" />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* Apariencia y recibos */}
      <SectionCard
        title="Apariencia y Recibos"
        icon={<Image size={16} />}
        description="Personalización visual de facturas y comprobantes impresos"
      >
        <Field label="URL del logotipo"
          hint="Enlace público a la imagen (PNG/JPG). Se mostrará en la cabecera de los recibos impresos.">
          <input className="input-field" value={form.logotipoUrl}
            onChange={(e) => set('logotipoUrl', e.target.value)}
            placeholder="https://miempresa.com/logo.png" />
        </Field>
        {form.logotipoUrl && (
          <div className="flex items-center gap-3 p-3 bg-navy-50 rounded-lg border border-navy-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.logotipoUrl} alt="Logo preview"
              className="h-10 w-auto object-contain rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <p className="text-xs text-navy-500">Vista previa del logotipo</p>
          </div>
        )}

        <Field
          label="Texto adicional al pie del recibo"
          hint="Opcional. Se muestra debajo de «Gracias por su compra» en ticket e impresión (varias líneas permitidas)."
        >
          <textarea
            className="input-field min-h-[88px] resize-y"
            value={form.textoPieRecibo}
            onChange={(e) => set('textoPieRecibo', e.target.value)}
            placeholder="Ej: Horario Lun–Sáb 8–18 h · Políticas de cambio según ticket"
            rows={4}
          />
        </Field>
      </SectionCard>

      {/* Moneda e impuestos */}
      <SectionCard
        title="Moneda e Impuestos"
        icon={<DollarSign size={16} />}
        description="Configuración fiscal y formato de precios"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Símbolo de moneda" col>
            <input className="input-field" value={form.simboloMoneda}
              onChange={(e) => set('simboloMoneda', e.target.value)}
              placeholder="RDS" maxLength={5} />
          </Field>
          <Field label="Decimales en precios" hint="Número de decimales al mostrar montos" col>
            <select className="input-field" value={form.numeroDecimales}
              onChange={(e) => set('numeroDecimales', Number(e.target.value))}>
              <option value={0}>0 — sin decimales (ej: 100)</option>
              <option value={2}>2 — estándar (ej: 100.00)</option>
            </select>
          </Field>
        </div>

        <div className="border-t border-navy-100/40 pt-5">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-4">Impuesto 1 (ITBIS)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Field label="Nombre del impuesto" hint="Ej: ITBIS, IVA, TAX" col>
              <input className="input-field" value={form.tasaImpuesto1Nombre}
                onChange={(e) => set('tasaImpuesto1Nombre', e.target.value)}
                placeholder="ITBIS" />
            </Field>
            <Field label="Tasa (%)" col>
              <div className="flex items-center gap-2">
                <input type="number" className="input-field" value={form.tasaImpuesto1}
                  onChange={(e) => set('tasaImpuesto1', Number(e.target.value))}
                  min={0} max={100} step={0.01} />
                <span className="text-navy-500 font-semibold shrink-0">%</span>
              </div>
            </Field>
          </div>
        </div>

        <div className="border-t border-navy-100/40 pt-5">
          <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-4">
            Impuesto 2 <span className="font-normal normal-case text-navy-400">(opcional)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Field label="Nombre" col>
              <input className="input-field" value={form.tasaImpuesto2Nombre}
                onChange={(e) => set('tasaImpuesto2Nombre', e.target.value)}
                placeholder="Ej: Propina legal" />
            </Field>
            <Field label="Tasa (%)" col>
              <div className="flex items-center gap-2">
                <input type="number" className="input-field" value={form.tasaImpuesto2}
                  onChange={(e) => set('tasaImpuesto2', Number(e.target.value))}
                  min={0} max={100} step={0.01} />
                <span className="text-navy-500 font-semibold shrink-0">%</span>
              </div>
            </Field>
          </div>
        </div>

        <div className="border-t border-navy-100/40 pt-5">
          <Toggle
            checked={form.preciosIncluyenImpuesto}
            onChange={(v) => set('preciosIncluyenImpuesto', v)}
            label="Los precios ya incluyen el impuesto"
            hint="Si está activo, el ITBIS se calcula hacia atrás sobre el precio de venta"
          />
        </div>
      </SectionCard>

      {/* Comprobantes fiscales */}
      <SectionCard
        title="Comprobantes Fiscales (NCF)"
        icon={<FileText size={16} />}
        description="Configuración de comprobantes fiscales requeridos por la DGII"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Jurisdicción fiscal (instancia)"
            hint="Vacío: se usa la variable del servidor (FISCAL_JURISDICTION). DO: NCF/DGII. NONE: no emitir comprobante fiscal desde la API."
          >
            <select
              className="input-field"
              value={form.fiscalJurisdiccion}
              onChange={(e) =>
                set('fiscalJurisdiccion', e.target.value as '' | 'DO' | 'NONE')
              }
            >
              <option value="">Según servidor (.env)</option>
              <option value="DO">República Dominicana (DGII / NCF)</option>
              <option value="NONE">Sin comprobante fiscal (NCF)</option>
            </select>
          </Field>
          <Field label="Tipo de comprobante por defecto"
            hint="Se preseleccionará automáticamente al procesar cada venta">
            <select className="input-field" value={form.comprobanteDefecto}
              onChange={(e) => set('comprobanteDefecto', e.target.value)}>
              <option value="01">B01 — Crédito Fiscal</option>
              <option value="02">B02 — Consumidor Final</option>
              <option value="04">B04 — Nota de Crédito</option>
              <option value="14">B14 — Régimen Especial</option>
              <option value="15">B15 — Gubernamental</option>
            </select>
          </Field>
          <Field label="Sucursal (POS)"
            hint="Se asocia la apertura de caja y los gastos del día a esta tienda. Deja vacío si solo hay una ubicación.">
            <select
              className="input-field"
              value={form.tiendaId === '' ? '' : String(form.tiendaId)}
              onChange={(e) => {
                const v = e.target.value;
                set('tiendaId', v === '' ? '' : Number(v));
                set('cajaId', '');
              }}
            >
              <option value="">Sin asignar</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Caja (catálogo)"
            hint="Crea y asigna cajas en el menú «Cajas». Si eliges una, el POS abre sesión por ID (recomendado con varias sucursales).">
            <select
              className="input-field"
              value={form.cajaId === '' ? '' : String(form.cajaId)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  set('cajaId', '');
                  return;
                }
                const id = Number(v);
                const c = cajasLista.find((x) => x.id === id);
                setForm((prev) => ({
                  ...prev,
                  cajaId: id,
                  nombreCaja: c?.nombre ?? prev.nombreCaja,
                  tiendaId: c?.tienda?.id != null ? c.tienda.id : prev.tiendaId,
                }));
              }}
            >
              <option value="">Sin catálogo (usar nombre abajo)</option>
              {(form.tiendaId === ''
                ? cajasLista
                : cajasLista.filter((c) => c.tienda?.id === form.tiendaId)
              ).filter(
                (c) => c.activo || (form.cajaId !== '' && c.id === form.cajaId)
              ).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tienda?.nombre ? `${c.tienda.nombre} — ` : ''}{c.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre de la caja (texto libre)" hint="Se usa si no eliges una caja del catálogo, o como etiqueta mostrada.">
            <input className="input-field" value={form.nombreCaja}
              onChange={(e) => set('nombreCaja', e.target.value)}
              placeholder="CAJA 1" />
          </Field>
        </div>
      </SectionCard>

      {/* Acerca del sistema */}
      <SectionCard
        title="Acerca del Sistema"
        icon={<Hash size={16} />}
        description="Información técnica del sistema"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Versión (frontend)', value: APP_VERSION },
            { label: 'Entorno', value: APP_ENTORNO },
            { label: 'País', value: 'República Dominicana' },
            { label: 'Símbolo moneda (config)', value: form.simboloMoneda || 'RDS' },
          ].map((item) => (
            <div key={item.label} className="bg-navy-50 rounded-xl p-4 border border-navy-100">
              <p className="text-xs text-navy-400 mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-navy-700">{item.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Guardar */}
      <div className="flex justify-end pb-2">
        <button
          onClick={handleGuardar}
          disabled={actualizar.isPending}
          className={`btn-primary flex items-center gap-2 px-8 py-3 text-sm font-semibold ${
            saved ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : ''
          }`}
        >
          {actualizar.isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <Save size={16} />}
          {actualizar.isPending ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
