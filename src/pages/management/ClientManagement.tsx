import { useState, useEffect } from "react";
import { Search, Users, Plus, Contact, Edit2, Trash2, RefreshCw, Phone, Mail, LayoutDashboard, Locate } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { api } from "../../services/api";
import Card from "../components/Card";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { ErrorMessage } from "../components/ErrorMessage";
import type { Client } from "../../lib/types";
import { TeamManagement } from "./TeamManagement";

// ─── ClientManagement ─────────────────────────────────────────────────────────

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [clientToToggle, setClientToToggle] = useState<Client | null>(null);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [selectedClientForTeams, setSelectedClientForTeams] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const CLIENTS_PER_PAGE = 9;

  const [formData, setFormData] = useState({
    name: '',
    doc: '',
    doc_type: 'CC',
    phone: '',
    address: '',
    city: '',
    email: '',
    active: true
  });

  // ✅ ERRORES
  const [errors, setErrors] = useState({
    name: '',
    doc: '',
    phone: '',
    email: '',
    city: '',
    address: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, teamFilter, includeInactive]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients(true);
      setClients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      doc: '',
      doc_type: 'CC',
      phone: '',
      address: '',
      city: '',
      email: '',
      active: true
    });

    setErrors({
      name: '',
      doc: '',
      phone: '',
      email: '',
      city: '',
      address: ''
    });
  };

  // ✅ VALIDACIONES
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      name: '',
      doc: '',
      phone: '',
      email: '',
      city: '',
      address: ''
    };

    // NOMBRE
    if (!formData.name.trim()) {
      newErrors.name = 'Este campo es obligatorio';
    }

    // DOCUMENTO
    if (!formData.doc.trim()) {
      newErrors.doc = 'Este campo es obligatorio';
    }

    // TELÉFONO
    if (!formData.phone.trim()) {
      newErrors.phone = 'Este campo es obligatorio';
    }

    // CIUDAD
    if (!formData.city.trim()) {
      newErrors.city = 'Este campo es obligatorio';
    }

    // DIRECCIÓN
    if (!formData.address.trim()) {
      newErrors.address = 'Este campo es obligatorio';
    }

    // EMAIL
    if (formData.email.trim()) {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(formData.email)) {
        newErrors.email =
          'Ingrese un correo válido';
      }
    }

    // DOCUMENTO DUPLICADO
    const docExists = clients.some(
      client =>
        client.doc === formData.doc &&
        client.id !== editingClient?.id
    );

    if (docExists) {
      newErrors.doc =
        'Este documento ya está registrado';
    }

    setErrors(newErrors);

    // DETENER SI HAY ERRORES
    if (
      newErrors.name ||
      newErrors.doc ||
      newErrors.phone ||
      newErrors.email ||
      newErrors.city ||
      newErrors.address
    ) {
      return;
    }

    try {
      if (editingClient) {
        const { active, ...updatePayload } =
          formData;

        await api.updateClient(
          editingClient.id,
          updatePayload
        );

        toast.success(
          'Cliente actualizado correctamente'
        );
      } else {
        await api.createClient(formData);

        toast.success(
          'Cliente registrado correctamente'
        );
      }

      setIsAdding(false);
      setEditingClient(null);

      resetForm();

      fetchClients();
    } catch (error) {
      console.error(error);

      toast.error(
        'Error al guardar cliente'
      );
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);

    setFormData({
      name: client.name,
      doc: client.doc,
      doc_type: client.doc_type || 'CC',
      phone: client.phone,
      address: client.address,
      city: client.city,
      email: client.email || '',
      active: client.active
    });

    setErrors({
      name: '',
      doc: '',
      phone: '',
      email: '',
      city: '',
      address: ''
    });

    setIsAdding(true);
  };

  const handleToggleActive = async () => {
    if (!clientToToggle) return;

    try {
      const newStatus =
        !clientToToggle.active;

      await api.updateClient(
        clientToToggle.id,
        {
          active: newStatus
        }
      );

      toast.success(
        `Cliente ${
          clientToToggle.active
            ? 'desactivado'
            : 'activado'
        } correctamente`
      );

      setShowConfirmToggle(false);
      setClientToToggle(null);

      if (!newStatus) {
        setIncludeInactive(true);
      }

      fetchClients();
    } catch (error) {
      console.error(error);

      toast.error(
        'Error al cambiar estado'
      );
    }
  };

  const confirmToggleActive = (
    client: Client
  ) => {
    setClientToToggle(client);
    setShowConfirmToggle(true);
  };

  if (loading) {
    return (
      <LoadingState message="Cargando Clientes" />
    );
  }

  // FILTRADO
  const filteredClients = clients.filter(
    client => {
      const clientName =
        client.name?.toLowerCase() || '';

      const clientDoc =
        client.doc?.toLowerCase() || '';

      const teams = Array.isArray(
        client.teams
      )
        ? client.teams
        : [];

      const matchesClient =
        clientName.includes(
          searchTerm.toLowerCase()
        ) ||
        clientDoc.includes(
          searchTerm.toLowerCase()
        );

      const normalizedTeamFilter =
        teamFilter.trim().toLowerCase();

      let matchesTeam = true;

      if (normalizedTeamFilter) {
        if (
          normalizedTeamFilter ===
            'sin equipo' ||
          normalizedTeamFilter ===
            'sin equipos'
        ) {
          matchesTeam = teams.length === 0;
        } else {
          matchesTeam = teams.some(
            (team: any) =>
              team?.name
                ?.toLowerCase()
                .includes(
                  normalizedTeamFilter
                )
          );
        }
      }

      const matchesStatus =
        includeInactive
          ? !client.active
          : client.active;

      return (
        matchesClient &&
        matchesTeam &&
        matchesStatus
      );
    }
  );

  const totalPages = Math.ceil(
    filteredClients.length /
      CLIENTS_PER_PAGE
  );

  const paginatedClients =
    filteredClients.slice(
      (currentPage - 1) *
        CLIENTS_PER_PAGE,
      currentPage * CLIENTS_PER_PAGE
    );

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-6">
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-[28px] border border-border-custom bg-surface/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          {/* LEFT */}
          <div className="space-y-5">

            {/* TABS */}
            <div className="flex bg-surface-hover border border-border-custom rounded-2xl p-1 w-fit">
              <button
                onClick={() => setIncludeInactive(false)}
                className={cn(
                  'px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  !includeInactive
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-foreground-muted hover:text-foreground-main'
                )}
              >
                Activos
              </button>

              <button
                onClick={() => setIncludeInactive(true)}
                className={cn(
                  'px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  includeInactive
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'text-foreground-muted hover:text-foreground-main'
                )}
              >
                Desactivados
              </button>
            </div>
          </div>

          {/* FILTROS */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_auto] gap-4 w-full 2xl:w-auto">

            {/* CLIENTE */}
            <div className="relative min-w-[300px]">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
              />

              <input
                type="text"
                placeholder="Buscar cliente o documento..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-14 rounded-2xl border border-border-custom bg-surface-hover pl-12 pr-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
              />
            </div>

            {/* EQUIPOS */}
            <div className="relative min-w-[300px]">
              <Users
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted"
              />

              <input
                type="text"
                placeholder='Buscar equipo o escribir "sin equipos"'
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="w-full h-14 rounded-2xl border border-border-custom bg-surface-hover pl-12 pr-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-accent/20 focus:border-accent/30"
              />
            </div>

            {/* NUEVO */}
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingClient(null);
                resetForm();
              }}
              className="h-14 px-8 rounded-2xl bg-accent text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.03] transition-all shadow-xl shadow-accent/20 whitespace-nowrap"
            >
              <Plus size={20} />
              Nuevo Cliente
            </button>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedClients.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Contact}
              title="No se encontraron clientes"
              message="No hay clientes que coincidan con la búsqueda."
            />
          </div>
        ) : (
          paginatedClients.map(client => (
            <Card
              key={client.id}
              className={cn(
                'relative overflow-hidden transition-all hover:border-accent/30 hover:-translate-y-1',
                !client.active && 'opacity-60 grayscale-[0.4]'
              )}
            >
              {!client.active && (
                <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-widest rounded-bl-xl">
                  Inactivo
                </div>
              )}

              {/* HEADER */}
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                  <Contact size={24} />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedClientForTeams(client);
                      setShowTeamManagement(true);
                    }}
                    className="p-3 rounded-xl bg-surface-hover hover:bg-accent/10 transition-all"
                  >
                    <Users size={18} />
                  </button>

                  <button
                    onClick={() => handleEdit(client)}
                    className="p-3 rounded-xl bg-surface-hover hover:bg-accent/10 transition-all"
                  >
                    <Edit2 size={18} />
                  </button>

                  <button
                    onClick={() => confirmToggleActive(client)}
                    className={cn(
                      'p-3 rounded-xl transition-all',
                      client.active
                        ? 'bg-surface-hover hover:bg-accent/10'
                        : 'bg-accent text-white'
                    )}
                  >
                    {client.active ? (
                      <Trash2 size={18} />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* INFO */}
              <h4 className="text-lg font-black tracking-tight text-foreground-main">
                {client.name}
              </h4>

              <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mt-1 mb-5">
                {client.doc_type || 'CC'} {client.doc}
              </p>

              {/* EQUIPOS */}
              <div className="flex flex-wrap gap-2 mb-5 min-h-[44px]">
                {Array.isArray(client.teams) &&
                client.teams.length > 0 ? (
                  client.teams.map((team: any) => (
                    <div
                      key={team.id}
                      className="px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <Users size={12} />
                      {team.name}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-1.5 rounded-xl bg-surface-hover border border-border-custom text-foreground-muted text-[10px] font-black uppercase tracking-widest">
                    Sin equipos
                  </div>
                )}
              </div>

              {/* DATOS */}
              <div className="space-y-3 pt-4 border-t border-border-custom">
                <div className="flex items-center gap-3 text-sm text-foreground-muted">
                  <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                    <Phone size={14} />
                  </div>

                  <span className="font-bold">
                    {client.phone || 'Sin teléfono'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-foreground-muted">
                  <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                    <Mail size={14} />
                  </div>

                  <span className="font-bold">
                    {client.email || 'Sin email'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-foreground-muted">
                  <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                    <LayoutDashboard size={14} />
                  </div>

                  <span className="font-bold">
                    {client.city || 'Sin ciudad'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-foreground-muted">
                  <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                    <Locate size={14} />
                  </div>

                  <span className="font-bold">
                    {client.address || 'Sin dirección'}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 flex-wrap pt-6">
          <button
            onClick={() =>
              setCurrentPage(prev =>
                Math.max(prev - 1, 1)
              )
            }
            disabled={currentPage === 1}
            className="px-5 py-3 rounded-2xl border border-border-custom bg-surface text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Anterior
          </button>

          {Array.from({
            length: totalPages
          }).map((_, index) => {
            const page = index + 1;

            return (
              <button
                key={page}
                onClick={() =>
                  setCurrentPage(page)
                }
                className={cn(
                  'w-12 h-12 rounded-2xl text-[10px] font-black transition-all',
                  currentPage === page
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-surface border border-border-custom text-foreground-muted'
                )}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() =>
              setCurrentPage(prev =>
                Math.min(
                  prev + 1,
                  totalPages
                )
              )
            }
            disabled={currentPage === totalPages}
            className="px-5 py-3 rounded-2xl border border-border-custom bg-surface text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* MODAL CONFIRMAR */}
      <Modal
        isOpen={showConfirmToggle}
        onClose={() => {
          setShowConfirmToggle(false);
          setClientToToggle(null);
        }}
        title={
          clientToToggle?.active
            ? 'Desactivar Cliente'
            : 'Activar Cliente'
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <p className="text-sm font-bold text-foreground-muted">
            ¿Estás seguro de que deseas{' '}
            {clientToToggle?.active
              ? 'desactivar'
              : 'activar'}{' '}
            a{' '}
            <span className="text-foreground-main">
              {clientToToggle?.name}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowConfirmToggle(false);
                setClientToToggle(null);
              }}
              className="px-6 py-3 rounded-2xl border border-border-custom text-[10px] font-black uppercase tracking-widest"
            >
              Cancelar
            </button>

            <button
              onClick={handleToggleActive}
              className="px-6 py-3 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20"
            >
              {clientToToggle?.active
                ? 'Desactivar'
                : 'Activar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL EQUIPOS */}
      <Modal
        isOpen={showTeamManagement}
        onClose={() => {
          setShowTeamManagement(false);
          fetchClients();
        }}
        title="Gestión de Equipos"
        maxWidth="max-w-2xl"
      >
        {selectedClientForTeams && (
          <TeamManagement
            client={selectedClientForTeams}
            onClose={() => {
              setShowTeamManagement(false);
              fetchClients();
            }}
          />
        )}
      </Modal>

      {/* MODAL CREAR / EDITAR CLIENTE */}
      <Modal
        isOpen={isAdding}
        onClose={() => {
          setIsAdding(false);
          setEditingClient(null);
          resetForm();
        }}
        title={
          editingClient
            ? 'Editar Cliente'
            : 'Nuevo Cliente'
        }
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* NOMBRE */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                Nombre
              </label>

              <input
                type="text"
                value={formData.name}
                onChange={e => {
                  setFormData({
                    ...formData,
                    name: e.target.value
                  });

                  setErrors(prev => ({
                    ...prev,
                    name: ''
                  }));
                }}
                className={cn(
                  "w-full h-12 rounded-2xl border bg-surface-hover px-4 text-sm font-bold outline-none transition-all focus:ring-2",
                  errors.name
                    ? "border-red-500 focus:ring-red-500/20"
                    : "border-border-custom focus:ring-accent/20"
                )}
              />

              {errors.name && (
                <ErrorMessage
                  message={errors.name}
                />
              )}
            </div>

            {/* TIPO DOC */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                Tipo Doc
              </label>

              <select
                value={formData.doc_type}
                onChange={e =>
                  setFormData({
                    ...formData,
                    doc_type:
                      e.target.value
                  })
                }
                className="w-full h-12 rounded-2xl border border-border-custom bg-surface-hover px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="CC">
                  Cédula de Ciudadanía
                </option>
                <option value="TI">
                  Tarjeta de Identidad
                </option>
                <option value="CE">
                  Cédula de Extranjería
                </option>
                <option value="NIT">
                  NIT
                </option>
                <option value="PAS">
                  Pasaporte
                </option>
              </select>
            </div>

            {/* DOCUMENTO */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                Documento
              </label>

              <input
                type="text"
                value={formData.doc}
                onChange={e => {
                  setFormData({
                    ...formData,
                    doc: e.target.value
                  });

                  setErrors(prev => ({
                    ...prev,
                    doc: ''
                  }));
                }}
                className={cn(
                  "w-full h-12 rounded-2xl border bg-surface-hover px-4 text-sm font-bold outline-none transition-all focus:ring-2",
                  errors.doc
                    ? "border-red-500 focus:ring-red-500/20"
                    : "border-border-custom focus:ring-accent/20"
                )}
              />

              {errors.doc && (
                <ErrorMessage
                  message={errors.doc}
                />
              )}
            </div>

            {/* TELÉFONO */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                Teléfono
              </label>

              <input
                type="text"
                value={formData.phone}
                onChange={e => {
                  setFormData({
                    ...formData,
                    phone: e.target.value
                  });

                  setErrors(prev => ({
                    ...prev,
                    phone: ''
                  }));
                }}
                className={cn(
                  "w-full h-12 rounded-2xl border bg-surface-hover px-4 text-sm font-bold outline-none transition-all focus:ring-2",
                  errors.phone
                    ? "border-red-500 focus:ring-red-500/20"
                    : "border-border-custom focus:ring-accent/20"
                )}
              />

              {errors.phone && (
                <ErrorMessage
                  message={errors.phone}
                />
              )}
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                Email
              </label>

              <input
                type="text"
                value={formData.email}
                onChange={e => {
                  setFormData({
                    ...formData,
                    email: e.target.value
                  });

                  setErrors(prev => ({
                    ...prev,
                    email: ''
                  }));
                }}
                className={cn(
                  "w-full h-12 rounded-2xl border bg-surface-hover px-4 text-sm font-bold outline-none transition-all focus:ring-2",
                  errors.email
                    ? "border-red-500 focus:ring-red-500/20"
                    : "border-border-custom focus:ring-accent/20"
                )}
              />

              {errors.email && (
                <ErrorMessage
                  message={errors.email}
                />
              )}
            </div>

            {/* CIUDAD */}
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                Ciudad
              </label>

              <input
                type="text"
                value={formData.city}
                onChange={e => {
                  setFormData({
                    ...formData,
                    city: e.target.value
                  });

                  setErrors(prev => ({
                    ...prev,
                    city: ''
                  }));
                }}
                className={cn(
                  "w-full h-12 rounded-2xl border bg-surface-hover px-4 text-sm font-bold outline-none transition-all focus:ring-2",
                  errors.city
                    ? "border-red-500 focus:ring-red-500/20"
                    : "border-border-custom focus:ring-accent/20"
                )}
              />

              {errors.city && (
                <ErrorMessage
                  message={errors.city}
                />
              )}
            </div>

            {/* DIRECCIÓN */}
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-foreground-muted">
                Dirección
              </label>

              <input
                type="text"
                value={formData.address}
                onChange={e => {
                  setFormData({
                    ...formData,
                    address:
                      e.target.value
                  });

                  setErrors(prev => ({
                    ...prev,
                    address: ''
                  }));
                }}
                className={cn(
                  "w-full h-12 rounded-2xl border bg-surface-hover px-4 text-sm font-bold outline-none transition-all focus:ring-2",
                  errors.address
                    ? "border-red-500 focus:ring-red-500/20"
                    : "border-border-custom focus:ring-accent/20"
                )}
              />

              {errors.address && (
                <ErrorMessage
                  message={errors.address}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingClient(null);
                resetForm();
              }}
              className="px-6 py-3 rounded-2xl border border-border-custom text-[10px] font-black uppercase tracking-widest"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20"
            >
              {editingClient
                ? 'Guardar Cambios'
                : 'Registrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}