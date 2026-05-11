import { useEffect, useRef } from 'react';

interface Options {
  /** Deshabilitar el listener (ej. cuando un modal cubre el POS) */
  disabled?: boolean;
  /** Tiempo máximo entre teclas para considerar que es un scanner (ms). Default: 80 */
  maxKeyInterval?: number;
  /** Longitud mínima del código para disparar el callback. Default: 3 */
  minLength?: number;
  /** Prefijos a ignorar (ej. teclas de función F1-F12) */
  ignorePrefixes?: string[];
}

/**
 * Detecta escaneos de código de barras desde un scanner USB/Bluetooth (keyboard-wedge).
 *
 * Los scanners físicos emiten todos los caracteres del código en ráfaga
 * (< 80 ms entre tecla y tecla) y finalizan con Enter. Este hook distingue
 * esa ráfaga de la escritura humana normal y dispara `onScan` solo cuando
 * detecta el patrón de un scanner.
 *
 * @param onScan  Callback con el código detectado (sin Enter)
 * @param options Opciones de configuración
 */
export function useBarcodeScanner(
  onScan: (codigo: string) => void,
  options: Options = {},
) {
  const {
    disabled       = false,
    maxKeyInterval = 80,
    minLength      = 3,
    ignorePrefixes = [],
  } = options;

  const bufferRef       = useRef<string>('');
  const lastKeyTimeRef  = useRef<number>(0);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef       = useRef(onScan);

  // Mantener referencia actualizada sin re-registrar el listener
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (disabled) return;

    const flush = () => {
      const code = bufferRef.current.trim();
      bufferRef.current = '';
      if (code.length >= minLength) {
        onScanRef.current(code);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input/textarea/select (escritura normal del usuario)
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable;

      if (isEditable) return;

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;

      // Si pasó demasiado tiempo desde la última tecla, resetear buffer
      if (bufferRef.current && interval > maxKeyInterval) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (timerRef.current) clearTimeout(timerRef.current);
        flush();
        return;
      }

      // Ignorar teclas especiales (Shift, Ctrl, Alt, F1-F12, etc.)
      if (e.key.length > 1) return;

      // Ignorar prefijos configurados
      if (ignorePrefixes.some((p) => e.key.startsWith(p))) return;

      bufferRef.current += e.key;
      lastKeyTimeRef.current = now;

      // Seguro de cierre: si no llega Enter, disparar después de un silencio
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, maxKeyInterval * 2);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [disabled, maxKeyInterval, minLength, ignorePrefixes]);
}
