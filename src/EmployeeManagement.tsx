import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Phone, LayoutDashboard, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role =
  | 'Admin'
  | 'Ventas'
  | 'Diseño'
  | 'Impresión'
  | 'Sublimación'
  | 'Corte'
  | 'Confección'
  | 'Empaque';

interface Employee {
  id: string;
  name: string;
  role: Role;
  phone: string;
  pin: string;
  active: boolean;
}

interface EmployeeReport {
  // Ajusta esta interfaz según la forma real de tu reporte
  [key: string]: unknown;
}

// ─── Placeholder utilities ────────────────────────────────────────────────────
// Reemplaza estos con tus importaciones reales

const cn = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(' ');

const toast = {
  success: (msg: string) => console.log('✅', msg),
  error: (msg: string) => console.error('❌', msg),
};

const api = {
  getEmployees: async (_includeInactive: boolean): Promise<Employee[]> => [],
  getEmployeeReport: async (): Promise<EmployeeReport[]> => [],
  createEmployee: async (_data: FormData): Promise<void> => {},
  updateEmployee: async (_id: string, _data: FormData): Promise<void> => {},
};

// ─── Placeholder components ───────────────────────────────────────────────────
// Reemplaza estos con tus importaciones reales

const LoadingState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center py-20 text-foreground-muted font-black uppercase tracking-widest text-xs">
    {message}…
  </div>
);

const EmptyState = ({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <Icon className="text-foreground-muted" size={48} />
    <h4 className="font-black text-lg text-foreground-main tracking-tight">{title}</h4>
    <p className="text-foreground-muted text-sm">{message}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="bg-accent text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs mt-2"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('bg-surface rounded-2xl p-6 border border-border-custom', className)}>
    {children}
  </div>
);

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black tracking-tight text-foreground-main">{title}</h3>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground-main">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full px-4 py-3 rounded-xl bg-surface-hover border border-border-custom text-foreground-main placeholder:text-foreground-muted focus:outline-none focus:border-accent transition-all"
    />
  </div>
);

const Select = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 rounded-xl bg-surface-hover border border-border-custom text-foreground-main focus:outline-none focus:border-accent transition-all"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeManagement(_: { key?: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [, setReport] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [employeeToToggle, setEmployeeToToggle] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Paginación
  const ITEMS_PER_PAGE = 9;
  const [currentPageActive, setCurrentPageActive] = useState(1);
  const [currentPageInactive, setCurrentPageInactive] = useState(1);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: 'Confección' as Role,
    phone: '',
    pin: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    pin: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'active') {
      setCurrentPageActive(1);
    } else {
      setCurrentPageInactive(1);
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, reportData] = await Promise.all([
        api.getEmployees(true),
        api.getEmployeeReport(),
      ]);
      setEmployees(empData);
      setReport(reportData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewEmployee({ name: '', role: 'Confección', phone: '', pin: '' });
    setErrors({ name: '', phone: '', pin: '' });
  };

  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 animate-in fade-in duration-200">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{message}</p>
    </div>
  );

  const validateForm = () => {
    const newErrors = { name: '', phone: '', pin: '' };

    if (!newEmployee.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!newEmployee.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    }

    if (!editingEmployee || newEmployee.pin) {
      if (!newEmployee.pin.trim()) {
        newErrors.pin = 'El PIN es obligatorio';
      } else if (newEmployee.pin.length !== 4) {
        newErrors.pin = 'El PIN debe tener 4 dígitos';
      } else {
        const pinExists = employees.some(
          (emp) => emp.pin === newEmployee.pin && emp.id !== editingEmployee?.id,
        );
        if (pinExists) {
          newErrors.pin = 'Este PIN ya está siendo utilizado';
        }
      }
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.phone && !newErrors.pin;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const formData = new FormData();
      formData.append('name', newEmployee.name);
      formData.append('role', newEmployee.role);
      formData.append('phone', newEmployee.phone);
      if (newEmployee.pin) formData.append('pin', newEmployee.pin);

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, formData);
        toast.success('Empleado actualizado correctamente');
      } else {
        await api.createEmployee(formData);
        toast.success('Empleado registrado correctamente');
      }

      setShowAdd(false);
      setEditingEmployee(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar empleado');
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setNewEmployee({ name: emp.name, role: emp.role, phone: emp.phone || '', pin: '' });
    setErrors({ name: '', phone: '', pin: '' });
    setShowAdd(true);
  };

  const handleToggleStatus = async () => {
    if (!employeeToToggle) return;
    const emp = employeeToToggle;

    try {
      const formData = new FormData();
      formData.append('active', (!emp.active).toString());
      await api.updateEmployee(emp.id, formData);
      toast.success(`Empleado ${emp.active ? 'desactivado' : 'activado'} correctamente`);
      setShowConfirmToggle(false);
      setEmployeeToToggle(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado del empleado');
    }
  };

  const confirmToggleStatus = (emp: Employee) => {
    setEmployeeToToggle(emp);
    setShowConfirmToggle(true);
  };

  if (loading) return <LoadingState message="Cargando Personal" />;

  // Filtrado
  const filteredEmployees = employees.filter((emp) =>
    activeTab === 'active' ? emp.active : !emp.active,
  );

  // Paginación
  const currentPage = activeTab === 'active' ? currentPageActive : currentPageInactive;
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const changePage = (page: number) => {
    if (activeTab === 'active') {
      setCurrentPageActive(page);
    } else {
      setCurrentPageInactive(page);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h3 className="text-3xl font-black text-foreground-main tracking-tighter">Empleados</h3>

          <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom">
            {(['active', 'inactive'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  activeTab === tab
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-foreground-muted hover:text-foreground-main',
                )}
              >
                {tab === 'active' ? 'Activos' : 'Desactivados'}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setEditingEmployee(null);
            resetForm();
            setShowAdd(true);
          }}
          className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20"
        >
          <Plus size={20} />
          Registrar Empleado
        </button>
      </div>

      {/* Grid */}
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Users}
          title={activeTab === 'active' ? 'No hay empleados activos' : 'No hay empleados inactivos'}
          message={
            activeTab === 'active'
              ? 'Aún no has registrado ningún empleado activo.'
              : 'No tienes empleados desactivados en este momento.'
          }
          actionLabel={activeTab === 'active' ? 'Registrar Primer Empleado' : undefined}
          onAction={
            activeTab === 'active'
              ? () => {
                  setEditingEmployee(null);
                  resetForm();
                  setShowAdd(true);
                }
              : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedEmployees.map((emp) => (
              <Card
                key={emp.id}
                className={cn(
                  'group hover:border-accent/30 transition-all relative overflow-hidden',
                  !emp.active && 'opacity-60 grayscale-[0.5]',
                )}
              >
                {!emp.active && (
                  <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-widest rounded-bl-xl">
                    Inactivo
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-lg text-foreground-main tracking-tight">
                      {emp.name}
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/5 px-2 py-1 rounded-md">
                      {emp.role}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(emp)}
                      className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                    >
                      <Edit2 size={18} />
                    </button>

                    <button
                      onClick={() => confirmToggleStatus(emp)}
                      className={cn(
                        'p-3 rounded-xl transition-all',
                        emp.active
                          ? 'bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent'
                          : 'bg-accent text-white',
                      )}
                    >
                      {emp.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border-custom">
                  <div className="flex items-center gap-3 text-sm text-foreground-muted">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                      <Phone size={14} />
                    </div>
                    <span className="font-bold tracking-tight">{emp.phone || 'Sin teléfono'}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-foreground-muted">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                      <LayoutDashboard size={14} />
                    </div>
                    <span className="font-bold tracking-tight capitalize">
                      {emp.active ? 'Estado: Activo' : 'Estado: Inactivo'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
              <button
                onClick={() => changePage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-border-custom bg-surface-hover text-sm font-black uppercase tracking-widest disabled:opacity-40"
              >
                Anterior
              </button>

              <div className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-black">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => changePage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-border-custom bg-surface-hover text-sm font-black uppercase tracking-widest disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal: Agregar / Editar */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Nombre */}
          <div>
            <Input
              label="Nombre Completo"
              value={newEmployee.name}
              onChange={(e) => {
                setNewEmployee({ ...newEmployee, name: e.target.value });
                setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Ej. Juan Pérez"
            />
            {errors.name && <ErrorMessage message={errors.name} />}
          </div>

          {/* Departamento */}
          <Select
            label="Departamento"
            value={newEmployee.role}
            onChange={(e) =>
              setNewEmployee({ ...newEmployee, role: e.target.value as Role })
            }
            options={[
              { value: 'Admin', label: 'Admin' },
              { value: 'Ventas', label: 'Ventas' },
              { value: 'Diseño', label: 'Diseño' },
              { value: 'Impresión', label: 'Impresión' },
              { value: 'Sublimación', label: 'Sublimación' },
              { value: 'Corte', label: 'Corte' },
              { value: 'Confección', label: 'Confección' },
              { value: 'Empaque', label: 'Empaque' },
            ]}
          />

          {/* Teléfono */}
          <div>
            <Input
              label="Teléfono"
              value={newEmployee.phone}
              onChange={(e) => {
                setNewEmployee({ ...newEmployee, phone: e.target.value });
                setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="Ej. 3001234567"
            />
            {errors.phone && <ErrorMessage message={errors.phone} />}
          </div>

          {/* PIN */}
          <div>
            <Input
              label={editingEmployee ? 'Nuevo PIN (Opcional)' : 'PIN de Acceso'}
              type="password"
              maxLength={4}
              value={newEmployee.pin}
              onChange={(e) => {
                setNewEmployee({ ...newEmployee, pin: e.target.value.replace(/\D/g, '') });
                setErrors((prev) => ({ ...prev, pin: '' }));
              }}
              placeholder="0000"
            />
            {errors.pin && <ErrorMessage message={errors.pin} />}
          </div>

          <button
            type="submit"
            className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all mt-4"
          >
            {editingEmployee ? 'Actualizar Registro' : 'Guardar Registro'}
          </button>
        </form>
      </Modal>

      {/* Modal: Confirmar cambio de estado */}
      <Modal
        isOpen={showConfirmToggle}
        onClose={() => {
          setShowConfirmToggle(false);
          setEmployeeToToggle(null);
        }}
        title={employeeToToggle?.active ? 'Desactivar Empleado' : 'Activar Empleado'}
      >
        <div className="space-y-6">
          <p className="text-foreground-muted text-sm">
            ¿Estás seguro de que deseas{' '}
            <span className="font-black text-foreground-main">
              {employeeToToggle?.active ? 'desactivar' : 'activar'}
            </span>{' '}
            a{' '}
            <span className="font-black text-foreground-main">{employeeToToggle?.name}</span>?
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmToggle(false);
                setEmployeeToToggle(null);
              }}
              className="flex-1 py-3 rounded-2xl border border-border-custom font-black uppercase tracking-widest text-xs text-foreground-muted hover:text-foreground-main transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleToggleStatus}
              className="flex-1 py-3 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}