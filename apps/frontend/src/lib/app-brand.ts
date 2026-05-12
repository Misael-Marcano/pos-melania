/**
 * Marca en pantalla (login, barra lateral, metadatos).
 * Personalizar por despliegue con variables `NEXT_PUBLIC_*` (ver `.env.example` en la raíz del monorepo).
 */
export const appBrand = {
  /** Nombre visible principal (ej. barra lateral, cabecera login) */
  shortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME ?? 'Nexo',
  /** Segunda línea bajo el nombre (rubro, razón social corta o vacío) */
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE ?? 'Ventas e inventario',
  title: process.env.NEXT_PUBLIC_APP_METADATA_TITLE ?? 'Nexo — Ventas e inventario',
  description:
    process.env.NEXT_PUBLIC_APP_METADATA_DESCRIPTION ??
    'Sistema de ventas, inventario y operación multi-sucursal',
  /** Texto del copyright sin el símbolo © ni el año (ej. nombre legal) */
  copyrightEntity: process.env.NEXT_PUBLIC_APP_COPYRIGHT_ENTITY ?? 'Mi empresa',
  /** Correo de ventas/soporte mostrado en la landing (mailto:) */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  /** Número WhatsApp con código de país, sin + ni espacios (ej. 18091234567) */
  contactWhatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? '',
} as const;

export function copyrightLine(year = new Date().getFullYear()): string {
  return `© ${year} ${appBrand.copyrightEntity}. Todos los derechos reservados.`;
}
