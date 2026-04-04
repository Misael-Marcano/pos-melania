'use client';

import { useState } from 'react';
import { useEmpleados, useCrearEmpleado, useActualizarEmpleado, useEliminarEmpleado } from '@/hooks/useEmpleados';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/layout/PageHeader';
import { IEmpleado } from '@pos/shared';
import { Plus, Pencil, Trash2, X, Loader2, Users, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { toast } from '@/store/toast.store';

const ROL_BADGE: Record<string, string> = {
  admin:   'badge-red',
  cajero:  'badge-green',
  soporte: 'badge-blue',
};

const ROL_LABEL: Record<string, string> = {
  admin:   'Administrador',
  cajero:  'Cajero',
  soporte: 'Soporte',
};

interface FormState {
  nombre:    string;
  correo:    string;
  telefono:  string;
  rol:       'admin' | 'cajero' | 'soporte';
  password:  string;
}

const EMPTY: FormState = { nombre: '', correo: '', telefono: '', rol: 'cajero', password: '' };

function EmpleadoModal({
  empleado,
  onClose,
}: {
  empleado: IEmpleado | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    empleado
      ? { nombre: empleado.nombre, correo: empleado.correo, telefono: empleado.telefono ?? '', rol: empleado.rol, password: '' }
      : EMPTY
  );
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const crear      = useCrearEmpleado();
  const actualizar = useActualizarEmpleado();
  const isPending  = crear.isPending || actualizar.isPending;

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.correo.trim()) { setError('El correo es obligatorio'); return; }
    if (!empleado && !form.password) { setError('La contraseña es obligatoria'); return; }
    if (form.password && form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    try {
      setError('');
      if (empleado) {
        const payload: any = { nombre: form.nombre, correo: form.correo, telefono: form.telefono || undefined, rol: form.rol };
        if (form.password) payload.password = form.password;
        await actualizar.mutateAsync({ id: empleado.id, payload });
      } else {
        await crear.mutateAsync({
          nombre:   form.nombre,
          correo:   form.correo,
          telefono: form.telefono || undefined,
          rol:      form.rol,
          password: form.password,
        });
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-[12px] shadow-float w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100/40">
          <h3 className="font-semibold text-navy-800">{empleado ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Nombre completo *</label>
            <input className="input-field" value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: María Pérez" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Correo electrónico *</label>
              <input type="email" className="input-field" value={form.correo}
                onChange={(e) => set('correo', e.target.value)} placeholder="correo@empresa.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-navy-700 block mb-1.5">Teléfono</label>
              <input className="input-field" value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)} placeholder="809-000-0000" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">Rol del sistema</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cajero', 'soporte', 'admin'] as const).map((r) => (
                <button key={r} type="button" onClick={() => set('rol', r)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.rol === r
                      ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white border-transparent'
                      : 'bg-navy-50 text-navy-600 border-transparent'
                  }`}>
                  {ROL_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="text-xs text-navy-400 mt-1.5">
              {form.rol === 'admin' && 'Acceso completo al sistema'}
              {form.rol === 'cajero' && 'Puede hacer ventas y gestionar inventario'}
              {form.rol === 'soporte' && 'Acceso de solo lectura y reportes'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-navy-700 block mb-1.5">
              {empleado ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field pr-10"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={empleado ? 'Nueva contraseña...' : 'Mínimo 6 caracteres'}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-navy-100/40">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex items-center gap-2">
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            {isPending ? 'Guardando...' : empleado ? 'Actualizar' : 'Crear empleado'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default function EmpleadosPage() {
  const currentUser             = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<IEmpleado | null>(null);

  const { data: empleados = [], isLoading } = useEmpleados();
  const eliminar = useEliminarEmpleado();

  const handleEditar  = (e: IEmpleado) => { setSelected(e); setModalOpen(true); };
  const handleNuevo   = ()             => { setSelected(null); setModalOpen(true); };

  const [confirmId, setConfirmId] = useState<number | null>(null);

  const handleEliminar = (id: number) => setConfirmId(id);
  const confirmarEliminar = async () => {
    if (!confirmId) return;
    try { await eliminar.mutateAsync(confirmId); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Error al desactivar'); }
    finally { setConfirmId(null); }
  };

  const isAdmin = currentUser?.rol === 'admin';

  return (
    <>
      <div className="space-y-4">
        <PageHeader title="Empleados" breadcrumb={['Panel', 'Empleados']} />

        <div className="bg-white rounded-[12px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-navy-100/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-navy-800 text-sm">Equipo</span>
              <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {empleados.length}
              </span>
            </div>
            {isAdmin && (
              <button onClick={handleNuevo} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={14} /> Nuevo empleado
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary-400" size={24} />
            </div>
          ) : empleados.length === 0 ? (
            <div className="text-center py-16 text-navy-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay empleados registrados</p>
              {isAdmin && (
                <button onClick={handleNuevo} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
                  <Plus size={14} /> Agregar primero
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-navy-50">
              {empleados.map((emp: IEmpleado) => (
                <div key={emp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-navy-50/40 transition-colors group">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {emp.nombre[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-navy-800">{emp.nombre}</p>
                      <span className={ROL_BADGE[emp.rol] ?? 'badge-gray'}>{ROL_LABEL[emp.rol]}</span>
                      {emp.id === currentUser?.id && (
                        <span className="badge-blue text-[10px]">Tú</span>
                      )}
                    </div>
                    <p className="text-sm text-navy-400 mt-0.5">{emp.correo}</p>
                    {emp.telefono && <p className="text-xs text-navy-400">{emp.telefono}</p>}
                  </div>

                  {/* Acciones */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleEditar(emp)} title="Editar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-primary-500 hover:bg-primary-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      {emp.id !== currentUser?.id && (
                        <button onClick={() => handleEliminar(emp.id)} title="Desactivar"
                          disabled={eliminar.isPending}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-navy-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <EmpleadoModal
          empleado={selected}
          onClose={() => { setModalOpen(false); setSelected(null); }}
        />
      )}

      {confirmId !== null && (
        <ModalOverlay onClose={() => setConfirmId(null)}>
          <div className="bg-white rounded-[12px] shadow-float w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <h3 className="font-semibold text-navy-800 mb-1">Desactivar empleado</h3>
            <p className="text-sm text-navy-500 mb-5">El empleado ya no podrá acceder al sistema.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setConfirmId(null)} className="btn-outline">Cancelar</button>
              <button onClick={confirmarEliminar} disabled={eliminar.isPending}
                className="btn-danger flex items-center gap-2">
                {eliminar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Desactivar
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
