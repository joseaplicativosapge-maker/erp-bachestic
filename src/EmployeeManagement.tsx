import { useState, useEffect } from "react";
import { Plus, Phone, LayoutDashboard, Edit2, Trash2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { api } from "./api";
import { Input } from "./components/Input";
import { Select }  from "./components/Select";
import Card from "./components/Card";
import Modal  from "./components/Modal";
import EmptyState  from "./components/EmptyState";
import LoadingState from "./components/LoadingState";
import { ErrorMessage } from "./components/ErrorMessage";
import type { Employee, EmployeeReport, Role } from "./types";


// ─── Constants ───────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 9;

const ROLE_OPTIONS = [
  { value: "Admin",        label: "Admin"        },
  { value: "Ventas",       label: "Ventas"       },
  { value: "Diseño",       label: "Diseño"       },
  { value: "Impresión",    label: "Impresión"    },
  { value: "Sublimación",  label: "Sublimación"  },
  { value: "Corte",        label: "Corte"        },
  { value: "Confección",   label: "Confección"   },
  { value: "Empaque",      label: "Empaque"      },
];

const EMPTY_FORM = {
  name:  "",
  role:  "Confección" as Role,
  phone: "",
  pin:   "",
};

const EMPTY_ERRORS = { name: "", phone: "", pin: "" };

// ─── Component ───────────────────────────────────────────────────────────────

export function EmployeeManagement() {
  const [employees,          setEmployees]          = useState<Employee[]>([]);
  const [report,             setReport]             = useState<EmployeeReport[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [showAdd,            setShowAdd]            = useState(false);
  const [activeTab,          setActiveTab]          = useState<"active" | "inactive">("active");
  const [showConfirmToggle,  setShowConfirmToggle]  = useState(false);
  const [employeeToToggle,   setEmployeeToToggle]   = useState<Employee | null>(null);
  const [editingEmployee,    setEditingEmployee]    = useState<Employee | null>(null);
  const [currentPageActive,  setCurrentPageActive]  = useState(1);
  const [currentPageInactive,setCurrentPageInactive]= useState(1);
  const [newEmployee,        setNewEmployee]        = useState(EMPTY_FORM);
  const [errors,             setErrors]             = useState(EMPTY_ERRORS);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (activeTab === "active") setCurrentPageActive(1);
    else setCurrentPageInactive(1);
  }, [activeTab]);

  // ── Data ──────────────────────────────────────────────────────────────────

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

  // ── Form ──────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setNewEmployee(EMPTY_FORM);
    setErrors(EMPTY_ERRORS);
  };

  const validateForm = () => {
    const next = { ...EMPTY_ERRORS };

    if (!newEmployee.name.trim())  next.name  = "El nombre es obligatorio";
    if (!newEmployee.phone.trim()) next.phone = "El teléfono es obligatorio";

    if (!editingEmployee || newEmployee.pin) {
      if (!newEmployee.pin.trim()) {
        next.pin = "El PIN es obligatorio";
      } else if (newEmployee.pin.length !== 4) {
        next.pin = "El PIN debe tener 4 dígitos";
      } else {
        const pinExists = employees.some(
          emp => emp.pin === newEmployee.pin && emp.id !== editingEmployee?.id
        );
        if (pinExists) next.pin = "Este PIN ya está siendo utilizado";
      }
    }

    setErrors(next);
    return !next.name && !next.phone && !next.pin;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const formData = new FormData();
      formData.append("name",  newEmployee.name);
      formData.append("role",  newEmployee.role);
      formData.append("phone", newEmployee.phone);
      if (newEmployee.pin) formData.append("pin", newEmployee.pin);

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, formData);
        toast.success("Empleado actualizado correctamente");
      } else {
        await api.createEmployee(formData);
        toast.success("Empleado registrado correctamente");
      }

      setShowAdd(false);
      setEditingEmployee(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar empleado");
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setNewEmployee({ name: emp.name, role: emp.role, phone: emp.phone || "", pin: "" });
    setErrors(EMPTY_ERRORS);
    setShowAdd(true);
  };

  const confirmToggleStatus = (emp: Employee) => {
    setEmployeeToToggle(emp);
    setShowConfirmToggle(true);
  };

  const handleToggleStatus = async () => {
    if (!employeeToToggle) return;
    const emp = employeeToToggle;

    try {
      const formData = new FormData();
      formData.append("active", (!emp.active).toString());
      await api.updateEmployee(emp.id, formData);
      toast.success(`Empleado ${emp.active ? "desactivado" : "activado"} correctamente`);
      setShowConfirmToggle(false);
      setEmployeeToToggle(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Error al cambiar el estado del empleado");
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Cargando Personal" />;

  const filteredEmployees = employees.filter(emp =>
    activeTab === "active" ? emp.active : !emp.active
  );

  const currentPage  = activeTab === "active" ? currentPageActive : currentPageInactive;
  const totalPages   = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginated    = filteredEmployees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const changePage = (page: number) => {
    if (activeTab === "active") setCurrentPageActive(page);
    else setCurrentPageInactive(page);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h3 className="text-3xl font-black text-foreground-main tracking-tighter">
            Empleados
          </h3>

          <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom">
            {(["active", "inactive"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-foreground-muted hover:text-foreground-main"
                )}
              >
                {tab === "active" ? "Activos" : "Desactivados"}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setEditingEmployee(null); resetForm(); setShowAdd(true); }}
          className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20"
        >
          <Plus size={20} />
          Registrar Empleado
        </button>
      </div>

      {/* GRID */}
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Users}
          title={activeTab === "active" ? "No hay empleados activos" : "No hay empleados inactivos"}
          message={
            activeTab === "active"
              ? "Aún no has registrado ningún empleado activo."
              : "No tienes empleados desactivados en este momento."
          }
          actionLabel={activeTab === "active" ? "Registrar Primer Empleado" : undefined}
          onAction={
            activeTab === "active"
              ? () => { setEditingEmployee(null); resetForm(); setShowAdd(true); }
              : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginated.map(emp => (
              <Card
                key={emp.id}
                className={cn(
                  "group hover:border-accent/30 transition-all relative overflow-hidden",
                  !emp.active && "opacity-60 grayscale-[0.5]"
                )}>
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
                        "p-3 rounded-xl transition-all",
                        emp.active
                          ? "bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent"
                          : "bg-accent text-white"
                      )}
                    >
                      {emp.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border-custom">
                  {[
                    { icon: <Phone size={14} />,         text: emp.phone || "Sin teléfono" },
                    { icon: <LayoutDashboard size={14} />, text: emp.active ? "Estado: Activo" : "Estado: Inactivo" },
                  ].map(({ icon, text }, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-foreground-muted">
                      <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                        {icon}
                      </div>
                      <span className="font-bold tracking-tight capitalize">{text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* PAGINACIÓN */}
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

      {/* MODAL */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          <div>
            <Input
              label="Nombre Completo"
              value={newEmployee.name}
              placeholder="Ej. Juan Pérez"
              onChange={e => {
                setNewEmployee({ ...newEmployee, name: e.target.value });
                setErrors(prev => ({ ...prev, name: "" }));
              }}
            />
            {errors.name && <ErrorMessage message={errors.name} />}
          </div>

          <Select
            label="Departamento"
            value={newEmployee.role}
            options={ROLE_OPTIONS}
            onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value as Role })}
          />

          <div>
            <Input
              label="Teléfono"
              value={newEmployee.phone}
              placeholder="Ej. 3001234567"
              onChange={e => {
                setNewEmployee({ ...newEmployee, phone: e.target.value });
                setErrors(prev => ({ ...prev, phone: "" }));
              }}
            />
            {errors.phone && <ErrorMessage message={errors.phone} />}
          </div>

          <div>
            <Input
              label={editingEmployee ? "Nuevo PIN (Opcional)" : "PIN de Acceso"}
              type="password"
              maxLength={4}
              value={newEmployee.pin}
              placeholder="0000"
              onChange={e => {
                setNewEmployee({ ...newEmployee, pin: e.target.value.replace(/\D/g, "") });
                setErrors(prev => ({ ...prev, pin: "" }));
              }}
            />
            {errors.pin && <ErrorMessage message={errors.pin} />}
          </div>

          <button
            type="submit"
            className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all mt-4"
          >
            {editingEmployee ? "Actualizar Registro" : "Guardar Registro"}
          </button>
        </form>
      </Modal>
    </div>
  );
}