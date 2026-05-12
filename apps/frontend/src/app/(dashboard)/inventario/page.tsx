import { InventarioTable } from '@/components/inventario/InventarioTable';
import { PageHeader } from '@/components/layout/PageHeader';

export default function InventarioPage() {
  return (
    <main aria-labelledby="inventario-heading" className="space-y-4">
      <h1 id="inventario-heading" className="sr-only">
        Inventario
      </h1>
      <PageHeader title="Inventario" breadcrumb={['Panel', 'Inventario']} />
      <InventarioTable />
    </main>
  );
}
