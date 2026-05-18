import { useConfiguracion } from '@/hooks/useConfiguracion';

/** Símbolo de moneda del tenant para widgets del panel. */
export function useDashboardCurrency() {
  const { data: cfg } = useConfiguracion();
  const symbol = (cfg?.simboloMoneda && String(cfg.simboloMoneda).trim()) || 'RDS';
  return { symbol, isLoading: !cfg };
}
