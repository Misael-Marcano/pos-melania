'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, Package, BarChart2, Users, Store, FileText,
  CheckCircle2, ArrowRight, Zap, Shield, Globe, Receipt,
  TrendingUp, Layers, Lock, Mail, MessageCircle, X,
} from 'lucide-react';
import { appBrand, copyrightLine } from '@/lib/app-brand';

// ── Plan data (debe coincidir con apps/backend/src/saas/plan-limits.ts) ──────
// Verificación: `npm run verify:landing-plans` en la raíz del monorepo (también en CI).

const PLANS = [
  {
    code:        'starter',
    label:       'Starter',
    price:       '$29',
    period:      '/mes',
    description: 'Para negocios pequeños con un solo local y equipo reducido.',
    highlight:   false,
    accent:      'from-slate-500 to-slate-700',
    limits:      ['3 usuarios', '1 sucursal', 'Hasta 500 artículos'],
    features: [
      'Ventas y POS',
      'Inventario y categorías',
      'Clientes y crédito',
      'Gastos por categoría',
      'Cajas y cierres en PDF',
      'Reportes básicos',
      'NCF / DGII fiscal',
      'Auditoría de cambios',
    ],
    locked: [
      'Kits y combos',
      'Cotizaciones',
      'Promociones',
      'Tarjetas regalo',
      'Recetas / BOM',
      'Compras a proveedores',
    ],
    cta: 'Contratar Starter',
  },
  {
    code:        'standard',
    label:       'Standard',
    price:       '$79',
    period:      '/mes',
    description: 'Multi-sucursal con todos los módulos desbloqueados.',
    highlight:   true,
    accent:      'from-primary-500 to-primary-700',
    limits:      ['15 usuarios', '5 sucursales', 'Hasta 5 000 artículos'],
    features: [
      'Todo lo de Starter',
      'Kits y combos de artículos',
      'Cotizaciones → venta directa',
      'Promociones y descuentos',
      'Tarjetas regalo',
      'Recetas / BOM (producción)',
      'Compras y órdenes a proveedores',
      'Reportes avanzados + DGII 607/606',
    ],
    locked: [],
    cta: 'Contratar Standard',
  },
  {
    code:        'enterprise',
    label:       'Enterprise',
    price:       '$199',
    period:      '/mes',
    description: 'Sin límites. Ideal para cadenas de tiendas y franquicias.',
    highlight:   false,
    accent:      'from-amber-600 to-amber-800',
    limits:      ['Usuarios ilimitados', 'Sucursales ilimitadas', 'Artículos ilimitados'],
    features: [
      'Todo lo de Standard',
      'Multi-organización (plataforma)',
      'Panel de administración global',
      'Onboarding dedicado',
      'Soporte prioritario',
    ],
    locked: [],
    cta: 'Contactar ventas',
  },
] as const;

// ── Módulos ──────────────────────────────────────────────────────────────────

const MODULES = [
  {
    icon:    <ShoppingCart size={22} />,
    label:   'Ventas y POS',
    desc:    'Procesa ventas con múltiples métodos de pago, NCF y cambio automático.',
    color:   'bg-blue-50 text-blue-600',
    border:  'border-blue-100',
  },
  {
    icon:    <Package size={22} />,
    label:   'Inventario',
    desc:    'Stock en tiempo real, ajustes, import CSV y auditoría de movimientos.',
    color:   'bg-violet-50 text-violet-600',
    border:  'border-violet-100',
  },
  {
    icon:    <Users size={22} />,
    label:   'Clientes y crédito',
    desc:    'Cartera de clientes, límites de crédito, abonos y saldo pendiente.',
    color:   'bg-emerald-50 text-emerald-600',
    border:  'border-emerald-100',
  },
  {
    icon:    <Store size={22} />,
    label:   'Multi-sucursal',
    desc:    'Gestiona varias tiendas, cajas y cajeros desde un solo panel.',
    color:   'bg-orange-50 text-orange-600',
    border:  'border-orange-100',
  },
  {
    icon:    <BarChart2 size={22} />,
    label:   'Reportes',
    desc:    'Ventas, P&L, inventario valorizado, clientes y exportaciones DGII.',
    color:   'bg-sky-50 text-sky-600',
    border:  'border-sky-100',
  },
  {
    icon:    <FileText size={22} />,
    label:   'Fiscal NCF / DGII',
    desc:    'Series fiscales configurables y checklist operativo para República Dominicana.',
    color:   'bg-rose-50 text-rose-600',
    border:  'border-rose-100',
  },
  {
    icon:    <Receipt size={22} />,
    label:   'Cajas y cierres',
    desc:    'Sesiones de caja, resumen de turno y PDF de cierre por sucursal.',
    color:   'bg-teal-50 text-teal-600',
    border:  'border-teal-100',
  },
  {
    icon:    <Layers size={22} />,
    label:   'Kits y cotizaciones',
    desc:    'Arma combos de productos, genera presupuestos y conviértelos en venta.',
    color:   'bg-indigo-50 text-indigo-600',
    border:  'border-indigo-100',
  },
  {
    icon:    <TrendingUp size={22} />,
    label:   'Compras y proveedores',
    desc:    'Órdenes de compra con estados, recepción y actualización automática de stock.',
    color:   'bg-amber-50 text-amber-600',
    border:  'border-amber-100',
  },
] as const;

// ── Stat strip ───────────────────────────────────────────────────────────────

const STATS = [
  { value: '99.9%',  label: 'Disponibilidad' },
  { value: '< 3 s',  label: 'Tiempo de respuesta' },
  { value: 'NCF/RD', label: 'Cumplimiento DGII' },
  { value: 'Multi',  label: 'Sucursal nativo' },
] as const;

// ── Contact Modal ─────────────────────────────────────────────────────────────

function ContactModal({ plan, onClose }: { plan: typeof PLANS[number] | null; onClose: () => void }) {
  if (!plan) return null;

  const email     = appBrand.contactEmail;
  const whatsapp  = appBrand.contactWhatsapp;
  const subject   = encodeURIComponent(`Interés en plan ${plan.label} — ${plan.price}${plan.period}`);
  const body      = encodeURIComponent(
    `Hola, me interesa el plan ${plan.label} (${plan.price}${plan.period}) del sistema POS.\n\nQuedo atento/a a los detalles para proceder con el pago.`,
  );
  const waText    = encodeURIComponent(
    `Hola, me interesa el plan *${plan.label}* (${plan.price}${plan.period}) del sistema POS. ¿Cómo procedo?`,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-br ${plan.accent} px-7 pt-7 pb-6 relative`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} className="text-white" />
          </button>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Plan seleccionado</p>
          <h2 className="text-2xl font-extrabold text-white font-display">{plan.label}</h2>
          <p className="text-white/70 text-sm mt-1">{plan.price}{plan.period} · {plan.description}</p>
        </div>

        {/* Body */}
        <div className="px-7 py-6">
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Contáctanos por cualquiera de estos canales y un asesor te guiará con el proceso de pago y activación de tu cuenta.
          </p>

          <div className="space-y-3">
            {email && (
              <a
                href={`mailto:${email}?subject=${subject}&body=${body}`}
                className="flex items-center gap-4 w-full bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded-2xl px-5 py-4 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center shrink-0 transition-colors">
                  <Mail size={18} className="text-primary-700" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">Correo electrónico</p>
                  <p className="text-xs text-gray-500 truncate">{email}</p>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-500 ml-auto shrink-0 transition-colors" />
              </a>
            )}

            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 w-full bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-2xl px-5 py-4 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 group-hover:bg-green-200 flex items-center justify-center shrink-0 transition-colors">
                  <MessageCircle size={18} className="text-green-700" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">WhatsApp</p>
                  <p className="text-xs text-gray-500">+{whatsapp}</p>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-green-500 ml-auto shrink-0 transition-colors" />
              </a>
            )}

            {!email && !whatsapp && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
                Configure <code className="font-mono text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_CONTACT_EMAIL</code> o <code className="font-mono text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_CONTACT_WHATSAPP</code> para activar el contacto.
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Respuesta en menos de 24 horas hábiles.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onContact,
}: {
  plan: typeof PLANS[number];
  onContact: (p: typeof PLANS[number]) => void;
}) {
  const isHighlight = plan.highlight;

  return (
    <div
      className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-200 ${
        isHighlight
          ? 'shadow-2xl shadow-primary-900/25 ring-2 ring-primary-400/60'
          : 'shadow-md hover:shadow-xl border border-gray-100'
      }`}
      style={isHighlight ? { transform: 'translateY(-8px)' } : {}}
    >
      {/* Header gradient */}
      <div className={`bg-gradient-to-br ${plan.accent} px-7 pt-7 pb-8`}>
        {isHighlight && (
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
            <Zap size={10} /> Más popular
          </div>
        )}
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{plan.label}</p>
        <div className="flex items-end gap-1.5 mb-1">
          <span className="text-5xl font-extrabold text-white font-display leading-none">{plan.price}</span>
          <span className="text-white/50 text-sm mb-1">{plan.period}</span>
        </div>
        <p className="text-white/60 text-sm mt-3 leading-relaxed">{plan.description}</p>
      </div>

      {/* Body */}
      <div className="bg-white flex flex-col flex-1 px-7 py-6">
        {/* Limits */}
        <div className="flex flex-wrap gap-2 mb-5 pb-5 border-b border-gray-100">
          {plan.limits.map((l) => (
            <span key={l} className="text-xs bg-gray-50 text-gray-600 font-medium px-2.5 py-1 rounded-full border border-gray-200">
              {l}
            </span>
          ))}
        </div>

        {/* Features */}
        <ul className="space-y-2.5 flex-1 mb-6">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
              <span className="text-gray-700">{f}</span>
            </li>
          ))}
          {plan.locked.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm opacity-40 select-none">
              <Lock size={13} className="mt-0.5 shrink-0 text-gray-400" />
              <span className="text-gray-400 line-through">{f}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onContact(plan)}
          className={`block w-full text-center py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all cursor-pointer ${
            isHighlight
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white shadow-lg shadow-primary-900/20'
              : 'bg-[#273727] hover:bg-[#1e2b1e] text-white'
          }`}
        >
          {plan.cta}
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [contactPlan, setContactPlan] = useState<typeof PLANS[number] | null>(null);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">

      <ContactModal plan={contactPlan} onClose={() => setContactPlan(null)} />

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center shadow-md group-hover:shadow-primary-500/30 transition-shadow">
              <span className="text-white font-extrabold text-[11px] tracking-tight">POS</span>
            </div>
            <span className="font-bold text-[#273727] text-base tracking-tight">{appBrand.shortName}</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#planes" className="hidden sm:block text-sm font-medium text-gray-500 hover:text-[#273727] transition-colors">
              Planes
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 bg-[#273727] hover:bg-[#1e2b1e] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Iniciar sesión <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      <main aria-labelledby="landing-heading">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#1d2b1d] text-white overflow-hidden">
        {/* Mesh background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_#3D4E3D,_transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-400/30 to-transparent" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          {/* Glow blobs */}
          <div className="absolute -top-32 right-0 w-[600px] h-[600px] rounded-full bg-primary-400/10 blur-3xl" />
          <div className="absolute top-1/2 -left-48 w-96 h-96 rounded-full bg-emerald-400/5 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary-400/15 border border-primary-400/25 text-primary-200 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <Zap size={11} className="text-primary-300" />
            Sistema POS completo para retail
          </div>

          <h1 id="landing-heading" className="text-5xl sm:text-6xl md:text-7xl font-extrabold font-display tracking-tight leading-[1.05] mb-6">
            Vende más.<br />
            <span className="bg-gradient-to-r from-primary-200 via-emerald-200 to-primary-300 bg-clip-text text-transparent">
              Controla todo.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
            POS multi-sucursal con inventario, crédito a clientes, comprobantes fiscales (NCF/DGII)
            y reportes avanzados. Desde una caja hasta una cadena de tiendas.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-400 to-primary-600 hover:from-primary-300 hover:to-primary-500 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all shadow-xl shadow-primary-900/40 hover:shadow-primary-900/50 hover:-translate-y-0.5"
            >
              Acceder al sistema <ArrowRight size={17} />
            </Link>
            <a
              href="#planes"
              className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all hover:-translate-y-0.5"
            >
              Ver planes y precios
            </a>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                <p className="text-xl font-extrabold text-white font-display">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative h-16 overflow-hidden">
          <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full">
            <path d="M0 64L1440 64L1440 32C1200 0 960 64 720 32C480 0 240 64 0 32L0 64Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── Social proof / pilares ────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon:    <Shield size={24} />,
                color:   'bg-emerald-500',
                title:   'Fiscalmente correcto',
                desc:    'NCF y series DGII integradas. Auditoría de cada cambio crítico. Exportaciones 607/606 listas para presentar.',
              },
              {
                icon:    <Globe size={24} />,
                color:   'bg-blue-500',
                title:   'Multi-sucursal nativo',
                desc:    'Abre nuevas tiendas sin cambiar de sistema. Cada sucursal con su caja, usuarios y reportes consolidados.',
              },
              {
                icon:    <Zap size={24} />,
                color:   'bg-amber-500',
                title:   'Listo en minutos',
                desc:    'Provisioning guiado, seed de datos de prueba y runbook operativo listo para el primer día en producción.',
              },
            ].map((b, i) => (
              <div key={i} className="relative bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow group">
                <div className={`w-12 h-12 rounded-2xl ${b.color} flex items-center justify-center text-white mb-5 shadow-lg`}>
                  {b.icon}
                </div>
                <h3 className="font-bold text-[#273727] text-lg mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
                <div className={`absolute bottom-0 left-7 right-7 h-0.5 ${b.color} rounded-full opacity-0 group-hover:opacity-20 transition-opacity`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500 mb-3">Módulos</p>
            <h2 className="text-4xl font-extrabold font-display text-[#273727] mb-4">
              Todo en un solo sistema
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              Desde la venta hasta el cumplimiento fiscal, sin depender de múltiples herramientas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-6 border ${m.border} hover:shadow-lg transition-all group cursor-default`}
              >
                <div className={`w-12 h-12 rounded-2xl ${m.color} flex items-center justify-center mb-4 shadow-sm`}>
                  {m.icon}
                </div>
                <h3 className="font-bold text-[#273727] mb-1.5">{m.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ────────────────────────────────────────────────────────── */}
      <section id="planes" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500 mb-3">Precios</p>
            <h2 className="text-4xl font-extrabold font-display text-[#273727] mb-4">
              Planes para cada etapa
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
              Empieza con lo que necesitas hoy y escala sin migrar de plataforma.
              Todos los planes incluyen actualizaciones automáticas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pb-4">
            {PLANS.map((plan) => (
              <PlanCard key={plan.code} plan={plan} onContact={setContactPlan} />
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-10">
            Precios en USD. Facturación mensual recurrente. IVA no incluido cuando aplique.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-500 mb-3">FAQ</p>
            <h2 className="text-4xl font-extrabold font-display text-[#273727]">Preguntas frecuentes</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: '¿Mis datos quedan en República Dominicana?',
                a: 'Sí. El sistema se despliega en la infraestructura que elijas (on-premise o nube propia). No existe transferencia de datos a terceros sin tu consentimiento.',
              },
              {
                q: '¿Puedo migrar desde otro POS?',
                a: 'El catálogo de artículos y la cartera de clientes se importan en CSV. Contamos con plantillas y acompañamiento en la migración para minimizar la interrupción operativa.',
              },
              {
                q: '¿Qué pasa si llego al límite de mi plan?',
                a: 'El sistema te avisa antes de alcanzar el tope. Al llegar, bloquea la creación de nuevos registros hasta que actualices el plan — sin afectar las operaciones ya registradas.',
              },
              {
                q: '¿El plan Starter incluye NCF?',
                a: 'Sí. Todos los planes incluyen el módulo de comprobantes fiscales (NCF), las series DGII y el checklist operativo para cumplir desde el primer día.',
              },
              {
                q: '¿Cómo funciona Enterprise para cadenas de tiendas?',
                a: 'Sin límite de sucursales activas. Cada tienda tiene su propia caja, equipo y configuración; los reportes se consolidan en una sola vista.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 px-7 py-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-[#273727] mb-2.5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {faq.q}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed pl-9">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative bg-[#1d2b1d] text-white overflow-hidden py-24">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_110%,_#3D4E3D,_transparent)]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary-900/50">
            <span className="text-white font-extrabold text-lg">POS</span>
          </div>
          <h2 className="text-4xl font-extrabold font-display mb-4 leading-tight">
            ¿Ya tienes una cuenta?
          </h2>
          <p className="text-white/50 mb-10 text-lg leading-relaxed">
            Accede directamente a tu panel de operaciones.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-primary-400 to-primary-600 hover:from-primary-300 hover:to-primary-500 text-white font-bold px-10 py-4 rounded-2xl text-base transition-all shadow-xl shadow-primary-900/40 hover:-translate-y-0.5"
          >
            Iniciar sesión <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#141e14] border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
              <span className="text-white/60 font-extrabold text-[10px]">POS</span>
            </div>
            <span className="text-white/40 text-sm font-medium">{appBrand.shortName}</span>
          </Link>
          <span className="text-white/25 text-xs">{copyrightLine()}</span>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/30">
            <a href="#planes" className="hover:text-white/50 transition-colors">Planes</a>
            <Link href="/solicitar-demo" className="hover:text-white/50 transition-colors">Solicitar demo</Link>
            <Link href="/terminos" className="hover:text-white/50 transition-colors">Términos</Link>
            <Link href="/privacidad" className="hover:text-white/50 transition-colors">Privacidad</Link>
            <Link href="/login" className="hover:text-white/50 transition-colors">Acceder</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
