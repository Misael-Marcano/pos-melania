import { ClientesTable } from '@/components/clientes/ClientesTable';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ClientesPage() {
  return (
    <main aria-labelledby="clientes-heading" className="space-y-4">
      <h1 id="clientes-heading" className="sr-only">
        Clientes
      </h1>
      <PageHeader title="Clientes" breadcrumb={['Panel', 'Clientes']} />
      <ClientesTable />
    </main>
  );
}
