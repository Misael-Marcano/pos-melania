/**
 * check-docs-links.mjs — validación de enlaces Markdown internos bajo docs/.
 *
 * Alcance:
 * - Origen: todos los archivos .md bajo docs/ (recursivo).
 * - Destino: solo rutas de archivo cuyo path sin fragmento # termina en .md.
 *
 * No valida (se omiten sin error):
 * - Esquemas http:, https:, mailto:, javascript:, data:
 * - Enlaces solo ancla (#...) o vacíos; destinos cuyo path no termina en .md.
 *
 * Limitaciones:
 * - Solo detecta destinos en sintaxis Markdown cierre-corchete-paréntesis; no analiza HTML a href.
 * - Antes de buscar enlaces, sustituye fragmentos entre comillas invertidas por espacios.
 * - Sin peticiones de red; no comprueba URLs externas.
 *
 * Opciones CLI:
 * - --verbose o -v: traza por archivo y enlace (stderr).
 *
 * Contrato CI / npm: sin flags, exit 0 si todo OK, exit 1 si hay enlaces rotos (igual que antes).
 *
 * Uso desde la raíz: node scripts/check-docs-links.mjs  [ --verbose | -v ]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const docsRoot = path.join(root, 'docs');

const argv = process.argv.slice(2);
const verbose = argv.includes('--verbose') || argv.includes('-v');

/** @param {string} msg */
function vlog(msg) {
  if (verbose) console.error(`[docs-links] ${msg}`);
}

/** @param {string} dir */
function* walkMdFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkMdFiles(full);
    else if (e.isFile() && e.name.endsWith('.md')) yield full;
  }
}

/**
 * @param {string} raw contenido dentro de `](...)`
 * @returns {string|null} URL/path sin comillas de título
 */
function parseLinkTarget(raw) {
  let s = raw.trim();
  if (!s) return null;
  if (s.startsWith('<')) {
    const end = s.indexOf('>');
    if (end !== -1) s = s.slice(1, end).trim();
    else s = s.slice(1).trim();
  } else {
    const m = s.match(/^([^\s]+)(\s+["'][^"']*["'])?\s*$/);
    if (m) s = m[1];
    else s = s.split(/\s+/)[0] ?? '';
  }
  return s || null;
}

/**
 * @param {string} fromAbs ruta absoluta del .md que contiene el enlace
 * @param {string} href path o URL
 */
function resolveHrefToFsPath(fromAbs, href) {
  const lower = href.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) return null;
  if (lower.startsWith('mailto:')) return null;
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return null;
  const hashIdx = href.indexOf('#');
  const pathPart = hashIdx === 0 ? '' : hashIdx === -1 ? href : href.slice(0, hashIdx);
  const trimmed = pathPart.trim();
  if (!trimmed) return null;
  if (!trimmed.toLowerCase().endsWith('.md')) return null;
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    /* usar trimmed */
  }
  const baseDir = path.join(path.dirname(fromAbs), path.sep);
  const baseUrl = pathToFileURL(baseDir).href;
  let url;
  try {
    url = new URL(decoded, baseUrl);
  } catch {
    return /** @type {const} */ ({ kind: 'badurl', href });
  }
  if (url.protocol !== 'file:') return null;
  return fileURLToPath(url);
}

function stripInlineCode(src) {
  return src.replace(/`[^`]*`/g, ' ');
}

/** @typedef {{ sourceRel: string; href: string; detail: string }} BrokenEntry */

/** @type {BrokenEntry[]} */
const broken = [];

vlog(`Raíz del repo: ${root}`);
vlog(`Solo se analizan .md bajo: ${path.relative(root, docsRoot) || 'docs'}`);

for (const fileAbs of walkMdFiles(docsRoot)) {
  const sourceRel = path.relative(root, fileAbs);
  vlog(`Archivo: ${sourceRel}`);

  let src = fs.readFileSync(fileAbs, 'utf8');
  src = stripInlineCode(src);
  const re = /\]\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const raw = m[1];
    const target = parseLinkTarget(raw);
    if (!target) {
      vlog(`  omitido (destino vacío o no parseable): ${JSON.stringify(raw)}`);
      continue;
    }
    if (target.startsWith('#')) {
      vlog(`  omitido (solo ancla): ${target}`);
      continue;
    }
    const lower = target.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
      vlog(`  omitido (http(s)): ${target}`);
      continue;
    }
    if (lower.startsWith('mailto:')) {
      vlog(`  omitido (mailto): ${target}`);
      continue;
    }
    if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
      vlog(`  omitido (protocolo no archivo): ${target}`);
      continue;
    }

    const hashIdx = target.indexOf('#');
    const pathPart = hashIdx === 0 ? '' : hashIdx === -1 ? target : target.slice(0, hashIdx);
    const trimmedPath = pathPart.trim();
    if (trimmedPath && !trimmedPath.toLowerCase().endsWith('.md')) {
      vlog(`  omitido (destino no .md): ${target}`);
      continue;
    }

    const resolved = resolveHrefToFsPath(fileAbs, target);
    if (resolved === null) {
      vlog(`  omitido (sin comprobación de disco): ${target}`);
      continue;
    }
    if (typeof resolved === 'object' && resolved?.kind === 'badurl') {
      vlog(`  ERROR (URL inválida): ${target}`);
      broken.push({
        sourceRel,
        href: target,
        detail: 'URL inválida (no se pudo resolver a ruta de archivo)',
      });
      continue;
    }
    const resolvedRel = path.relative(root, resolved);
    if (!fs.existsSync(resolved)) {
      vlog(`  ERROR (no existe): ${target} → ${resolvedRel}`);
      broken.push({
        sourceRel,
        href: target,
        detail: `archivo esperado inexistente: ${resolvedRel}`,
      });
    } else {
      vlog(`  OK: ${target} → ${resolvedRel}`);
    }
  }
}

if (broken.length) {
  console.error('');
  console.error(`check-docs-links: FAILED — ${broken.length} enlace(s) .md roto(s) bajo docs/`);
  console.error('');
  for (const { sourceRel, href, detail } of broken) {
    console.error(`  Origen:  ${sourceRel}`);
    console.error(`  Enlace:  ${href}`);
    console.error(`  Detalle: ${detail}`);
    console.error('');
  }
  process.exit(1);
}

console.log('OK check-docs-links: sin enlaces .md rotos bajo docs/.');
process.exit(0);
