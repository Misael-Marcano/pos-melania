import { useQuery } from '@tanstack/react-query';
import { auditoriaService, AuditoriaParams } from '@/services/auditoria.service';

export function useAuditoria(params: AuditoriaParams) {
  return useQuery({
    queryKey: ['auditoria', params],
    queryFn:  () => auditoriaService.findAll(params),
    staleTime: 30_000,
  });
}

export function useAuditoriaTablas() {
  return useQuery({
    queryKey: ['auditoria', 'tablas'],
    queryFn:  auditoriaService.getTablas,
    staleTime: 5 * 60_000,
  });
}
