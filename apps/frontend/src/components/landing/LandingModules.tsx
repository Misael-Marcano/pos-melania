import { LANDING_MODULES } from './landing-modules';

export function LandingModules() {
  return (
    <section id="modulos" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">
            Módulos
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Todo en un solo sistema
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-navy-500 sm:text-base">
            Desde la venta hasta el cumplimiento fiscal, sin depender de múltiples herramientas.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_MODULES.map(({ icon: Icon, label, desc }) => (
            <li
              key={label}
              className="rounded-2xl border border-white/90 bg-white/75 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <Icon size={20} aria-hidden />
              </div>
              <h3 className="font-semibold text-navy-800">{label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
