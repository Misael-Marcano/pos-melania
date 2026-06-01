'use client';

import { useState } from 'react';
import { ContactModal } from '@/components/landing/ContactModal';
import { LandingAtmosphere } from '@/components/landing/LandingAtmosphere';
import { LandingCta } from '@/components/landing/LandingCta';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingModules } from '@/components/landing/LandingModules';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingPillars } from '@/components/landing/LandingPillars';
import { LandingPlans } from '@/components/landing/LandingPlans';
import type { LandingPlan } from '@/components/landing/landing-plans';
import Link from 'next/link';
import { isStaticSite } from '@/lib/site-mode';

export default function LandingPage() {
  const [contactPlan, setContactPlan] = useState<LandingPlan | null>(null);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#E8EDEB] font-sans antialiased">
      <LandingAtmosphere />
      <ContactModal plan={contactPlan} onClose={() => setContactPlan(null)} />

      <div className="relative flex flex-col">
        {isStaticSite && (
          <p className="border-b border-primary-200/60 bg-primary-50 px-4 py-2.5 text-center text-sm text-primary-900">
            Vista pública en GitHub Pages — sin inicio de sesión.{' '}
            <Link href="/solicitar-demo" className="font-semibold underline underline-offset-2">
              Solicitar demo
            </Link>
            {' '}o instalar en tu red según la documentación del proyecto.
          </p>
        )}
        <LandingNav />

        <main aria-labelledby="landing-heading">
          <LandingHero />
          <LandingPillars />
          <LandingModules />
          <LandingPlans onContact={setContactPlan} />
          <LandingFaq />
          <LandingCta />
        </main>

        <LandingFooter />
      </div>
    </div>
  );
}
