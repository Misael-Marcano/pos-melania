/** Nombre para ticket/POS cuando el artículo tiene unidad (kg, und, etc.) */
export function nombreArticuloConUnidad(a: {
  nombre: string;
  unidadMedida?: string | null;
}): string {
  const u = a.unidadMedida?.trim();
  return u ? `${a.nombre} (${u})` : a.nombre;
}
