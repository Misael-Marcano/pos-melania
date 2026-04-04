import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuracionService } from '@/services/configuracion.service';
import { IConfiguracion } from '@pos/shared';

export const CONFIG_KEY = 'configuracion';

export function useConfiguracion() {
  return useQuery({
    queryKey: [CONFIG_KEY],
    queryFn:  configuracionService.get,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActualizarConfiguracion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<IConfiguracion>) => configuracionService.update(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CONFIG_KEY] }),
  });
}
