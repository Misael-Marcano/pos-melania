'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { useCategorias, useCrearArticulo, useActualizarArticulo } from '@/hooks/useInventario';
import { IArticulo } from '@pos/shared';
import { toast } from '@/store/toast.store';

const schema = z.object({
  codigoBarras: z.string().min(1, 'Requerido'),
  nombre:       z.string().min(1, 'Requerido'),
  costo:        z.coerce.number().min(0),
  precioVenta:  z.coerce.number().min(0, 'Requerido'),
  cantidad:     z.coerce.number().int().optional(),
  tamanio:      z.string().optional(),
  categoriaId:  z.coerce.number().int().positive('Selecciona una categoría'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  articulo?: IArticulo | null;   // null = crear
}

export function ArticuloForm({ open, onClose, articulo }: Props) {
  const isEdit = !!articulo;
  const { data: categorias = [] } = useCategorias();
  const crear      = useCrearArticulo();
  const actualizar = useActualizarArticulo();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Precarga valores al editar
  useEffect(() => {
    if (articulo) {
      reset({
        codigoBarras: articulo.codigoBarras,
        nombre:       articulo.nombre,
        costo:        articulo.costo,
        precioVenta:  articulo.precioVenta,
        cantidad:     articulo.cantidad ?? undefined,
        tamanio:      articulo.tamanio ?? '',
        categoriaId:  articulo.categoria?.id,
      });
    } else {
      reset({ codigoBarras: '', nombre: '', costo: 0, precioVenta: 0, tamanio: '' });
    }
  }, [articulo, reset, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit && articulo) {
        await actualizar.mutateAsync({ id: articulo.id, payload: data as any });
      } else {
        await crear.mutateAsync(data as any);
      }
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const field = (label: string, name: keyof FormData, type = 'text', extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">{label}</label>
      <input type={type} {...register(name)} {...extra} className="input-field" />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Artículo' : 'Nuevo Artículo'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear artículo'}
          </button>
        </>
      }
    >
      <form className="grid grid-cols-2 gap-4">
        {field('Código de barras', 'codigoBarras')}
        {field('Nombre del artículo', 'nombre')}

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Categoría</label>
          <select {...register('categoriaId')} className="input-field">
            <option value="">Seleccionar...</option>
            {categorias.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {errors.categoriaId && <p className="text-xs text-red-500 mt-1">{errors.categoriaId.message}</p>}
        </div>

        {field('Tamaño', 'tamanio')}
        {field('Costo', 'costo', 'number', { step: '0.01', min: '0' })}
        {field('Precio de venta', 'precioVenta', 'number', { step: '0.01', min: '0' })}
        {field('Cantidad inicial', 'cantidad', 'number', { step: '1', min: '0' })}
      </form>
    </Modal>
  );
}
