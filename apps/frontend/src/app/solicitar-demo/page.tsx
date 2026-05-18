'use client';

import { useState } from 'react';
import Link from 'next/link';
import { appBrand } from '@/lib/app-brand';
import { Send } from 'lucide-react';
import { PublicPageShell } from '@/components/layout/PublicPageShell';

/**
 * Opción C ligera (Fase 0): lead por correo sin crear tenant ni API pública.
 * Si más adelante hay backend de leads, sustituir el mailto por POST.
 */
export default function SolicitarDemoPage() {
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [sent, setSent] = useState(false);

  const mail = appBrand.contactEmail?.trim() ?? '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mail) {
      window.alert(
        'Configura NEXT_PUBLIC_CONTACT_EMAIL en el despliegue para enviar la solicitud por correo.',
      );
      return;
    }
    const subject = encodeURIComponent(`Solicitud demo — ${empresa || 'sin empresa'}`);
    const body = encodeURIComponent(
      `Nombre: ${nombre}\nEmpresa: ${empresa}\nEmail: ${email}\n\n${notas || '(sin notas adicionales)'}\n`,
    );
    window.location.href = `mailto:${mail}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <PublicPageShell>
      <main className="card p-8">
        <h1 className="font-display text-xl font-bold tracking-tight text-navy-800 mb-1">Solicitar demo</h1>
        <p className="text-sm text-navy-500 mb-6">
          Te contactamos para agendar una demostración. No creamos una cuenta automáticamente; el alta de
          organización sigue siendo{' '}
          <Link href="/login" className="text-primary-600 hover:underline">
            por invitación
          </Link>{' '}
          según el proceso comercial.
        </p>

        {!mail && (
          <div
            id="solicitar-demo-mail-warning"
            role="alert"
            className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          >
            Falta configurar <code className="font-mono">NEXT_PUBLIC_CONTACT_EMAIL</code> en este entorno.
          </div>
        )}

        <form
          onSubmit={submit}
          className="space-y-4"
          aria-describedby={!mail ? 'solicitar-demo-mail-warning' : undefined}
        >
          <div>
            <label htmlFor="solicitar-demo-nombre" className="block text-sm font-semibold text-navy-700 mb-1">Tu nombre</label>
            <input
              id="solicitar-demo-nombre"
              className="input-field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="solicitar-demo-empresa" className="block text-sm font-semibold text-navy-700 mb-1">Empresa o proyecto</label>
            <input
              id="solicitar-demo-empresa"
              className="input-field"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="solicitar-demo-email" className="block text-sm font-semibold text-navy-700 mb-1">Correo electrónico</label>
            <input
              id="solicitar-demo-email"
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="solicitar-demo-notas" className="block text-sm font-semibold text-navy-700 mb-1">Notas (opcional)</label>
            <span id="solicitar-demo-notas-hint" className="sr-only">Rubro, número de sucursales, país…</span>
            <textarea
              id="solicitar-demo-notas"
              className="input-field min-h-[100px]"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Rubro, número de sucursales, país…"
              aria-describedby="solicitar-demo-notas-hint"
            />
          </div>

          <button type="submit" className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2">
            <Send size={18} />
            Abrir correo para enviar
          </button>
        </form>

        {sent && (
          <p className="text-xs text-navy-500 mt-4 text-center">
            Si tu cliente de correo no se abrió, escribe manualmente a{' '}
            <span className="font-mono">{mail || '—'}</span>.
          </p>
        )}

        <p className="text-xs text-navy-400 mt-8 text-center">
          <Link href="/terminos" className="underline decoration-navy-300/80 underline-offset-2 hover:text-navy-700">
            Términos
          </Link>
          {' · '}
          <Link href="/privacidad" className="underline decoration-navy-300/80 underline-offset-2 hover:text-navy-700">
            Privacidad
          </Link>
        </p>
      </main>
    </PublicPageShell>
  );
}
