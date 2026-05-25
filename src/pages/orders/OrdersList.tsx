import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Plus, Search, X, Clock, LayoutDashboard, DollarSign,
  Download, RefreshCw, Trash2, Copy, Star, ShoppingCart, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { api } from "../../services/api";
import Card from "../components/Card";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { exportTimesReport } from "../reports/ExportTimesReport";
import type { Order, User } from "../../lib/types";


// ─── Constants ───────────────────────────────────────────────────────────────

const ORDERS_PER_PAGE = 9;

const STATUS_OPTIONS = [
  "Todos",
  "Abono confirmado",
  "En diseño",
  "Versión enviada",
  "Corrección solicitada",
  "Diseño aprobado",
  "En cuadro",
  "En montaje",
  "En impresión",
  "En sublimación",
  "En corte",
  "En confección",
  "En empaque",
  "En despacho",
  "Entregado",
] as const;

type DateField = "created_at" | "delivery_date";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortOrders(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    if (a.is_priority && !b.is_priority) return -1;
    if (!a.is_priority && b.is_priority) return 1;
    if (a.is_reposition && !b.is_reposition) return -1;
    if (!a.is_reposition && b.is_reposition) return 1;
    if (a.status === "Entregado" && b.status !== "Entregado") return 1;
    if (a.status !== "Entregado" && b.status === "Entregado") return -1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}


// ─── Props ────────────────────────────────────────────────────────────────────

interface OrdersListProps {
  orders: Order[];
  user: User;
  onOrderClick: (id: number) => void;
  onCreateClick: () => void;
  canCreate: boolean;
  includeInactive: boolean;
  onToggleInactive: () => void;
  onUpdate: () => void;
  onShowRoadmap: (orderNum: string) => void;
}


// ─── Component ───────────────────────────────────────────────────────────────

export function OrdersList({
  orders,
  user,
  onOrderClick,
  onCreateClick,
  canCreate,
  includeInactive,
  onToggleInactive,
  onUpdate,
  onShowRoadmap,
}: OrdersListProps) {
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [orderToToggle,     setOrderToToggle]     = useState<Order | null>(null);
  const [isExportingTimes,  setIsExportingTimes]  = useState(false);

  const [teamFilter,   setTeamFilter]   = useState("Todos");
  const [dateField,    setDateField]    = useState<DateField>("delivery_date");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [searchTerm,   setSearchTerm]   = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [includeInactive, teamFilter, dateField, dateFrom, dateTo, statusFilter, searchTerm]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const availableTeams = [
    "Todos",
    ...Array.from(new Set(orders.filter(o => o.team_name).map(o => o.team_name as string))),
  ];

  const filteredOrders = sortOrders(
    orders.filter(o => {
      const matchesActive  = includeInactive ? !o.active : o.active;
      const matchesTeam    = teamFilter   === "Todos" || o.team_name === teamFilter;
      const matchesStatus  = statusFilter === "Todos" || o.status   === statusFilter;
      const matchesSearch  =
        !searchTerm.trim() ||
        o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const raw = o[dateField];
        if (!raw) {
          matchesDate = false;
        } else {
          const orderDate = new Date(raw).toISOString().split("T")[0];
          if (dateFrom && orderDate < dateFrom) matchesDate = false;
          if (dateTo   && orderDate > dateTo)   matchesDate = false;
        }
      }

      return matchesActive && matchesTeam && matchesStatus && matchesSearch && matchesDate;
    })
  );

  const totalPages     = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginated      = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const copyPublicLink = (e: React.MouseEvent, orderNumber: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/?order=${orderNumber}`);
    toast.success("Enlace copiado al portapapeles");
  };

  const confirmToggleActive = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setOrderToToggle(order);
    setShowConfirmToggle(true);
  };

  const handleToggleActive = async () => {
    if (!orderToToggle) return;
    try {
      await api.updateOrder(orderToToggle.id, {
        active: !orderToToggle.active,
        user_name: user.name,
      });
      toast.success(
        `Pedido ${orderToToggle.active ? "desactivado" : "activado"} correctamente`
      );
      setShowConfirmToggle(false);
      setOrderToToggle(null);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Error al cambiar el estado del pedido");
    }
  };

  const handleTogglePriority = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await api.updateOrder(order.id, {
        is_priority: !order.is_priority,
        user_name: user.name,
      });
      toast.success(order.is_priority ? "Prioridad eliminada" : "Orden marcada como prioridad");
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Error al cambiar prioridad");
    }
  };

  const handleExportTimes = async () => {
    setIsExportingTimes(true);
    try {
      await exportTimesReport(filteredOrders);
    } finally {
      setIsExportingTimes(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10"
    >
      <div className="flex flex-col gap-6">

        {/* CABECERA */}
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-black tracking-tighter text-foreground-main">
            Órdenes
          </h3>

          <div className="flex items-center gap-3">
            {user?.role?.trim() === "Admin" && (
              <button
                onClick={handleExportTimes}
                disabled={isExportingTimes || filteredOrders.length === 0}
                className="bg-surface-hover text-foreground-main border border-border-custom px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:border-accent/40 hover:text-accent transition-all disabled:opacity-40"
                title="Exportar reporte de tiempos"
              >
                {isExportingTimes
                  ? <RefreshCw size={16} className="animate-spin" />
                  : <Download size={16} />
                }
                Tiempos
              </button>
            )}

            {canCreate && (
              <button
                onClick={onCreateClick}
                className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20 whitespace-nowrap"
              >
                <Plus size={20} />
                Nueva Orden
              </button>
            )}
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-[28px] border border-border-custom bg-surface/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)]">

          {/* TOGGLE ACTIVOS / DESACTIVADOS */}
          <div className="flex items-center bg-surface-hover/80 p-1.5 rounded-2xl border border-border-custom shadow-sm">
            {([
              { label: "Activos",      active: !includeInactive },
              { label: "Desactivados", active:  includeInactive },
            ] as const).map(({ label, active }) => (
              <button
                key={label}
                onClick={() => active || onToggleInactive()}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                  active
                    ? "bg-accent text-white shadow-xl shadow-accent/20 scale-[1.02]"
                    : "text-foreground-muted hover:text-foreground-main hover:bg-surface"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* BUSCADOR */}
          <div className="relative group flex-1 min-w-[260px]">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-accent transition-colors duration-300"
              size={17}
            />
            <input
              type="text"
              placeholder="Buscar cliente u orden..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-surface border border-border-custom focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none text-foreground-main text-[10px] font-black uppercase tracking-[0.18em] placeholder:text-foreground-muted/40 transition-all duration-300 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-accent transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ESTADO */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-surface border border-border-custom rounded-2xl pl-5 pr-12 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground-main outline-none transition-all duration-300 cursor-pointer hover:border-accent/40 focus:border-accent focus:ring-4 focus:ring-accent/10 min-w-[220px] shadow-sm"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          </div>

          {/* EQUIPOS */}
          <div className="relative">
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="appearance-none bg-surface border border-border-custom rounded-2xl pl-5 pr-12 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground-main outline-none transition-all duration-300 cursor-pointer hover:border-accent/40 focus:border-accent focus:ring-4 focus:ring-accent/10 min-w-[200px] shadow-sm"
            >
              {availableTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          </div>

          {/* FECHAS */}
          <div className="flex items-center gap-4 bg-surface border border-border-custom rounded-2xl px-5 py-3 shadow-sm flex-wrap">
            <select
              value={dateField}
              onChange={e => setDateField(e.target.value as DateField)}
              className="bg-transparent text-[10px] font-black uppercase tracking-[0.18em] outline-none text-foreground-muted cursor-pointer appearance-none"
            >
              <option value="delivery_date">Entrega</option>
              <option value="created_at">Creación</option>
            </select>
            <div className="w-[1px] h-5 bg-border-custom" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none cursor-pointer [color-scheme:light] w-32"
            />
            <span className="text-[10px] font-black text-foreground-muted">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none cursor-pointer [color-scheme:light] w-32"
            />
          </div>

          {/* CONTADOR */}
          <div className="ml-auto px-5 py-3 rounded-2xl bg-accent/10 border border-accent/10 text-accent text-[10px] font-black uppercase tracking-[0.18em] whitespace-nowrap">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "orden" : "órdenes"}
          </div>
        </div>
      </div>

      {/* GRID */}
      {paginated.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={includeInactive ? "No hay órdenes inactivas" : "No hay órdenes activas"}
          message={
            includeInactive
              ? "No se han encontrado pedidos en el archivo."
              : "Aún no se han registrado pedidos."
          }
          actionLabel={!includeInactive && canCreate ? "Crear Nueva Orden" : undefined}
          onAction={onCreateClick}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginated.map(order => (
              <Card
                key={order.id}
                onClick={() => onOrderClick(order.id)}
                noPadding
                className={cn(
                  "p-8 transition-all cursor-pointer group relative overflow-hidden",
                  !order.active && "border-accent/20 opacity-40 grayscale-[0.8]"
                )}
              >
                {!order.active && (
                  <div className="absolute top-0 right-0 bg-accent text-white text-[9px] font-black px-4 py-2 uppercase tracking-[0.2em] rounded-bl-2xl">
                    Inactivo
                  </div>
                )}

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-foreground-muted mb-1">
                      {order.order_number}
                    </p>
                    <h4 className="font-black text-xl text-foreground-main tracking-tight group-hover:text-accent transition-colors">
                      {order.client_name}
                    </h4>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[
                    {
                      icon: <Clock size={16} className="text-accent" />,
                      label: "Entrega",
                      value: order.delivery_date
                        ? format(new Date(order.delivery_date), "dd/MM/yyyy")
                        : "N/A",
                    },
                    {
                      icon: <LayoutDashboard size={16} className="text-accent" />,
                      label: "Estado",
                      value: order.status,
                    },
                    ...(order.team_name
                      ? [{ icon: null, label: "Equipo", value: order.team_name }]
                      : []),
                    {
                      icon: <DollarSign size={16} className="text-accent" />,
                      label: "Costura",
                      value:
                        order.total_amount && order.total_amount > 0
                          ? `$${Number(order.total_amount).toLocaleString("es-CO")}`
                          : "N/A",
                    },
                  ].map(({ icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider"
                    >
                      {icon}
                      <span>
                        {label}:{" "}
                        <span className="font-black text-foreground-main">{value}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-border-custom flex items-center gap-3">
                  <button
                    onClick={e => confirmToggleActive(e, order)}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      order.active
                        ? "bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent"
                        : "bg-accent text-white"
                    )}
                  >
                    {order.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                  </button>

                  <button
                    onClick={e => copyPublicLink(e, order.order_number)}
                    className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                  >
                    <Copy size={18} />
                  </button>

                  {user.role === "Admin" && (
                    <button
                      onClick={e => handleTogglePriority(e, order)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        order.is_priority
                          ? "bg-yellow-500 text-white"
                          : "bg-surface-hover hover:bg-yellow-500/20 text-foreground-muted hover:text-yellow-500"
                      )}
                      title={order.is_priority ? "Quitar prioridad" : "Marcar como prioridad"}
                    >
                      <Star size={18} />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-border-custom bg-surface-hover text-sm font-black uppercase tracking-widest disabled:opacity-40"
              >
                Anterior
              </button>
              <div className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-black">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-border-custom bg-surface-hover text-sm font-black uppercase tracking-widest disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL CONFIRMACIÓN TOGGLE */}
      <Modal
        isOpen={showConfirmToggle}
        onClose={() => { setShowConfirmToggle(false); setOrderToToggle(null); }}
        title={orderToToggle?.active ? "Desactivar Pedido" : "Activar Pedido"}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <p className="text-sm font-bold text-foreground-muted">
            ¿Estás seguro de que deseas{" "}
            {orderToToggle?.active ? "desactivar" : "activar"} el pedido de{" "}
            <span className="font-black text-foreground-main">
              {orderToToggle?.client_name}
            </span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowConfirmToggle(false); setOrderToToggle(null); }}
              className="px-6 py-3 rounded-2xl border border-border-custom text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleToggleActive}
              className="px-6 py-3 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-105 transition-all"
            >
              {orderToToggle?.active ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}