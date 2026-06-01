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

export default function LandingPage() {
  const [contactPlan, setContactPlan] = useState<LandingPlan | null>(null);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#E8EDEB] font-sans antialiased">
      <LandingAtmosphere />
      <ContactModal plan={contactPlan} onClose={() => setContactPlan(null)} />

      <div className="relative flex flex-col">
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
