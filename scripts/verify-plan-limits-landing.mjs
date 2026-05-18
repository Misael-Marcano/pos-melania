/**
 * Purpose: fail CI/dev checks if marketing copy diverges from the source of truth for SaaS caps.
 *
 * Invoked by `npm run verify:landing-plans` and chained from `npm run verify`.
 *
 * Contract: landing `PLANS` (in `apps/frontend/src/components/landing/landing-plans.ts`) must match limits in
 * `apps/backend/src/saas/plan-limits.ts` (`PLAN_LIMITS`).
 *
 * También se puede ejecutar desde la raíz: `node scripts/verify-plan-limits-landing.mjs`
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function parsePlanBlock(src, code) {
  const re = new RegExp(`${code}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
  const m = src.match(re);
  if (!m) throw new Error(`No se encontró bloque PLAN_LIMITS para "${code}"`);
  const body = m[1];
  const mu = body.match(/maxUsers:\s*(null|\d+)/);
  const mt = body.match(/maxTiendas:\s*(null|\d+)/);
  const ma = body.match(/maxArticulos:\s*(null|[\d_]+)/);
  return {
    maxUsers:     mu?.[1] === 'null' ? null : Number(mu?.[1]),
    maxTiendas:   mt?.[1] === 'null' ? null : Number(mt?.[1]),
    maxArticulos: ma?.[1] === 'null' ? null : Number(String(ma?.[1]).replace(/_/g, '')),
  };
}

function extractLandingPlanLimits(pageSrc, code) {
  const re = new RegExp(`code:\\s*'${code}'[\\s\\S]*?limits:\\s*\\[([\\s\\S]*?)\\]`, 'm');
  const m = pageSrc.match(re);
  if (!m) throw new Error(`No se encontró PLANS[${code}].limits en landing-plans.ts`);
  const inner = m[1];
  const users = inner.match(/(\d+)\s*usuarios/i);
  const tiendas = inner.match(/(\d+)\s*sucursal/i);
  const arts = inner.match(/Hasta\s*([\d\s]+)\s*artículos/i) || inner.match(/(\d+)\s*artículos/i);
  return {
    maxUsers:     users ? Number(users[1].replace(/\s/g, '')) : null,
    maxTiendas:   tiendas ? Number(tiendas[1]) : null,
    maxArticulos: arts ? Number(arts[1].replace(/\s/g, '')) : null,
  };
}

function assertMatch(code, pl, pg) {
  const fields = ['maxUsers', 'maxTiendas', 'maxArticulos'];
  for (const f of fields) {
    if (pl[f] !== pg[f]) {
      throw new Error(`${code}.${f}: plan-limits=${pl[f]} landing=${pg[f]}`);
    }
  }
}

const planSrc = fs.readFileSync(path.join(root, 'apps/backend/src/saas/plan-limits.ts'), 'utf8');
const pageSrc = fs.readFileSync(
  path.join(root, 'apps/frontend/src/components/landing/landing-plans.ts'),
  'utf8',
);

for (const code of ['starter', 'standard']) {
  const pl = parsePlanBlock(planSrc, code);
  const pg = extractLandingPlanLimits(pageSrc, code);
  assertMatch(code, pl, pg);
  console.log(`OK ${code}: usuarios=${pl.maxUsers} sucursales=${pl.maxTiendas} artículos=${pl.maxArticulos}`);
}

const ent = parsePlanBlock(planSrc, 'enterprise');
if (ent.maxUsers !== null || ent.maxTiendas !== null || ent.maxArticulos !== null) {
  throw new Error('enterprise en plan-limits debería usar null para topes en esta verificación');
}
const entPage = pageSrc.match(/code:\s*'enterprise'[\s\S]*?limits:\s*\[([^\]]+)\]/m);
if (!entPage?.[1].toLowerCase().includes('ilimitad')) {
  console.warn('Advertencia: revisar copy de enterprise (ilimitado) en landing.');
}
console.log('OK verify-plan-limits-landing: starter y standard alineados.');
