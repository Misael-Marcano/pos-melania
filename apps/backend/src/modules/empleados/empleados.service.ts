import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/database';
import { Usuario } from '../../entities/Usuario.entity';
import { Empleado } from '../../entities/Empleado.entity';
import { Tienda } from '../../entities/Tienda.entity';
import { Tenant } from '../../entities/Tenant.entity';
import { AppError } from '../../middlewares/error.middleware';
import { CreateEmpleadoDto, UpdateEmpleadoDto } from './dto/empleados.dto';
import { AuthUser } from '@pos/shared';
import { assertTenantMatch, tenantIdOrThrow } from '../../utils/tenant-access';
import { assertTenantCanAddUsuario } from '../../saas/enforce-plan';

const usuarioRepo  = () => AppDataSource.getRepository(Usuario);
const empleadoRepo = () => AppDataSource.getRepository(Empleado);
const tiendaRepo   = () => AppDataSource.getRepository(Tienda);

export class EmpleadosService {
  async findAll(user: AuthUser) {
    const myTid = tenantIdOrThrow(user);
    const emps = await empleadoRepo().find({
      where: { activo: true, tenant: { id: myTid } },
      order: { nombre: 'ASC' },
    });
    const usuarios = await usuarioRepo().find({
      where: { tenant: { id: myTid } },
      relations: ['tienda', 'tenant'],
    });
    const byEmail = new Map(usuarios.map((u) => [u.email.toLowerCase(), u]));
    return emps.map((e) => {
      const u = byEmail.get(e.correo.toLowerCase());
      return {
        ...e,
        tiendaId:     u?.tienda?.id ?? null,
        tiendaNombre: u?.tienda?.nombre ?? null,
      };
    });
  }

  async findById(id: number, user: AuthUser): Promise<Empleado> {
    const myTid = tenantIdOrThrow(user);
    const e = await empleadoRepo().findOne({ where: { id, tenant: { id: myTid } } });
    if (!e) throw new AppError('Empleado no encontrado', 404);
    return e;
  }

  /** Resuelve tenant del nuevo usuario: sucursal asignada o la organización del admin. */
  private async resolveTenantForNewUser(
    dto: CreateEmpleadoDto,
    currentUser: AuthUser,
  ): Promise<Tenant> {
    const myTid = tenantIdOrThrow(currentUser);
    if (dto.tiendaId != null && dto.tiendaId > 0) {
      const tienda = await tiendaRepo().findOne({
        where: { id: dto.tiendaId },
        relations: ['tenant'],
      });
      if (!tienda) throw new AppError('Sucursal no encontrada', 404);
      assertTenantMatch(currentUser, tienda.tenant?.id);
      return tienda.tenant;
    }
    return { id: myTid } as Tenant;
  }

  /** Crea empleado Y usuario de acceso al sistema */
  async create(dto: CreateEmpleadoDto, currentUser: AuthUser): Promise<Empleado> {
    if (dto.rol !== 'admin' && (dto.tiendaId == null || dto.tiendaId <= 0)) {
      throw new AppError('Debes asignar una sucursal para cajero o soporte', 400);
    }

    const existe = await usuarioRepo().findOne({ where: { email: dto.correo } });
    if (existe) throw new AppError('Ya existe un usuario con ese correo', 409);

    const tenant = await this.resolveTenantForNewUser(dto, currentUser);
    await assertTenantCanAddUsuario(tenant.id);

    const hash    = await bcrypt.hash(dto.password, 10);
    const usuario = usuarioRepo().create({
      nombre:       dto.nombre,
      email:        dto.correo,
      passwordHash: hash,
      rol:          dto.rol,
      telefono:     dto.telefono,
      foto:         dto.foto,
      tenant,
      tienda:       dto.tiendaId ? ({ id: dto.tiendaId } as Tienda) : undefined,
    });
    await usuarioRepo().save(usuario);

    const emp = empleadoRepo().create({
      nombre:   dto.nombre,
      correo:   dto.correo,
      telefono: dto.telefono,
      rol:      dto.rol,
      foto:     dto.foto,
      tenant,
    });
    return empleadoRepo().save(emp);
  }

  async update(id: number, dto: UpdateEmpleadoDto, currentUser: AuthUser): Promise<Empleado> {
    const myTid = tenantIdOrThrow(currentUser);
    const emp = await empleadoRepo().findOne({ where: { id, tenant: { id: myTid } } });
    if (!emp) throw new AppError('Empleado no encontrado', 404);
    const usuarioPrev = await usuarioRepo().findOne({
      where: { email: emp.correo },
      relations: ['tienda', 'tenant'],
    });
    if (!usuarioPrev) throw new AppError('Empleado no encontrado', 404);
    assertTenantMatch(currentUser, usuarioPrev.tenant?.id);

    Object.assign(emp, dto);

    if (dto.correo || dto.rol || dto.nombre || dto.password || dto.tiendaId !== undefined) {
      const usuario = await usuarioRepo().findOne({
        where: { email: usuarioPrev.email },
        relations: ['tienda', 'tenant'],
      });
      if (!usuario) throw new AppError('Usuario de acceso no encontrado', 404);
      assertTenantMatch(currentUser, usuario.tenant?.id);
      if (dto.nombre)   usuario.nombre = dto.nombre;
      if (dto.rol)      usuario.rol    = dto.rol;
      if (dto.correo)   usuario.email  = dto.correo;
      if (dto.password) usuario.passwordHash = await bcrypt.hash(dto.password, 10);
      if (dto.tiendaId !== undefined) {
        if (dto.tiendaId) {
          const tienda = await tiendaRepo().findOne({
            where: { id: dto.tiendaId },
            relations: ['tenant'],
          });
          if (!tienda) throw new AppError('Sucursal no encontrada', 404);
          assertTenantMatch(currentUser, tienda.tenant?.id);
          usuario.tienda = tienda;
        } else {
          usuario.tienda = null;
        }
      }
      const rolFinal = dto.rol ?? usuario.rol;
      if (rolFinal !== 'admin' && !usuario.tienda) {
        throw new AppError('Asigna una sucursal al usuario (requerido para cajero y soporte)', 400);
      }
      await usuarioRepo().save(usuario);
    }

    return empleadoRepo().save(emp);
  }

  async delete(id: number, user: AuthUser): Promise<void> {
    const emp = await this.findById(id, user);
    emp.activo = false;
    await empleadoRepo().save(emp);

    const usuario = await usuarioRepo().findOne({
      where: { email: emp.correo },
      relations: ['tenant'],
    });
    if (usuario) {
      assertTenantMatch(user, usuario.tenant?.id);
      usuario.activo = false;
      await usuarioRepo().save(usuario);
    }
  }
}
