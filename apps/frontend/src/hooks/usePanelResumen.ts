import { useQuery } from '@tanstack/react-query';
import { reportesService, type PanelResumen } from '@/services/reportes.service';

function tiendaKey(tiendaId?: number | null) {
  return tiendaId ?? 'all';
}

export const PANEL_RESUMEN_KEY = 'panel-resumen';

export function usePanelResumen(fecha: string, tiendaId?: number | null) {
  return useQuery({
    queryKey: [PANEL_RESUMEN_KEY, fecha, tiendaKey(tiendaId)],
    queryFn: () => reportesService.panelResumen(fecha, tiendaId),
    enabled: !!fecha,
    staleTime: 30_000,
  });
}

export type { PanelResumen };
