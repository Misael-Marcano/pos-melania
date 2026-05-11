'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { X, Camera, CameraOff, RefreshCw } from 'lucide-react';

interface Props {
  /** Llamado con el código detectado; el componente no se cierra solo */
  onDetect: (codigo: string) => void;
  /** Cerrar el modal */
  onClose: () => void;
}

export function BarcodeCamera({ onDetect, onClose }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const readerRef    = useRef<BrowserMultiFormatReader | null>(null);
  const [cameras,   setCameras]   = useState<MediaDeviceInfo[]>([]);
  const [camIndex,  setCamIndex]  = useState(0);
  const [error,     setError]     = useState<string | null>(null);
  const [detected,  setDetected]  = useState<string | null>(null);
  const [starting,  setStarting]  = useState(true);

  // Cargar lista de cámaras disponibles
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices);
        // Preferir cámara trasera si hay más de una
        const rearIndex = devices.findIndex((d) =>
          /back|rear|environment/i.test(d.label)
        );
        if (rearIndex !== -1) setCamIndex(rearIndex);
      })
      .catch(() => setError('No se pudo acceder a las cámaras disponibles'));
  }, []);

  // Iniciar/reiniciar lector cuando cambia la cámara seleccionada
  useEffect(() => {
    if (!videoRef.current) return;

    let active = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const deviceId = cameras[camIndex]?.deviceId ?? undefined;
    setStarting(true);
    setError(null);

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (!active) return;
        if (result) {
          const code = result.getText();
          setDetected(code);
          onDetect(code);
        }
        if (err && !(err instanceof NotFoundException)) {
          // NotFoundException es normal mientras no hay código en cámara
          console.warn('[BarcodeCamera]', err);
        }
      })
      .then(() => { if (active) setStarting(false); })
      .catch((e: Error) => {
        if (!active) return;
        setStarting(false);
        if (e.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.');
        } else if (e.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en este dispositivo.');
        } else {
          setError(`Error al iniciar la cámara: ${e.message}`);
        }
      });

    return () => {
      active = false;
      BrowserMultiFormatReader.releaseAllStreams();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camIndex, cameras]);

  const handleRotateCamera = () => {
    if (cameras.length < 2) return;
    setCamIndex((i) => (i + 1) % cameras.length);
    setDetected(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100">
          <div className="flex items-center gap-2 text-navy-800">
            <Camera size={16} />
            <span className="font-semibold text-sm">Escanear código de barras</span>
          </div>
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button
                onClick={handleRotateCamera}
                title="Cambiar cámara"
                className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-navy-700 transition-colors"
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Visor */}
        <div className="relative bg-black aspect-square">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Overlay de apunte */}
          {!error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-56 h-32 border-2 rounded-lg transition-colors ${
                detected ? 'border-emerald-400' : 'border-white/60'
              }`}>
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl-lg -translate-x-px -translate-y-px" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr-lg translate-x-px -translate-y-px" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl-lg -translate-x-px translate-y-px" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white rounded-br-lg translate-x-px translate-y-px" />
              </div>
            </div>
          )}

          {/* Estado: iniciando */}
          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center gap-2 text-white">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Iniciando cámara…</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
              <div className="text-center">
                <CameraOff size={32} className="text-white/60 mx-auto mb-2" />
                <p className="text-white text-sm text-center">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 text-center">
          {detected ? (
            <p className="text-sm font-mono text-emerald-700 font-semibold truncate">
              ✓ {detected}
            </p>
          ) : (
            <p className="text-xs text-navy-400">
              Apunta la cámara al código de barras
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
