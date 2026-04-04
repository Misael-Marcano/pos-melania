'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCategorias, useCrearCategoria, useEliminarCategoria } from '@/hooks/useInventario';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { toast } from '@/store/toast.store';

interface Props {
  open:    boolean;
  onClose: () => void;
}

export function CategoriasModal({ open, onClose }: Props) {
  const [nombre, setNombre] = useState('');
  const [error,  setError]  = useState('');

  const { data: categorias = [], isLoading } = useCategorias();
  const crear    = useCrearCategoria();
  const eliminar = useEliminarCategoria();

  const handleCrear = async () => {
    const trimmed = nombre.trim();
    if (!trimmed) { setError('Escribe un nombre para la categoría'); return; }
    try {
      setError('');
      await crear.mutateAsync(trimmed);
      setNombre('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear categoría');
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await eliminar.mutateAsync(id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar Categorías"
      size="md"
      footer={
        <button onClick={onClose} className="btn-outline">Cerrar</button>
      }
    >
      <div className="space-y-5">
        {/* Crear nueva */}
        <div>
          <label className="block text-sm font-semibold text-navy-700 mb-2">Nueva categoría</label>
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="Ej: Bebidas, Lácteos, Carnes..."
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCrear()}
            />
            <button
              onClick={handleCrear}
              disabled={crear.isPending}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              {crear.isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <Plus size={15} />}
              Agregar
            </button>
          </div>
          {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
        </div>

        {/* Lista */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-navy-700">Categorías existentes</label>
            <span className="text-xs text-navy-400">{categorias.length} categoría{categorias.length !== 1 ? 's' : ''}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-navy-400 gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-8 text-navy-400">
              <Tag size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay categorías aún.</p>
              <p className="text-xs mt-1">Crea la primera arriba.</p>
            </div>
          ) : (
            <div className="rounded-[12px] overflow-hidden">
              {categorias.map((cat: any, i: number) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < categorias.length - 1 ? 'border-b border-navy-50' : ''
                  } hover:bg-navy-50/60 group transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Tag size={13} className="text-primary-600" />
                    </div>
                    <span className="text-sm font-medium text-navy-800">{cat.nombre}</span>
                  </div>
                  <button
                    onClick={() => handleEliminar(cat.id)}
                    disabled={eliminar.isPending}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-navy-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
