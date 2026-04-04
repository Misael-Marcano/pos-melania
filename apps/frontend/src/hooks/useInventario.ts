import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventarioService } from '@/services/inventario.service';
import { IArticulo } from '@pos/shared';
import { toast } from '@/store/toast.store';

// ── Query keys ────────────────────────────────────────────────────────────────
export const INVENTARIO_KEY = 'inventario';
export const CATEGORIAS_KEY = 'categorias';

// ── Listar artículos ──────────────────────────────────────────────────────────
export function useArticulos(page = 1, limit = 20, q = '', categoriaId?: number) {
  return useQuery({
    queryKey: [INVENTARIO_KEY, page, limit, q, categoriaId],
    queryFn:  () => inventarioService.getAll(page, limit, q, categoriaId),
    placeholderData: (prev) => prev,
  });
}

// ── Artículo por id ───────────────────────────────────────────────────────────
export function useArticulo(id: number) {
  return useQuery({
    queryKey: [INVENTARIO_KEY, id],
    queryFn:  () => inventarioService.getById(id),
    enabled:  !!id,
  });
}

// ── Categorías ────────────────────────────────────────────────────────────────
export function useCategorias() {
  return useQuery({
    queryKey: [CATEGORIAS_KEY],
    queryFn:  inventarioService.getCategorias,
    staleTime: 5 * 60 * 1000,   // 5 min — no cambian seguido
  });
}

// ── Crear artículo ────────────────────────────────────────────────────────────
export function useCrearArticulo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof inventarioService.create>[0]) =>
      inventarioService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      toast.success('Artículo creado correctamente');
    },
  });
}

// ── Actualizar artículo ───────────────────────────────────────────────────────
export function useActualizarArticulo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<IArticulo> }) =>
      inventarioService.update(id, payload as any),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY, vars.id] });
      toast.success('Artículo actualizado');
    },
  });
}

// ── Clonar artículo ───────────────────────────────────────────────────────────
export function useClonarArticulo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inventarioService.clone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      toast.success('Artículo clonado');
    },
  });
}

// ── Eliminar artículo ─────────────────────────────────────────────────────────
export function useEliminarArticulo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inventarioService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      toast.success('Artículo eliminado');
    },
  });
}

// ── Crear categoría ───────────────────────────────────────────────────────────
export function useCrearCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nombre: string) => inventarioService.createCategoria(nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] });
      toast.success('Categoría creada');
    },
  });
}

// ── Eliminar categoría ────────────────────────────────────────────────────────
export function useEliminarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => inventarioService.deleteCategoria(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIAS_KEY] });
      toast.success('Categoría eliminada');
    },
  });
}

// ── Movimientos de inventario ─────────────────────────────────────────────────
export function useMovimientosInventario(articuloId: number, page = 1, limit = 20) {
  return useQuery({
    queryKey: [INVENTARIO_KEY, articuloId, 'movimientos', page, limit],
    queryFn:  () => inventarioService.getMovimientos(articuloId, page, limit),
    enabled:  !!articuloId,
  });
}

// ── Stock bajo ────────────────────────────────────────────────────────────────
export function useStockBajo(minimo = 10) {
  return useQuery({
    queryKey: [INVENTARIO_KEY, 'stock-bajo', minimo],
    queryFn:  () => inventarioService.getStockBajo(minimo),
    staleTime: 60_000,
  });
}

// ── Ajustar inventario ────────────────────────────────────────────────────────
export function useAjustarInventario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cantidad }: { id: number; cantidad: number }) =>
      inventarioService.ajustar(id, cantidad),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY, vars.id] });
      toast.success('Inventario ajustado');
    },
  });
}
