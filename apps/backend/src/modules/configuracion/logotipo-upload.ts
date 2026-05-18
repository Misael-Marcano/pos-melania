import fs from 'fs/promises';
import path from 'path';
import { Request } from 'express';
import multer from 'multer';
import { AuthUser } from '@pos/shared';
import { tenantIdOrThrow } from '../../utils/tenant-access';

export const LOGOTIPO_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function uploadsRoot(): string {
  return path.resolve(process.cwd(), 'uploads');
}

export function tenantLogoDir(tenantId: number): string {
  return path.join(uploadsRoot(), 'tenants', String(tenantId));
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  return '.jpg';
}

export function resolvePublicApiBase(req?: Request): string {
  const fromEnv =
    process.env.API_PUBLIC_URL?.trim() || process.env.BACKEND_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (req) {
    const proto = (req.get('x-forwarded-proto') ?? req.protocol ?? 'http').split(',')[0].trim();
    const host = (req.get('x-forwarded-host') ?? req.get('host') ?? '').split(',')[0].trim();
    if (host) return `${proto}://${host}`;
  }
  const port = process.env.PORT ?? '4000';
  return `http://localhost:${port}`;
}

export function publicLogotipoUrl(tenantId: number, ext: string, req?: Request): string {
  const base = resolvePublicApiBase(req);
  return `${base}/api/v1/uploads/tenants/${tenantId}/logo${ext}`;
}

async function removeExistingLogos(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((f) => /^logo\.(png|jpe?g|webp)$/i.test(f))
      .map((f) => fs.unlink(path.join(dir, f)).catch(() => undefined)),
  );
}

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const user = (req as Request & { user?: AuthUser }).user;
      if (!user) {
        cb(new Error('No autenticado'), '');
        return;
      }
      const dir = tenantLogoDir(tenantIdOrThrow(user));
      await fs.mkdir(dir, { recursive: true });
      await removeExistingLogos(dir);
      cb(null, dir);
    } catch (e: unknown) {
      cb(e instanceof Error ? e : new Error('Error al preparar carpeta'), '');
    }
  },
  filename: (_req, file, cb) => {
    cb(null, `logo${extFromMime(file.mimetype)}`);
  },
});

export const logotipoUploadMiddleware = multer({
  storage,
  limits: { fileSize: LOGOTIPO_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('Formato no permitido. Use PNG, JPEG o WebP.'));
      return;
    }
    cb(null, true);
  },
}).single('logotipo');
