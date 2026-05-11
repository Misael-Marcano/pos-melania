# Plan: Lector de Código de Barras

**Objetivo:** Soporte completo de scanners físicos (USB/Bluetooth keyboard-wedge) y cámara del dispositivo en todos los módulos relevantes del POS.

---

## Estado actual (baseline)


| Módulo                            | Scanner físico (teclado)                   | Cámara |
| --------------------------------- | ------------------------------------------ | ------ |
| POS — buscar artículo             | ✅ funciona (input enfocado + Enter)        | ❌      |
| Inventario — campo `codigoBarras` | ✅ se puede escribir/escanear si tiene foco | ❌      |
| Compras, Devoluciones, otros      | ❌ sin soporte                              | ❌      |


**Limitación principal actual:** el scanner físico solo funciona si el input del POS tiene el foco; cualquier clic en otro elemento de la pantalla rompe la captura.

---

## Fases

---

### Fase 1 — Hook global de scanner físico (USB/Bluetooth)

> Estado: ✅ Completado — 2026-04-08

**Problema:** Los scanners de teclado emiten los caracteres del código muy rápido (todas las teclas en <100 ms) y finalizan con `Enter`. Si el input no tiene foco, la secuencia se pierde o va al elemento equivocado.

**Solución:** Hook `useBarcodeScanner(onScan, options?)` que escucha eventos `keydown` en `document`, acumula los caracteres dentro de una ventana de tiempo y dispara el callback cuando detecta la secuencia característica de un scanner.

**Tareas:**

- Crear `apps/frontend/src/hooks/useBarcodeScanner.ts`
  - Listener global en `document` (keydown)
  - Acumulador de caracteres con timeout (~80 ms entre teclas)
  - Dispara `onScan(codigo)` al recibir `Enter` con ≥3 caracteres acumulados
  - Opción `disabled` para desactivarlo en modales/pantallas que no lo necesitan
  - No interfiere con inputs/textareas que tienen foco (escritura normal del usuario)
- Integrar en `POSScreen.tsx`
  - Hook activo solo en modo carrito y sin recibo abierto
  - Si el barcode no existe → carga el código en el input para búsqueda por nombre
  - Funciona aunque el foco esté en cualquier otro elemento
- Feedback visual: destello verde de 400 ms en el input al detectar un escaneo exitoso

---

### Fase 2 — Componente de cámara (`<BarcodeCamera />`)

> Estado: ✅ Completado — 2026-04-08

**Para tablets, móviles o cuando no hay scanner físico.**

**Dependencia:** `@zxing/browser` (decodificación en el navegador, sin servidor).

**Tareas:**

- Instalar `@zxing/browser` en `apps/frontend`
- Crear `apps/frontend/src/components/common/BarcodeCamera.tsx`
  - Modal con feed de la cámara del dispositivo
  - Al detectar un código válido: cierra modal, llama `onDetect(codigo)`
  - Manejo de permisos denegados / sin cámara disponible
  - Selector de cámara si hay varias (frontal / trasera — auto-selecciona trasera)
  - Overlay de mira con esquinas y destello verde al detectar
- Botón de cámara en el POS (junto al input de búsqueda)
  - Al detectar → mismo flujo que scanner físico (buscar por barcode → agregar al carrito)
  - Si no existe el barcode → carga el código en el input para búsqueda manual
  - Scanner físico se desactiva mientras la cámara está abierta (evita duplicados)
- Botón de cámara en formulario de artículo (campo `codigoBarras`)
  - Al detectar → llena el campo con el código escaneado (con validación reactiva)

---

### Fase 3 — Soporte en módulo de Inventario

> Estado: ✅ Completado — 2026-04-08

**Tareas:**

- Campo `codigoBarras` en el formulario de artículo soporta cámara (botón integrado)
- Hook `useBarcodeScanner` activo en `InventarioTable`
  - Al escanear → busca artículo por barcode y abre su ficha directamente
  - Si no existe → carga el código en el buscador y filtra la tabla
  - Desactivado cuando hay cualquier modal abierto
- Página de búsqueda rápida por código (`/inventario/buscar`): escanear → ver artículo, stock, precio, historial + botones Ajustar / Editar

---

### Fase 4 — Soporte en otros módulos

> Estado: ✅ Completado — 2026-04-08

**Tareas:**

- **Órdenes de Compra:** scanner físico + botón cámara en el buscador de artículos del modal
  - Al escanear → agrega artículo directamente a la orden si existe
  - Si no existe → carga el código en el buscador para búsqueda manual
- **Devoluciones:** scanner en el paso de selección de artículos
  - Al escanear el código de un artículo → lo marca/desmarca en la lista de ítems a devolver
  - Si el artículo no está en la venta → aviso informativo
- **Ajuste de inventario:** scanner en `InventarioTable` ahora abre `AjustarInventarioModal` directamente al escanear (más útil en operaciones diarias que el formulario de edición)

---

## Notas técnicas

### Cómo detectar un scanner vs. escritura manual


| Característica         | Scanner físico | Teclado humano    |
| ---------------------- | -------------- | ----------------- |
| Velocidad entre teclas | < 50–80 ms     | > 100–150 ms      |
| Finaliza con `Enter`   | Siempre        | No necesariamente |
| Longitud mínima útil   | ≥ 3 caracteres | Cualquiera        |


El hook usa estas tres señales para distinguir automáticamente un escaneo de una búsqueda manual, sin bloquear el input normal.

### Formatos de barcode soportados (`@zxing/browser`)

EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code, y otros.

---

## Registro de cambios


| Fecha      | Fase         | Descripción                                                                                            |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| 2026-04-08 | 1            | Hook `useBarcodeScanner` + integración en POSScreen con flash visual                                   |
| 2026-04-08 | 2            | Componente `BarcodeCamera` + botón en POS + botón en formulario de artículo                            |
| 2026-04-08 | 3 (parcial)  | Cámara en campo `codigoBarras` del formulario de artículo                                              |
| 2026-04-08 | 3 (opcional) | Página `/inventario/buscar` — búsqueda rápida con scanner/cámara, ficha completa, historial y acciones |
| 2026-04-08 | 4 (opcional) | Scanner en `InventarioTable` ahora abre `AjustarInventarioModal` directamente                          |
