'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar }          from '@/components/layout/Sidebar';
import { Header }            from '@/components/layout/Header';
import { Toaster }           from '@/components/ui/Toaster';
import { OnboardingBanner }  from '@/components/layout/OnboardingBanner';
import { TrialBanner }       from '@/components/layout/TrialBanner';
import { AppAtmosphere }     from '@/components/layout/AppAtmosphere';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user   = useAuthStore((s) => s.user);
  const loaded = useAuthStore((s) => s.loaded);
  const platformTenantId = useAuthStore((s) => s.platformTenantId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (loaded && !user) router.replace('/login');
  }, [user, loaded, router]);

  useEffect(() => {
    if (!loaded || !user) return;
    const needsOrg =
      user.rol === 'plataforma'
      && platformTenantId == null
      && pathname !== '/plataforma';
    if (needsOrg) {
      router.replace('/select-organizacion');
    }
  }, [loaded, user, platformTenantId, pathname, router]);

  if (!loaded || !user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#E8EDEB]">
        <AppAtmosphere />
        <div
          className="relative z-10 w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Cargando"
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#E8EDEB]">
      <Toaster />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="relative flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
        <OnboardingBanner />
        <TrialBanner />
        <main className="relative flex-1 overflow-y-auto p-4 lg:p-6">
          <AppAtmosphere />
          <div className="relative z-10 min-h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
