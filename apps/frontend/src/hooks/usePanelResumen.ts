import { useQuery } from '@tanstack/react-query';
import { reportesService, type PanelResumen } from '@/services/reportes.service';
import { isStaticDemoActive, mockPanelResumen } from '@/lib/static-demo';

function tiendaKey(tiendaId?: number | null) {
  return tiendaId ?? 'all';
}

export const PANEL_RESUMEN_KEY = 'panel-resumen';

export function usePanelResumen(fecha: string, tiendaId?: number | null) {
  const demo = isStaticDemoActive();
  return useQuery({
    queryKey: [PANEL_RESUMEN_KEY, fecha, tiendaKey(tiendaId), demo ? 'demo' : 'live'],
    queryFn: () =>
      demo
        ? Promise.resolve(mockPanelResumen(fecha))
        : reportesService.panelResumen(fecha, tiendaId),
    enabled: !!fecha,
    staleTime: demo ? Infinity : 30_000,
  });
}

export type { PanelResumen };
