'use client';

import { useEffect, useState } from 'react';
import { useConfiguracion, useActualizarConfiguracion } from '@/hooks/useConfiguracion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Building2, DollarSign, FileText, Save, Loader2, Image, Hash, Info } from 'lucide-react';
import { toast } from '@/store/toast.store';

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

export default function ConfiguracionPage() {
  const { data: cfg, isLoading } = useConfiguracion();
  const actualizar = useActualizarConfiguracion();

  const [form, setForm] = useState({
    nombreCompania:          '',
    rnc:                     '',
    direccion:               '',
    telefono:                '',
    sitioWeb:                '',
    logotipoUrl:             '',
    simboloMoneda:           'RDS',
    numeroDecimales:         2,
    tasaImpuesto1Nombre:     '',
    tasaImpuesto1:           0,
    tasaImpuesto2Nombre:     '',
    tasaImpuesto2:           0,
    preciosIncluyenImpuesto: true,
    comprobanteDefecto:      '02',
    nombreCaja:              'CAJA 1',
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
        simboloMoneda:           cfg.simboloMoneda           ?? 'RDS',
        numeroDecimales:         (cfg as any).numeroDecimales ?? 2,
        tasaImpuesto1Nombre:     cfg.tasaImpuesto1Nombre     ?? '',
        tasaImpuesto1:           cfg.tasaImpuesto1           ?? 0,
        tasaImpuesto2Nombre:     (cfg as any).tasaImpuesto2Nombre ?? '',
        tasaImpuesto2:           (cfg as any).tasaImpuesto2  ?? 0,
        preciosIncluyenImpuesto: cfg.preciosIncluyenImpuesto ?? true,
        comprobanteDefecto:      cfg.comprobanteDefecto      ?? '02',
        nombreCaja:              cfg.nombreCaja              ?? 'CAJA 1',
      });
    }
  }, [cfg]);

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGuardar = async () => {
    try {
      await actualizar.mutateAsync(form);
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

      {/* Información de la empresa */}
      <SectionCard
        title="Información de la Empresa"
        icon={<Building2 size={16} />}
        description="Datos que aparecerán en facturas, comprobantes y reportes"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Nombre de la empresa" col>
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
          <Field label="Nombre de la caja" hint="Identifica el punto de venta en apertura/cierre de caja">
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
            { label: 'Versión', value: '1.0.0' },
            { label: 'Entorno', value: 'Producción' },
            { label: 'País', value: 'República Dominicana' },
            { label: 'Moneda base', value: 'RDS (Peso dominicano)' },
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
