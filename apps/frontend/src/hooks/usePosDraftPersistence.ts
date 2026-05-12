'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  buildPosDraftStorageKey,
  parsePosDraftV1,
  type PosDraftV1,
} from '@/lib/pos-draft-session';

const DEBOUNCE_MS = 400;

export interface UsePosDraftPersistenceArgs {
  /** `false` hasta tener usuario, tienda y cajas listas para validar caja. */
  enabled: boolean;
  tenantId: number | null;
  tiendaId: number | undefined;
  /** Carrito con al menos un ítem — para `beforeunload` y heurísticas. */
  cartNonEmpty: boolean;
  getSnapshot: () => PosDraftV1;
  applyDraft: (draft: PosDraftV1) => void;
  /** Limpia carrito + UI POS al cambiar organización/sucursal (clave de storage). */
  onScopeChange: () => void;
  isCajaEligible: (cajaId: number) => boolean;
  /** Cambia cuando cambia cualquier campo persistible (p. ej. hash o JSON estable). */
  saveRevision: string;
}

/**
 * Persistencia del borrador POS en sessionStorage (misma pestaña), con debounce
 * y vaciado al cambiar tenant/tienda.
 */
export function usePosDraftPersistence({
  enabled,
  tenantId,
  tiendaId,
  cartNonEmpty,
  getSnapshot,
  applyDraft,
  onScopeChange,
  isCajaEligible,
  saveRevision,
}: UsePosDraftPersistenceArgs): void {
  const storageKey =
    tenantId != null && tiendaId != null ? buildPosDraftStorageKey(tenantId, tiendaId) : null;

  const restoredRef = useRef(false);
  const prevStorageKeyRef = useRef<string | null>(null);
  const applyDraftRef = useRef(applyDraft);
  const isCajaEligibleRef = useRef(isCajaEligible);

  useEffect(() => {
    applyDraftRef.current = applyDraft;
    isCajaEligibleRef.current = isCajaEligible;
  }, [applyDraft, isCajaEligible]);

  useEffect(() => {
    restoredRef.current = false;
  }, [storageKey]);

  useEffect(() => {
    const prev = prevStorageKeyRef.current;
    if (prev !== null && storageKey !== null && prev !== storageKey) {
      try {
        sessionStorage.removeItem(prev);
      } catch {
        /* ignore */
      }
      onScopeChange();
    }
    if (storageKey !== null) prevStorageKeyRef.current = storageKey;
  }, [storageKey, onScopeChange]);

  useEffect(() => {
    if (!storageKey || !enabled || restoredRef.current) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(storageKey);
    } catch {
      restoredRef.current = true;
      return;
    }
    if (!raw) {
      restoredRef.current = true;
      return;
    }
    const draft = parsePosDraftV1(raw);
    if (!draft) {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      restoredRef.current = true;
      return;
    }
    if (draft.selectedCajaId != null && !isCajaEligibleRef.current(draft.selectedCajaId)) {
      const { selectedCajaId: _s, ...rest } = draft;
      applyDraftRef.current({ ...rest, selectedCajaId: undefined });
    } else {
      applyDraftRef.current(draft);
    }
    restoredRef.current = true;
  }, [storageKey, enabled]);

  const flushSave = useCallback(() => {
    if (!storageKey || !enabled) return;
    const snap = getSnapshot();
    try {
      if (!snap.items.length) {
        sessionStorage.removeItem(storageKey);
        return;
      }
      sessionStorage.setItem(storageKey, JSON.stringify(snap));
    } catch {
      /* quota / private mode */
    }
  }, [storageKey, enabled, getSnapshot]);

  useEffect(() => {
    if (!storageKey || !enabled) return;
    const t = window.setTimeout(flushSave, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [storageKey, enabled, flushSave, saveRevision]);

  useEffect(() => {
    if (!storageKey || !enabled) return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [storageKey, enabled, flushSave]);

  useEffect(() => {
    if (!cartNonEmpty || !storageKey || !enabled) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [cartNonEmpty, storageKey, enabled]);
}
