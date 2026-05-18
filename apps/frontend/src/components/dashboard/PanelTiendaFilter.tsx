'use client';

import { useEffect } from 'react';
import { Store } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { useAuthStore } from '@/store/auth.store';
import { useTiendas } from '@/hooks/useTiendas';

export type PanelTiendaFilterValue = number | null;

interface Props {
  value: PanelTiendaFilterValue;
  onChange: (tiendaId: PanelTiendaFilterValue) => void;
}

export function PanelTiendaFilter({ value, onChange }: Props) {
  const user = useAuthStore((s) => s.user);
  const { data: tiendas = [] } = useTiendas();

  const canChoose =
    user?.rol === 'admin' || user?.rol === 'contador' || user?.rol === 'plataforma';
  const activas = tiendas.filter((t) => t.activo !== false);

  useEffect(() => {
    if (!canChoose && user?.tiendaId) {
      onChange(user.tiendaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fijar sucursal del cajero una vez
  }, [canChoose, user?.tiendaId]);

  if (activas.length <= 1) return null;

  if (!canChoose && user?.tiendaId) {
    const nombre = activas.find((t) => t.id === user.tiendaId)?.nombre ?? `Sucursal #${user.tiendaId}`;
    return (
      <div className="flex items-center gap-2 text-sm text-navy-600 bg-white rounded-xl shadow-card px-4 py-2.5">
        <Store size={16} className="text-navy-400 shrink-0" aria-hidden />
        <span>Sucursal: <strong className="text-navy-800">{nombre}</strong></span>
      </div>
    );
  }

  if (!canChoose) return null;

  return (
    <PanelTiendaFilterBar value={value} onChange={onChange} activas={activas} />
  );
}

function PanelTiendaFilterBar({
  value,
  onChange,
  activas,
}: {
  value: PanelTiendaFilterValue;
  onChange: (v: PanelTiendaFilterValue) => void;
  activas: { id: number; nombre: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl shadow-card px-4 py-2.5">
      <Store size={16} className="text-navy-400 shrink-0" aria-hidden />
      <label className="text-sm text-navy-600 shrink-0" htmlFor="panel-tienda-filter">
        Sucursal
      </label>
      <Select
        id="panel-tienda-filter"
        wrapperClassName="min-w-[200px]"
        value={value == null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="py-2 text-sm"
        aria-label="Filtrar panel por sucursal"
      >
        <option value="">Todas las sucursales</option>
        {activas.map((t) => (
          <option key={t.id} value={t.id}>{t.nombre}</option>
        ))}
      </Select>
    </div>
  );
}
