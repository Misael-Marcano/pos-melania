'use client';

import { useState, useRef } from 'react';
import { Modal }             from '@/components/ui/Modal';
import { inventarioService } from '@/services/inventario.service';
import { useQueryClient }    from '@tanstack/react-query';
import { INVENTARIO_KEY }    from '@/hooks/useInventario';
import { toast }             from '@/store/toast.store';
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2, Download } from 'lucide-react';

interface Props {
  open:    boolean;
  onClose: () => void;
}

const EJEMPLO_CSV = `codigoBarras,nombre,precioVenta,costo,cantidad,tamanio,categoriaId
001,Producto de ejemplo,150.00,80.00,100,Grande,1
002,Otro producto,200.00,110.00,50,,1`;

export function ImportarCSVModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [csvText,   setCsvText]   = useState('');
  const [fileName,  setFileName]  = useState('');
  const [resultado, setResultado] = useState<{ creados: number; actualizados: number; errores: string[] } | null>(null);
  const [loading,   setLoading]   = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Solo se aceptan archivos .csv');
      return;
    }
    setFileName(file.name);
    setResultado(null);
    const reader = new FileReader();
    reader.onload = (e) => setCsvText((e.target?.result as string) ?? '');
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImportar = async () => {
    if (!csvText.trim()) { toast.error('Selecciona un archivo CSV primero'); return; }
    setLoading(true);
    setResultado(null);
    try {
      const res = await inventarioService.importarCSV(csvText);
      setResultado(res);
      qc.invalidateQueries({ queryKey: [INVENTARIO_KEY] });
      if (res.errores.length === 0) {
        toast.success(`${res.creados} creados, ${res.actualizados} actualizados`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  const descargarEjemplo = () => {
    const blob = new Blob([EJEMPLO_CSV], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'ejemplo_articulos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setCsvText('');
    setFileName('');
    setResultado(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importar artículos desde CSV" size="md">
      <div className="space-y-4">
        {/* Formato esperado */}
        <div className="bg-navy-50 rounded-lg p-3 text-xs text-navy-600 space-y-1">
          <p className="font-semibold text-navy-700">Columnas requeridas:</p>
          <p className="font-mono">codigoBarras, nombre, precioVenta, categoriaId</p>
          <p className="font-semibold text-navy-700 pt-1">Columnas opcionales:</p>
          <p className="font-mono">costo, cantidad, tamanio</p>
          <button onClick={descargarEjemplo} className="flex items-center gap-1.5 text-primary-600 hover:underline mt-2 font-medium">
            <Download size={12} /> Descargar ejemplo
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-navy-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {fileName ? (
            <div className="flex flex-col items-center gap-2">
              <FileText size={28} className="text-primary-500" />
              <p className="text-sm font-medium text-navy-700">{fileName}</p>
              <p className="text-xs text-navy-400">{csvText.split('\n').length - 1} filas de datos</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-navy-400">
              <Upload size={28} className="opacity-50" />
              <p className="text-sm">Arrastra un archivo CSV aquí o haz clic para seleccionar</p>
            </div>
          )}
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-emerald-700">{resultado.creados}</span>
                <span className="text-emerald-600"> creados · </span>
                <span className="font-semibold text-emerald-700">{resultado.actualizados}</span>
                <span className="text-emerald-600"> actualizados</span>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-xs font-semibold text-rose-700">{resultado.errores.length} errores:</p>
                </div>
                <ul className="text-xs text-rose-600 space-y-0.5">
                  {resultado.errores.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={handleClose} className="btn-outline">Cerrar</button>
          <button
            onClick={handleImportar}
            disabled={!csvText || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Importando...</>
              : <><Upload size={14} /> Importar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
