'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { SAAS_CONTEXT_KEY } from '@/hooks/useSaasContext';
import { tenantsService, type TenantRow } from '@/services/tenants.service';
import { appBrand } from '@/lib/app-brand';
import { Building2 } from 'lucide-react';

export default function SelectOrganizacionPage() {
  const router  = useRouter();
  const qc      = useQueryClient();
  const user    = useAuthStore((s) => s.user);
  const loaded  = useAuthStore((s) => s.loaded);
  const setPtid = useAuthStore((s) => s.setPlatformTenantId);
  const logout  = useAuthStore((s) => s.logout);

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.rol !== 'plataforma') {
      router.replace('/panel');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await tenantsService.list();
        if (!cancelled) setTenants(list);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar las organizaciones');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loaded, user, router]);

  const choose = (id: number) => {
    setPtid(id);
    void qc.invalidateQueries({ queryKey: [SAAS_CONTEXT_KEY] });
    router.replace('/panel');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7FAF9] p-6">
      <main aria-labelledby="select-organizacion-heading" className="w-full max-w-md">
        <h1 id="select-organizacion-heading" className="sr-only">
          Seleccionar organización
        </h1>
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Building2 className="text-white" size={22} />
          </div>
          <div>
            <p className="font-bold text-navy-800 text-lg">{appBrand.shortName}</p>
            <p className="text-xs text-navy-400">Elegí en qué organización operar</p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {!loading && !error && (
          <ul className="space-y-2">
            {tenants.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => choose(t.id)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-navy-100 bg-white shadow-sm hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
                >
                  <span className="font-semibold text-navy-800">{t.nombre}</span>
                  <span className="block text-xs text-navy-400 mt-0.5">{t.slug} · id {t.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => { void logout(); router.replace('/login'); }}
          className="mt-8 w-full text-sm text-navy-400 hover:text-navy-600"
        >
          Cerrar sesión
        </button>
      </main>
    </div>
  );
}
