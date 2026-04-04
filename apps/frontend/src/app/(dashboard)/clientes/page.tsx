import { ClientesTable } from '@/components/clientes/ClientesTable';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ClientesPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Clientes" breadcrumb={['Panel', 'Clientes']} />
      <ClientesTable />
    </div>
  );
}
