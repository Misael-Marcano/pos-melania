import { POSScreen } from '@/components/ventas/POSScreen';

export default function VentasPage() {
  return (
    <main aria-labelledby="ventas-heading" className="space-y-4">
      <h1 id="ventas-heading" className="sr-only">
        Nueva Venta
      </h1>
      <POSScreen />
    </main>
  );
}
