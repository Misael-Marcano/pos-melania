import { LANDING_FAQ } from './landing-faq';

export function LandingFaq() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-600">FAQ</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="space-y-3">
          {LANDING_FAQ.map((faq, i) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-white/90 bg-white/75 shadow-sm backdrop-blur-sm open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 px-6 py-5 font-semibold text-navy-800 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                  {i + 1}
                </span>
                <span className="flex-1 text-left text-sm sm:text-base">{faq.q}</span>
              </summary>
              <p className="border-t border-navy-100/70 px-6 pb-5 pl-[3.25rem] pt-0 text-sm leading-relaxed text-navy-500">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
