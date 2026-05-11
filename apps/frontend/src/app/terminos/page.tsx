import type { Metadata } from 'next';
import Link from 'next/link';
import { appBrand } from '@/lib/app-brand';

export const metadata: Metadata = {
  title: `Términos del servicio — ${appBrand.shortName}`,
  description: 'Condiciones generales de uso del software (plantilla).',
};

export default function TerminosPage() {
  return (
    <main aria-labelledby="terminos-heading" className="min-h-screen bg-[#F7FAF9] py-12 px-6">
      <article className="max-w-2xl mx-auto bg-white rounded-[14px] shadow-card border border-navy-100/50 p-8 md:p-10">
        <h1 id="terminos-heading" className="text-2xl font-semibold text-navy-900 mb-2">
          Términos del servicio
        </h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2 mb-6">
          <strong>Revisión jurídica pendiente:</strong> este texto es plantilla operativa. Sustituir o ajustar con
          asesoría legal antes de escala comercial o tráfico público masivo.
        </p>
        <p className="text-sm text-navy-500 mb-8">
          Texto orientativo para despliegues internos. Debe ser revisado por asesoría legal antes de un go-live
          comercial.
        </p>

        <div className="text-sm text-navy-700 space-y-4 leading-relaxed">
          <p>
            El uso de <strong>{appBrand.shortName}</strong> implica la aceptación de estas condiciones. El titular del
            servicio (proveedor del software) y el cliente (suscriptor u organización registrada) acuerdan utilizar la
            plataforma de acuerdo con la legislación aplicable y la buena fe.
          </p>
          <p>
            El software se ofrece &quot;tal cual&quot;; el proveedor puede modificar funcionalidades, límites de planes o
            condiciones con aviso razonable cuando ello sea posible.
          </p>
          <p>
            Los datos introducidos por el cliente (ventas, inventario, clientes finales, etc.) son responsabilidad del
            cliente respecto a su licitud y exactitud. El proveedor actúa como encargado del tratamiento según lo que se
            detalle en la política de privacidad.
          </p>
          <p>
            La facturación del producto (suscripción) se gestiona según el plan contratado y los medios de pago
            habilitados (p. ej. Stripe). El impago puede conllevar restricción de acceso según la configuración del
            entorno.
          </p>
        </div>

        <p className="text-xs text-navy-400 mt-10 pt-6 border-t border-navy-100">
          Última actualización del documento genérico: abril 2026.
        </p>

        <p className="mt-6">
          <Link href="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </article>
    </main>
  );
}
