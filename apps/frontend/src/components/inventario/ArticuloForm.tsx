'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useCategorias, useCrearArticulo, useActualizarArticulo } from '@/hooks/useInventario';
import { IArticulo } from '@pos/shared';
import { toast } from '@/store/toast.store';
import { BarcodeCamera } from '@/components/common/BarcodeCamera';
import { Camera } from 'lucide-react';

const schema = z.object({
  codigoBarras: z.string().min(1, 'Requerido'),
  nombre:       z.string().min(1, 'Requerido'),
  costo:        z.coerce.number().min(0),
  precioVenta:  z.coerce.number().min(0, 'Requerido'),
  cantidad:     z.coerce.number().int().optional(),
  tamanio:      z.string().optional(),
  unidadMedida: z.string().max(20).optional(),
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
  const [showCamera, setShowCamera] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
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
        unidadMedida: articulo.unidadMedida ?? '',
        categoriaId:  articulo.categoria?.id,
      });
    } else {
      reset({ codigoBarras: '', nombre: '', costo: 0, precioVenta: 0, tamanio: '', unidadMedida: '' });
    }
  }, [articulo, reset, open]);

  const onSubmit = async (data: FormData) => {
    try {
      const u = data.unidadMedida?.trim();
      const payload = {
        ...data,
        unidadMedida: u ? u : null,
      };
      if (isEdit && articulo) {
        await actualizar.mutateAsync({ id: articulo.id, payload: payload as any });
      } else {
        await crear.mutateAsync(payload as any);
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
        {/* Código de barras con botón de cámara */}
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Código de barras</label>
          <div className="flex gap-1.5">
            <input type="text" {...register('codigoBarras')} className="input-field flex-1 min-w-0" />
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              title="Escanear con cámara"
              className="px-2.5 py-1.5 rounded-lg border border-navy-200 text-navy-400 hover:border-primary-400 hover:text-primary-600 transition-colors shrink-0"
            >
              <Camera size={15} />
            </button>
          </div>
          {errors.codigoBarras && <p className="text-xs text-red-500 mt-1">{errors.codigoBarras.message}</p>}
        </div>
        {field('Nombre del artículo', 'nombre')}

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1">Categoría</label>
          <Select
            {...register('categoriaId')}
            aria-invalid={errors.categoriaId ? true : undefined}
          >
            <option value="">Seleccionar...</option>
            {categorias.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </Select>
          {errors.categoriaId && <p className="text-xs text-red-500 mt-1">{errors.categoriaId.message}</p>}
        </div>

        {field('Tamaño', 'tamanio')}
        {field('Unidad (kg, lb, und, ml…)', 'unidadMedida')}
        {field('Costo', 'costo', 'number', { step: '0.01', min: '0' })}
        {field('Precio de venta', 'precioVenta', 'number', { step: '0.01', min: '0' })}
        {field('Cantidad inicial', 'cantidad', 'number', { step: '1', min: '0' })}
      </form>

      {showCamera && (
        <BarcodeCamera
          onDetect={(codigo) => {
            setValue('codigoBarras', codigo, { shouldValidate: true });
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </Modal>
  );
}
