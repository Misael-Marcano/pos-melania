export interface VentasResumenPdfInput {
  nombreCompania?: string | null;
  desde: string;
  hasta: string;
  timezone: string;
  ventasPorDia: { dia: string; totalVentas: number; totalMonto: number }[];
  totales: { transacciones: number; monto: number; ticketPromedio: number };
}

export function buildVentasResumenPdf(input: VentasResumenPdfInput): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const fmt = (n: number) =>
    n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const titulo = input.nombreCompania?.trim() || 'Reporte de ventas';
    doc.fontSize(14).font('Helvetica-Bold').text(titulo, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text('Resumen de ventas', { align: 'center' });
    doc.fontSize(9).fillColor('#444').text(
      `Período: ${input.desde} — ${input.hasta} · Zona: ${input.timezone}`,
      { align: 'center' },
    );
    doc.fillColor('#000').moveDown(0.8);

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Transacciones: ${input.totales.transacciones}`);
    doc.text(`Ventas totales: ${fmt(input.totales.monto)}`);
    doc.text(`Ticket promedio: ${fmt(input.totales.ticketPromedio)}`);
    doc.moveDown(0.6);

    doc.fontSize(10).font('Helvetica-Bold').text('Detalle por día');
    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica');
    const colDia = 48;
    const colTx = 200;
    const colMonto = 380;
    let y = doc.y;
    doc.text('Fecha', colDia, y);
    doc.text('Trans.', colTx, y);
    doc.text('Monto', colMonto, y, { width: 120, align: 'right' });
    y += 12;
    doc.moveTo(48, y).lineTo(547, y).stroke('#ccc');
    y += 6;

    for (const row of input.ventasPorDia) {
      if (y > 720) {
        doc.addPage();
        y = 48;
      }
      const tv = Number(row.totalVentas);
      const tm = Number(row.totalMonto);
      const dia = String(row.dia).slice(0, 10);
      doc.text(dia, colDia, y);
      doc.text(String(tv), colTx, y);
      doc.text(fmt(tm), colMonto, y, { width: 120, align: 'right' });
      y += 11;
    }

    doc.end();
  });
}
