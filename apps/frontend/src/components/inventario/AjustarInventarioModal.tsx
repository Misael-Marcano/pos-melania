'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAjustarInventario } from '@/hooks/useInventario';
import { IArticulo } from '@pos/shared';
import { formatCurrency } from '@/lib/utils';
import { Plus, Minus } from 'lucide-react';
import { toast } from '@/store/toast.store';

interface Props {
  open:      boolean;
  onClose:   () => void;
  articulo:  IArticulo | null;
}

export function AjustarInventarioModal({ open, onClose, articulo }: Props) {
  const [cantidad, setCantidad] = useState<number>(0);
  const [tipo, setTipo]         = useState<'entrada' | 'salida'>('entrada');
  const ajustar = useAjustarInventario();

  const handleSave = async () => {
    if (!articulo || cantidad <= 0) return;
    const delta = tipo === 'entrada' ? cantidad : -cantidad;
    try {
      await ajustar.mutateAsync({ id: articulo.id, cantidad: delta });
      onClose();
      setCantidad(0);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al ajustar');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar Inventario"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={ajustar.isPending || cantidad <= 0} className="btn-primary">
            {ajustar.isPending ? 'Guardando...' : 'Aplicar'}
          </button>
        </>
      }
    >
      {articulo && (
        <div className="space-y-4">
          <div className="bg-navy-50 rounded-lg p-3">
            <p className="font-semibold text-navy-800">{articulo.nombre}</p>
            <p className="text-sm text-navy-400">Código: {articulo.codigoBarras}</p>
            <p className="text-sm mt-1">
              Stock actual: <span className="font-bold text-primary-500">
                {articulo.cantidad !== null && articulo.cantidad !== undefined
                  ? articulo.cantidad.toLocaleString()
                  : 'No establecido'}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">Tipo de ajuste</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTipo('entrada')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  tipo === 'entrada'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-navy-50 text-navy-500 hover:bg-emerald-50 border-transparent'
                }`}
              >
                <Plus size={14} /> Entrada
              </button>
              <button
                onClick={() => setTipo('salida')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  tipo === 'salida'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-navy-50 text-navy-500 hover:bg-rose-50 border-transparent'
                }`}
              >
                <Minus size={14} /> Salida
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Cantidad</label>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value) || 0))}
              className="input-field text-lg font-semibold text-center"
              autoFocus
            />
          </div>

          {cantidad > 0 && articulo.cantidad !== null && articulo.cantidad !== undefined && (
            <p className="text-sm text-center text-navy-400">
              Nuevo stock:{' '}
              <span className={`font-bold ${
                tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
              }`}>
                {tipo === 'entrada'
                  ? (articulo.cantidad + cantidad).toLocaleString()
                  : (articulo.cantidad - cantidad).toLocaleString()}
              </span>
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
