'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">

        {/* Big 404 */}
        <div className="relative mb-8 select-none">
          <p className="text-[120px] sm:text-[160px] font-black font-display leading-none text-navy-200">
            404
          </p>
          {/* Floating icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl flex items-center justify-center shadow-float rotate-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36" height="36" viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v3" />
                <circle cx="11" cy="14" r="0.5" fill="white" />
              </svg>
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-navy-800 font-display mb-2">
          Página no encontrada
        </h1>
        <p className="text-navy-400 text-sm mb-8 leading-relaxed">
          La página que buscas no existe o fue movida.
          <br />
          Verifica la URL o regresa al panel principal.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-primary-600 to-primary-500 text-white font-semibold px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all shadow-sm text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Ir al Panel
          </Link>
          <button
            onClick={() => history.back()}
            className="inline-flex items-center justify-center gap-2 bg-white text-navy-600 font-semibold px-6 py-3 rounded-xl hover:bg-navy-50 transition-colors shadow-card text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Volver atrás
          </button>
        </div>

        {/* Decoration */}
        <div className="mt-12 flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-full bg-navy-200"
              style={{
                width:  `${6 + i * 2}px`,
                height: `${6 + i * 2}px`,
                opacity: 0.3 + i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
