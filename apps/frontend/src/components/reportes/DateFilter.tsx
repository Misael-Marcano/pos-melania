'use client';

import { Select } from '@/components/ui/Select';

export function DateFilter({ desde, hasta, setDesde, setHasta, tiendaId, setTiendaId, tiendas, isAdmin, userTiendaId }: {
  desde: string; hasta: string;
  setDesde: (v: string) => void; setHasta: (v: string) => void;
  tiendaId: number | '';
  setTiendaId: (v: number | '') => void;
  tiendas: { id: number; nombre: string }[];
  isAdmin: boolean;
  userTiendaId?: number | null;
}) {
  const PRESETS = [
    { label: 'Hoy',       d: 0  },
    { label: 'Últ. 7',   d: 6  },
    { label: 'Últ. 30',  d: 29 },
    { label: 'Este mes',  d: -1 },
  ];

  const apply = (d: number) => {
    const h = new Date();
    if (d === -1) {
      const de = new Date(h.getFullYear(), h.getMonth(), 1);
      setDesde(de.toISOString().split('T')[0]);
    } else {
      const de = new Date(); de.setDate(de.getDate() - d);
      setDesde(de.toISOString().split('T')[0]);
    }
    setHasta(h.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-white rounded-[12px] shadow-card p-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs font-medium text-navy-600 block mb-1">Desde</label>
        <input type="date" value={desde} max={hasta}
          onChange={(e) => setDesde(e.target.value)} className="input-field w-40" />
      </div>
      <div>
        <label className="text-xs font-medium text-navy-600 block mb-1">Hasta</label>
        <input type="date" value={hasta} min={desde}
          onChange={(e) => setHasta(e.target.value)} className="input-field w-40" />
      </div>
      <div>
        <label className="text-xs font-medium text-navy-600 block mb-1">Sucursal</label>
        {!isAdmin && userTiendaId ? (
          <p className="input-field w-48 bg-navy-50 text-navy-700 cursor-default text-sm">
            {tiendas.find((t) => t.id === userTiendaId)?.nombre ?? `Sucursal #${userTiendaId}`}
          </p>
        ) : (
          <Select
            wrapperClassName="w-48"
            value={tiendaId === '' ? '' : String(tiendaId)}
            onChange={(e) => setTiendaId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Todas las sucursales</option>
            {tiendas.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </Select>
        )}
      </div>
      <div className="flex gap-2 ml-auto flex-wrap">
        {PRESETS.map(({ label, d }) => (
          <button key={label} onClick={() => apply(d)}
            className="text-xs px-3 py-1.5 rounded-lg border border-navy-200 text-navy-600 hover:border-primary-400 hover:text-primary-600 font-medium transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
