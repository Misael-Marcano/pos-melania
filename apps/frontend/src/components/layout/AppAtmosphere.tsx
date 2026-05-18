/** Fondo atmosférico compartido (landing, auth, dashboard, páginas públicas). */
export function AppAtmosphere({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
    >
      <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-primary-200/50 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-[32rem] w-[32rem] rounded-full bg-secondary-container/70 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(61 78 61 / 0.12) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#F7FAF9]/90 via-transparent to-primary-100/40" />
    </div>
  );
}