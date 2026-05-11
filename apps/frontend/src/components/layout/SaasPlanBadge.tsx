'use client';

import type { SaasPlanLimits, SaasUsage } from '@pos/shared';

function limitsTitle(l: SaasPlanLimits, u: SaasUsage): string {
  const parts: string[] = [];
  if (l.maxUsers != null) {
    parts.push(`Usuarios: ${u.seats}/${l.maxUsers}`);
  } else {
    parts.push(`Usuarios: ${u.seats}`);
  }
  if (l.maxTiendas != null) {
    parts.push(`Sucursales: ${u.tiendasActivas}/${l.maxTiendas}`);
  } else {
    parts.push(`Sucursales: ${u.tiendasActivas}`);
  }
  if (l.maxArticulos != null) {
    parts.push(`Artículos: ${u.articulosActivos}/${l.maxArticulos}`);
  } else {
    parts.push(`Artículos: ${u.articulosActivos}`);
  }
  parts.push(`Ventas este mes: ${u.ventasMesActual}`);
  return `Plan ${l.label} — ${parts.join(' · ')}`;
}

export function SaasPlanBadge({ limits, usage }: { limits: SaasPlanLimits; usage: SaasUsage }) {
  return (
    <span
      className="hidden md:inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-navy-100 text-navy-700 border border-navy-200/80 max-w-[14rem] truncate"
      title={limitsTitle(limits, usage)}
    >
      Plan {limits.label}
    </span>
  );
}
