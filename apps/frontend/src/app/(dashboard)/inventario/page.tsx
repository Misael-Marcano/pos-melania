import { InventarioTable } from '@/components/inventario/InventarioTable';
import { PageHeader } from '@/components/layout/PageHeader';

export default function InventarioPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Inventario" breadcrumb={['Panel', 'Inventario']} />
      <InventarioTable />
    </div>
  );
}
