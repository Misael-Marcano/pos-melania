import type { LucideIcon } from 'lucide-react';
import {
  BarChart2,
  FileText,
  Layers,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { uiLabels } from '@/lib/ui-labels';

export const LANDING_MODULES: {
  icon: LucideIcon;
  label: string;
  desc: string;
}[] = [
  {
    icon: ShoppingCart,
    label: 'Ventas en tienda',
    desc: 'Procesa ventas con múltiples métodos de pago, NCF y cambio automático.',
  },
  {
    icon: Package,
    label: 'Inventario',
    desc: 'Stock en tiempo real, ajustes, import CSV y auditoría de movimientos.',
  },
  {
    icon: Users,
    label: 'Clientes y crédito',
    desc: 'Cartera de clientes, límites de crédito, abonos y saldo pendiente.',
  },
  {
    icon: Store,
    label: 'Multi-sucursal',
    desc: 'Gestiona varias tiendas, cajas y cajeros desde un solo panel.',
  },
  {
    icon: BarChart2,
    label: uiLabels.reportes,
    desc: 'Ventas, P&L, inventario valorizado, clientes y exportaciones DGII.',
  },
  {
    icon: FileText,
    label: 'Fiscal NCF / DGII',
    desc: 'Series fiscales configurables y checklist operativo para República Dominicana.',
  },
  {
    icon: Receipt,
    label: 'Cajas y cierres',
    desc: 'Sesiones de caja, resumen de turno y PDF de cierre por sucursal.',
  },
  {
    icon: Layers,
    label: 'Kits y cotizaciones',
    desc: 'Arma combos de productos, genera presupuestos y conviértelos en venta.',
  },
  {
    icon: TrendingUp,
    label: 'Compras y proveedores',
    desc: 'Órdenes de compra con estados, recepción y actualización automática de stock.',
  },
];
