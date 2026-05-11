import type { Metadata } from 'next';
import Link from 'next/link';
import { appBrand } from '@/lib/app-brand';

export const metadata: Metadata = {
  title: `Privacidad — ${appBrand.shortName}`,
  description: 'Información sobre tratamiento de datos (plantilla).',
};

export default function PrivacidadPage() {
  return (
    <main aria-labelledby="privacidad-heading" className="min-h-screen bg-[#F7FAF9] py-12 px-6">
      <article className="max-w-2xl mx-auto bg-white rounded-[14px] shadow-card border border-navy-100/50 p-8 md:p-10">
        <h1 id="privacidad-heading" className="text-2xl font-semibold text-navy-900 mb-2">
          Política de privacidad
        </h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2 mb-6">
          <strong>Revisión jurídica pendiente:</strong> plantilla para transparencia básica; completar según ley
          aplicable (p. ej. RD Ley 172-13) y encargado/DPO reales.
        </p>
        <p className="text-sm text-navy-500 mb-8">
          Resumen para transparencia. Ajustar a la normativa local (p. ej. Ley 172-13 en RD) y revisión jurídica antes de
          producción pública.
        </p>

        <div className="text-sm text-navy-700 space-y-4 leading-relaxed">
          <p>
            <strong>Responsable:</strong> la entidad que opera el despliegue de {appBrand.shortName} (configurable en
            variables de entorno y marca en pantalla).
          </p>
          <p>
            <strong>Datos tratados:</strong> datos de cuenta (correo, nombre, organización), datos de uso de la
            aplicación y datos de negocio que el cliente carga (productos, ventas, etc.). Pueden tratarse datos de
            terceros (clientes finales del negocio) en calidad de encargado según instrucciones del cliente.
          </p>
          <p>
            <strong>Finalidad:</strong> prestación del servicio, facturación del software, soporte, seguridad y mejora
            operativa.
          </p>
          <p>
            <strong>Conservación:</strong> mientras dure la relación contractual y los plazos legales aplicables.
          </p>
          <p>
            <strong>Derechos:</strong> el interesado puede solicitar acceso, rectificación, supresión u oposición según
            la ley aplicable, contactando al correo de soporte indicado en la aplicación o en la documentación de
            despliegue.
          </p>
          <p>
            <strong>Encargados de tratamiento:</strong> pueden intervenir proveedores de infraestructura o pasarelas de
            pago (p. ej. Stripe) bajo acuerdos de tratamiento de datos conforme a sus políticas.
          </p>
        </div>

        <p className="text-xs text-navy-400 mt-10 pt-6 border-t border-navy-100">
          Documento plantilla — abril 2026.
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
