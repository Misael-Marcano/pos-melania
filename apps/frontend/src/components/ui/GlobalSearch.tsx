'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { inventarioService } from '@/services/inventario.service';
import { clientesService }   from '@/services/clientes.service';
import { Search, Package, Users, X, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { IArticulo, ICliente } from '@pos/shared';

interface Result {
  type:  'articulo' | 'cliente';
  id:    number;
  label: string;
  sub?:  string;
  href:  string;
}

export function GlobalSearch() {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const [sel,   setSel]   = useState(0);
  const router  = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else       setQuery('');
  }, [open]);

  const { data: artData } = useQuery({
    queryKey: ['gs-art', query],
    queryFn:  () => inventarioService.getAll(1, 6, query),
    enabled:  query.trim().length >= 2,
    staleTime: 10_000,
  });
  const { data: cliData } = useQuery({
    queryKey: ['gs-cli', query],
    queryFn:  () => clientesService.getAll(1, 4, query),
    enabled:  query.trim().length >= 2,
    staleTime: 10_000,
  });

  const results: Result[] = [
    ...(artData?.data ?? []).map((a: IArticulo) => ({
      type:  'articulo' as const,
      id:    a.id,
      label: a.nombre,
      sub:   formatCurrency(a.precioVenta),
      href:  '/inventario',
    })),
    ...(cliData?.data ?? []).map((c: ICliente) => ({
      type:  'cliente' as const,
      id:    c.id,
      label: c.nombre,
      sub:   c.telefono,
      href:  '/clientes',
    })),
  ];

  useEffect(() => { setSel(0); }, [query]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[sel]) {
      router.push(results[sel].href);
      setOpen(false);
    }
  }, [results, sel, router]);

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-navy-200 text-navy-400 text-xs hover:border-navy-300 hover:bg-navy-50 transition-colors"
    >
      <Search size={13} />
      Buscar...
      <kbd className="ml-1 text-[10px] bg-navy-100 rounded px-1 py-0.5">⌘K</kbd>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg bg-white rounded-[16px] shadow-float overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-100">
          <Search size={16} className="text-navy-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar artículo, cliente…"
            className="flex-1 text-sm text-navy-800 placeholder:text-navy-400 focus:outline-none bg-transparent"
          />
          <button onClick={() => setOpen(false)} className="text-navy-400 hover:text-navy-600">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        {query.trim().length >= 2 && (
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-center text-navy-400 text-sm py-8">Sin resultados para "{query}"</p>
            ) : (
              <ul className="py-1">
                {results.map((r, i) => (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onClick={() => { router.push(r.href); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        i === sel ? 'bg-primary-50' : 'hover:bg-navy-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        r.type === 'articulo' ? 'bg-primary-100 text-primary-600' : 'bg-navy-100 text-navy-500'
                      }`}>
                        {r.type === 'articulo' ? <Package size={14} /> : <Users size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-800 truncate">{r.label}</p>
                        {r.sub && <p className="text-xs text-navy-400">{r.sub}</p>}
                      </div>
                      <ArrowRight size={13} className="text-navy-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {query.trim().length < 2 && (
          <p className="text-center text-navy-400 text-xs py-6">Escribe al menos 2 caracteres</p>
        )}
      </div>
    </div>
  );
}
