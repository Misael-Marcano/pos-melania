import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/database';
import { cache } from '../../config/redis';
import { env } from '../../config/env';
import { Usuario } from '../../entities/Usuario.entity';
import { LoginDto } from './dto/auth.dto';
import { TokenResponse, AuthUser } from '@pos/shared';

const repo = () => AppDataSource.getRepository(Usuario);

const BRUTE_PREFIX  = 'brute:';
const MAX_ATTEMPTS  = 5;
const BLOCK_SECONDS = 15 * 60;

const signAccess  = (p: AuthUser) => jwt.sign(p, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
const signRefresh = (id: number)  => jwt.sign({ id }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });

export class AuthService {

  async login(dto: LoginDto): Promise<TokenResponse> {
    const bruteKey = `${BRUTE_PREFIX}${dto.email}`;
    const attempts = await cache.get<number>(bruteKey);
    if (attempts && attempts >= MAX_ATTEMPTS)
      throw new Error('Cuenta bloqueada temporalmente. Intenta en 15 minutos.');

    const user = await repo().findOne({ where: { email: dto.email } });
    if (!user || !user.activo) {
      await this.incBrute(bruteKey);
      throw new Error('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.incBrute(bruteKey);
      throw new Error('Credenciales inválidas');
    }

    await cache.del(bruteKey);

    const payload: AuthUser = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    const accessToken  = signAccess(payload);
    const refreshToken = signRefresh(user.id);

    user.refreshToken = await bcrypt.hash(refreshToken, 8);
    user.ultimoAcceso = new Date();
    await repo().save(user);

    return { accessToken, refreshToken, user: payload };
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { id: number };
    try { payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number }; }
    catch { throw new Error('Refresh token inválido o expirado'); }

    const user = await repo().findOne({ where: { id: payload.id, activo: true } });
    if (!user?.refreshToken) throw new Error('Sesión expirada');

    const valid = await bcrypt.compare(token, user.refreshToken);
    if (!valid) throw new Error('Refresh token inválido');

    const newPayload: AuthUser = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    const newAccess  = signAccess(newPayload);
    const newRefresh = signRefresh(user.id);

    user.refreshToken = await bcrypt.hash(newRefresh, 8);
    await repo().save(user);

    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  async logout(userId: number): Promise<void> {
    await repo().update(userId, { refreshToken: null as any });
  }

  async getProfile(userId: number) {
    const user = await repo().findOne({ where: { id: userId } });
    if (!user) throw new Error('Usuario no encontrado');
    const { passwordHash, refreshToken, ...rest } = user;
    return rest;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await repo().findOne({ where: { id: userId } });
    if (!user) throw new Error('Usuario no encontrado');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Contraseña actual incorrecta');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.refreshToken = null as any;
    await repo().save(user);
  }

  private async incBrute(key: string) {
    const cur = (await cache.get<number>(key)) ?? 0;
    await cache.set(key, cur + 1, BLOCK_SECONDS);
  }
}
