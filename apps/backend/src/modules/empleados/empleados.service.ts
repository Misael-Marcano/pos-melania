import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/database';
import { Usuario } from '../../entities/Usuario.entity';
import { Empleado } from '../../entities/Empleado.entity';
import { AppError } from '../../middlewares/error.middleware';
import { CreateEmpleadoDto, UpdateEmpleadoDto } from './dto/empleados.dto';

const usuarioRepo  = () => AppDataSource.getRepository(Usuario);
const empleadoRepo = () => AppDataSource.getRepository(Empleado);

export class EmpleadosService {
  async findAll() {
    return empleadoRepo().find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findById(id: number): Promise<Empleado> {
    const e = await empleadoRepo().findOne({ where: { id } });
    if (!e) throw new AppError('Empleado no encontrado', 404);
    return e;
  }

  /** Crea empleado Y usuario de acceso al sistema */
  async create(dto: CreateEmpleadoDto): Promise<Empleado> {
    const existe = await usuarioRepo().findOne({ where: { email: dto.correo } });
    if (existe) throw new AppError('Ya existe un usuario con ese correo', 409);

    // Crear usuario de acceso
    const hash    = await bcrypt.hash(dto.password, 10);
    const usuario = usuarioRepo().create({
      nombre:       dto.nombre,
      email:        dto.correo,
      passwordHash: hash,
      rol:          dto.rol,
      telefono:     dto.telefono,
      foto:         dto.foto,
    });
    await usuarioRepo().save(usuario);

    // Crear registro de empleado
    const emp = empleadoRepo().create({
      nombre:   dto.nombre,
      correo:   dto.correo,
      telefono: dto.telefono,
      rol:      dto.rol,
      foto:     dto.foto,
    });
    return empleadoRepo().save(emp);
  }

  async update(id: number, dto: UpdateEmpleadoDto): Promise<Empleado> {
    const emp = await this.findById(id);
    Object.assign(emp, dto);

    // Actualizar también en usuarios si cambia rol / nombre
    if (dto.correo || dto.rol || dto.nombre || dto.password) {
      const usuario = await usuarioRepo().findOne({ where: { email: emp.correo } });
      if (usuario) {
        if (dto.nombre)   usuario.nombre = dto.nombre;
        if (dto.rol)      usuario.rol    = dto.rol;
        if (dto.correo)   usuario.email  = dto.correo;
        if (dto.password) usuario.passwordHash = await bcrypt.hash(dto.password, 10);
        await usuarioRepo().save(usuario);
      }
    }

    return empleadoRepo().save(emp);
  }

  async delete(id: number): Promise<void> {
    const emp = await this.findById(id);
    emp.activo = false;
    await empleadoRepo().save(emp);

    // Desactivar usuario también
    const usuario = await usuarioRepo().findOne({ where: { email: emp.correo } });
    if (usuario) {
      usuario.activo = false;
      await usuarioRepo().save(usuario);
    }
  }
}
