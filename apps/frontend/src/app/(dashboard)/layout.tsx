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
      <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[#E8EDEB]">
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
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#E8EDEB]">
      <Toaster />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden min-w-0">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
        <OnboardingBanner />
        <TrialBanner />
        <main className="relative min-h-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <AppAtmosphere />
          <div className="relative z-10 min-w-0 max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
