'use client';

import { CreditCard, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useClientesConSaldo } from '@/hooks/useClientes';
import { formatCurrency } from '@/lib/utils';

interface Props {
  clientes?: { id: number; nombre: string; saldo: number }[];
  totalDeuda?: number;
  isLoading?: boolean;
}

export function ClientesDeudaWidget({ clientes: clientesProp, totalDeuda: totalProp, isLoading: loadingProp }: Props = {}) {
  const { data, isLoading: fetchLoading } = useClientesConSaldo({ enabled: clientesProp === undefined });
  const clientes = clientesProp ?? data?.data ?? [];
  const totalDeuda = totalProp ?? clientes.reduce((s, c) => s + Number(c.saldo ?? 0), 0);
  const isLoading = loadingProp ?? (clientesProp === undefined ? fetchLoading : false);

  return (
    <div className="bg-white rounded-[12px] shadow-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <CreditCard size={16} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy-800">Cuentas por cobrar</h3>
            {totalDeuda > 0 && (
              <p className="text-xs text-rose-500 font-medium">{formatCurrency(totalDeuda)} pendiente</p>
            )}
          </div>
        </div>
        <Link href="/clientes"
          className="flex items-center gap-1 text-xs text-secondary font-medium hover:opacity-90 transition-opacity">
          Ver todo <ArrowRight size={12} />
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-navy-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !clientes.length ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-navy-400">
            <Users size={32} className="mb-2 opacity-20" />
            <p className="text-sm font-medium text-navy-500">Sin deudas pendientes</p>
            <p className="text-xs text-navy-400 mt-0.5">Todos los clientes están al día</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1 px-2 pb-2">
            {clientes.map((c) => {
              const pct = totalDeuda > 0 ? (Number(c.saldo) / totalDeuda) * 100 : 0;
              return (
                <li key={c.id} className="px-3 py-2.5 rounded-xl hover:bg-navy-50/80 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-navy-700 font-medium truncate max-w-[60%]">{c.nombre}</span>
                    <span className="text-sm font-bold text-rose-600">{formatCurrency(Number(c.saldo))}</span>
                  </div>
                  <div className="w-full bg-rose-50 rounded-full h-1">
                    <div className="bg-rose-400 h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {clientes.length > 0 && (
        <div className="px-5 py-3 bg-navy-50/50 rounded-b-[12px]">
          <p className="text-xs text-navy-400">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} con saldo pendiente
          </p>
        </div>
      )}
    </div>
  );
}
