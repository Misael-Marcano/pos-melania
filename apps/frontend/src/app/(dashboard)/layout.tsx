'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar }          from '@/components/layout/Sidebar';
import { Header }            from '@/components/layout/Header';
import { Toaster }           from '@/components/ui/Toaster';
import { OnboardingBanner }  from '@/components/layout/OnboardingBanner';
import { TrialBanner }       from '@/components/layout/TrialBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user   = useAuthStore((s) => s.user);
  const loaded = useAuthStore((s) => s.loaded);
  const platformTenantId = useAuthStore((s) => s.platformTenantId);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loaded && !user) router.replace('/login');
  }, [user, loaded, router]);

  useEffect(() => {
    if (!loaded || !user) return;
    if (user.rol === 'plataforma' && platformTenantId == null && pathname !== '/select-organizacion') {
      router.replace('/select-organizacion');
    }
  }, [loaded, user, platformTenantId, pathname, router]);

  if (!loaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAF9]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7FAF9]">
      <Toaster />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <OnboardingBanner />
        <TrialBanner />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
