import { useState, useEffect } from "react";
import {
  ChevronDown,
  Search,
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  Star,
  ExternalLink,
  SlidersHorizontal 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { differenceInBusinessDays } from "date-fns";
import { cn } from "@/src/lib/utils";
import { api } from "../../services/api";
import type { Order, OrderStatus, User } from "../../lib/types";


// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 100;

const DEPARTMENT_MAP: Record<string, OrderStatus[]> = {
  Diseño:       ["En diseño", "Versión enviada", "Corrección solicitada"],
  Impresión:    ["En impresión"],
  Sublimación:  ["En sublimación"],
  Corte:        ["En corte"],
  Confección:   ["En confección"],
  Empaque:      ["En empaque"],
};

const NEXT_STATUS_MAP: Record<OrderStatus, OrderStatus> = {
  "Cotización":              "Abono pendiente",
  "Abono pendiente":         "Abono confirmado",
  "Abono confirmado":        "En diseño",
  "En diseño":               "Versión enviada",
  "Versión enviada":         "Diseño aprobado",
  "Corrección solicitada":   "Versión enviada",
  "Diseño aprobado":         "En cuadro",
  "En cuadro":               "En montaje",
  "En montaje":              "En impresión interna",
  "Arte final cargado":      "En impresión",
  "En impresión":            "En sublimación",
  "En sublimación":          "En corte",
  "En corte":                "En confección",
  "En confección":           "En empaque",
  "Entregado":               "Entregado",
  "Devuelto":                "Devuelto",
  "En empaque":              "En despacho",
  "En despacho":             "Entregado",
};

const PREVIOUS_STATUS_MAP: Record<OrderStatus, OrderStatus> = {
  "Abono pendiente":         "Abono pendiente",
  "Abono confirmado":        "Abono pendiente",
  "En diseño":               "Abono confirmado",
  "Versión enviada":         "En diseño",
  "Corrección solicitada":   "En diseño",
  "Diseño aprobado":         "Versión enviada",
  "En cuadro":               "Diseño aprobado",
  "En montaje":              "En cuadro",
  "Arte final cargado":      "Diseño aprobado",
  "En sublimación":          "En impresión",
  "En corte":                "En sublimación",
  "En confección":           "En corte",
  "En empaque":              "En confección",
  "En despacho":             "En empaque",
  "Devuelto":                "Devuelto",
  "Entregado":               "En despacho",
};

const ALL_STATUSES: OrderStatus[] = [
  "Abono confirmado",
  "En diseño",
  "Versión enviada",
  "Corrección solicitada",
  "Diseño aprobado",
  "Arte final cargado",
  "En cuadro",
  "En montaje",
  "En impresión",
  "En sublimación",
  "En corte",
  "En confección",
  "En empaque",
  "En despacho",
];

const REPOSITION_STATUS_ORDER: OrderStatus[] = [
  "En sublimación",
  "En corte",
  "En confección",
  "En empaque",
  "En despacho",
  "Entregado",
];


// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignmentDraft {
  employee_id:    string;
  garment_count:  number;
  price_per_unit: number;
}


// ─── Props ────────────────────────────────────────────────────────────────────

interface KDSProps {
  orders:       Order[];
  user:         User;
  onOrderClick: (id: number) => void;
  onUpdate:     () => void;
  key?:         string;
}


// ─── Component ────────────────────────────────────────────────────────────────

export function KDS({ orders, user, onOrderClick, onUpdate }: KDSProps) {

  const role = user.role;

  // ── State ─────────────────────────────────────────────────────────────────

  const [updatingId,     setUpdatingId]     = useState<number | null>(null);
  const [showDelivered,  setShowDelivered]  = useState(false);
  const [statusFilter,   setStatusFilter]   = useState<OrderStatus | "Todos">("Todos");
  const [showAssign,     setShowAssign]     = useState<Order | null>(null);
  const [employees,      setEmployees]      = useState<any[]>([]);
  const [assignment,     setAssignment]     = useState<AssignmentDraft>({ employee_id: "", garment_count: 0, price_per_unit: 0 });
  const [teamFilter,     setTeamFilter]     = useState<string>("Todos");
  const [dateField,      setDateField]      = useState<"created_at" | "delivery_date">("delivery_date");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [searchTerm,     setSearchTerm]     = useState("");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (role === "Admin" || role === "Confección" || role === "Empaque") {
      api.getEmployees().then(setEmployees).catch(console.error);
    }
  }, [role]);

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [showDelivered, statusFilter, teamFilter, dateField, dateFrom, dateTo, searchTerm]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const availableTeams = [
    "Todos",
    ...Array.from(new Set(orders.filter(o => o.team_name).map(o => o.team_name as string))),
  ];

  const filteredOrders = orders
    .filter(o => {
      if (showDelivered) {
        if (o.status !== "Entregado") return false;
      } else {
        if (o.status === "Entregado") return false;
        if (role !== "Admin" && !DEPARTMENT_MAP[role]?.includes(o.status)) return false;
        if (role === "Admin" && statusFilter !== "Todos" && o.status !== statusFilter) return false;
      }

      if (teamFilter !== "Todos" && o.team_name !== teamFilter) return false;

      if (
        searchTerm.trim() &&
        !o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !o.order_number.toLowerCase().includes(searchTerm.toLowerCase())
      ) return false;

      if (dateFrom || dateTo) {
        const raw = o[dateField];
        if (!raw) return false;
        const orderDate = new Date(raw).toISOString().split("T")[0];
        if (dateFrom && orderDate < dateFrom) return false;
        if (dateTo   && orderDate > dateTo)   return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (a.is_priority   && !b.is_priority)   return -1;
      if (!a.is_priority  && b.is_priority)    return  1;
      if (a.is_reposition && !b.is_reposition) return -1;
      if (!a.is_reposition && b.is_reposition) return  1;
      if (a.status === "Entregado" && b.status !== "Entregado") return  1;
      if (a.status !== "Entregado" && b.status === "Entregado") return -1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const totalPages      = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Solo la primera orden activa se desbloquea
  const firstActiveOrderId = orders
    .filter(o => o.status !== "Entregado")
    .sort((a, b) => {
      if (a.is_priority   && !b.is_priority)   return -1;
      if (!a.is_priority  && b.is_priority)    return  1;
      if (a.is_reposition && !b.is_reposition) return -1;
      if (!a.is_reposition && b.is_reposition) return  1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })[0]?.id;

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAdvance = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const nextStatus = NEXT_STATUS_MAP[order.status];
    if (nextStatus === order.status) return;

    if (["En confección", "En empaque"].includes(nextStatus)) {
      setShowAssign(order);
      setAssignment({
        employee_id:    "",
        garment_count:  order.items?.length || 0,
        price_per_unit: nextStatus === "En confección" ? (order.items?.[0]?.sewing_price || 0) : 0,
      });
      return;
    }

    try {
      setUpdatingId(order.id);
      await api.updateStatus(order.id, nextStatus, user.name);

      if (order.is_reposition && order.reposition_from_status) {
        const fromIndex = REPOSITION_STATUS_ORDER.indexOf(order.reposition_from_status as OrderStatus);
        const newIndex  = REPOSITION_STATUS_ORDER.indexOf(nextStatus);
        if (fromIndex !== -1 && newIndex !== -1 && newIndex >= fromIndex) {
          await api.updateOrder(order.id, {
            is_reposition:          false,
            reposition_reason:      null,
            reposition_from_status: null,
            user_name:              user.name,
          });
        }
      }

      onUpdate();
    } catch (error) {
      console.error("Error advancing order:", error);
      toast.error("Error al avanzar la orden");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!showAssign) return;
    const nextStatus = NEXT_STATUS_MAP[showAssign.status];

    try {
      setUpdatingId(showAssign.id);
      await api.createAssignment({
        order_id:      showAssign.id,
        employee_id:   parseInt(assignment.employee_id),
        department:    nextStatus === "En confección" ? "Confección" : "Empaque",
        garment_count: assignment.garment_count,
        price_per_unit: assignment.price_per_unit,
      });
      await api.updateStatus(showAssign.id, nextStatus, user.name);
      setShowAssign(null);
      onUpdate();
    } catch (error) {
      console.error("Error in assignment:", error);
      toast.error("Error al asignar y avanzar la orden");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevert = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const prevStatus = PREVIOUS_STATUS_MAP[order.status];
    if (prevStatus === order.status) return;

    try {
      setUpdatingId(order.id);
      await api.updateStatus(order.id, prevStatus);
      onUpdate();
    } catch (error) {
      console.error("Error reverting order:", error);
      toast.error("Error al devolver la orden");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="flex flex-col gap-6">

        {/* Filtros */}
        <div className="rounded-[28px] border border-border-custom bg-surface/80 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">

  {/* HEADER */}
  <div className="flex flex-wrap items-center justify-between gap-4 p-4">

    {/* IZQUIERDA */}
    <div className="flex flex-wrap items-center gap-4">

      {/* Toggle En producción / Entregadas */}
      <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom w-fit">
        <button
          onClick={() => setShowDelivered(false)}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            !showDelivered
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "text-foreground-muted hover:text-foreground-main"
          )}
        >
          En Producción
        </button>

        <button
          onClick={() => setShowDelivered(true)}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            showDelivered
              ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
              : "text-foreground-muted hover:text-foreground-main"
          )}
        >
          <CheckCircle2 size={14} />
          Entregadas
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-6 bg-surface px-6 py-3 rounded-2xl border border-border-custom">
        {[
          { color: "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]", label: "A tiempo" },
          { color: "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]", label: "Próximo" },
          { color: "bg-accent shadow-[0_0_10px_var(--accent-glow)]", label: "Vencido" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Contador */}
      <div className="px-5 py-3 rounded-2xl bg-accent/10 border border-accent/10">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-accent whitespace-nowrap">
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "orden" : "órdenes"}
        </span>
      </div>
    </div>

    {/* BOTÓN FILTROS */}
    <button
      onClick={() => setFiltersOpen(!filtersOpen)}
      className={cn(
        "px-6 py-4 rounded-2xl border border-border-custom bg-surface-hover text-[10px] font-black uppercase tracking-[0.18em] flex items-center gap-3 transition-all",
        filtersOpen
          ? "text-accent border-accent/30"
          : "text-foreground-muted hover:text-foreground-main"
      )}
    >
      <SlidersHorizontal size={16} />

      {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}

      <ChevronDown
        size={16}
        className={cn(
          "transition-transform duration-300",
          filtersOpen && "rotate-180"
        )}
      />
    </button>
  </div>

  {/* FILTROS */}
  <AnimatePresence initial={false}>
    {filtersOpen && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden border-t border-border-custom"
      >
        <div className="p-4 flex flex-wrap items-center gap-4">

          {/* Estado */}
          {role === "Admin" && !showDelivered && (
            <div className="relative group">
              <select
                value={statusFilter}
                onChange={e =>
                  setStatusFilter(e.target.value as OrderStatus | "Todos")
                }
                className="appearance-none bg-surface border border-border-custom hover:border-accent/40 focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-2xl pl-5 pr-12 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground-main outline-none transition-all cursor-pointer min-w-[220px]"
              >
                <option value="Todos">Todos los estados</option>

                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none"
              />
            </div>
          )}

          {/* Buscador */}
          <div className="relative group flex-1 min-w-[260px]">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-accent transition-colors"
              size={16}
            />

            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-11 py-3 rounded-2xl bg-surface border border-border-custom hover:border-accent/40 focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none text-foreground-main text-[10px] font-black uppercase tracking-[0.18em] placeholder:text-foreground-muted/40 transition-all"
            />

            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-foreground-muted hover:text-white hover:bg-accent transition-all"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Equipo */}
          <div className="relative group">
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="appearance-none bg-surface border border-border-custom hover:border-accent/40 focus:border-accent focus:ring-4 focus:ring-accent/10 rounded-2xl pl-5 pr-12 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-foreground-main outline-none transition-all cursor-pointer min-w-[190px]"
            >
              {availableTeams.map(team => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none"
            />
          </div>

          {/* Fechas */}
          <div className="flex items-center gap-4 bg-surface border border-border-custom hover:border-accent/30 rounded-2xl px-5 py-3 transition-all flex-wrap">

            <select
              value={dateField}
              onChange={e =>
                setDateField(
                  e.target.value as "created_at" | "delivery_date"
                )
              }
              className="bg-transparent text-[10px] font-black uppercase tracking-[0.18em] outline-none text-foreground-muted appearance-none cursor-pointer"
            >
              <option value="delivery_date">Entrega</option>
              <option value="created_at">Creación</option>
            </select>

            <div className="w-px h-5 bg-border-custom" />

            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none [color-scheme:light] cursor-pointer"
            />

            <span className="text-[10px] font-black text-foreground-muted">
              —
            </span>

            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none [color-scheme:light] cursor-pointer"
            />

            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-foreground-muted hover:bg-accent hover:text-white transition-all"
              >
                <X size={13} />
              </button>
            )}
          </div>

        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-4">
        {paginatedOrders.length === 0 ? (
          <div className="bg-surface border border-border-custom rounded-2xl p-8 text-center">
            <p className="text-lg font-black text-foreground-main">
              {showDelivered ? "No hay órdenes entregadas" : "No hay órdenes en producción"}
            </p>
            <p className="text-[10px] text-foreground-muted mt-3 tracking-widest">
              {showDelivered ? "Las entregas están completas" : "Todo está al día"}
            </p>
          </div>
        ) : (
          paginatedOrders.map(order => {
            const isLocked = !showDelivered && order.id !== firstActiveOrderId;

            const daysLeft = order.delivery_date
              ? differenceInBusinessDays(new Date(order.delivery_date), new Date())
              : 0;

            const colorClass = daysLeft < 0
              ? "border-accent"
              : daysLeft < 3
                ? "border-yellow-500"
                : "border-green-500";

            const statusColorClass = daysLeft < 0
              ? "text-accent"
              : daysLeft < 3
                ? "text-yellow-500"
                : "text-green-500";

            return (
              <motion.div
                key={order.id}
                whileHover={!isLocked ? { x: 4 } : undefined}
                onClick={() => { if (!isLocked) onOrderClick(order.id); }}
                className={cn(
                  "flex items-center justify-between bg-surface px-6 py-4 rounded-2xl border-l-4 border border-border-custom transition-all",
                  !isLocked && "cursor-pointer hover:bg-background",
                  isLocked  && "opacity-50 cursor-not-allowed pointer-events-none",
                  order.is_reposition
                    ? "border-l-orange-500 bg-orange-500/5 hover:bg-orange-500/10"
                    : colorClass
                )}
              >
                {/* Izquierda */}
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                      {order.order_number}
                      {order.is_reposition && (
                        <span className="flex items-center gap-1 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse">
                          <AlertTriangle size={9} /> REPOSICIÓN
                        </span>
                      )}
                      {order.is_priority && (
                        <span className="flex items-center gap-1 bg-yellow-500 text-black text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                          <Star size={9} /> PRIORIDAD
                        </span>
                      )}
                    </p>
                    <h4 className="font-black text-sm text-foreground-main">{order.client_name}</h4>
                    {!!order.is_reposition && order.reposition_reason && (
                      <p className="text-[9px] text-orange-400 font-bold mt-0.5 italic truncate max-w-[200px]">
                        {order.reposition_reason}
                      </p>
                    )}
                    {isLocked && (
                      <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mt-1">
                        Orden bloqueada
                      </p>
                    )}
                  </div>

                  {typeof order.team_name === "string" && order.team_name.trim() !== "" && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1">
                      <Users size={12} /> {order.team_name}
                    </p>
                  )}
                </div>

                {/* Centro */}
                <div className="hidden md:flex items-center gap-10">
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-foreground-muted">Uniformes</p>
                    <p className="font-black text-sm">{order.items?.length || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-foreground-muted">Estado</p>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                      order.status === "Abono confirmado"
                        ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        : order.status === "Entregado"
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-accent/10 text-accent border-accent/20"
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Derecha */}
                <div className="flex items-center gap-6">
                  <div className={cn("text-[10px] font-black uppercase", statusColorClass)}>
                    {daysLeft < 0 ? `Vencido ${Math.abs(daysLeft)}d` : `${daysLeft} días`}
                  </div>
                  <ExternalLink size={14} className="text-foreground-muted" />
                </div>
              </motion.div>
            );
          })
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 flex-wrap">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-border-custom bg-surface text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              Anterior
            </button>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-[10px] font-black transition-all",
                    currentPage === page
                      ? "bg-accent text-white"
                      : "bg-surface border border-border-custom text-foreground-muted hover:text-foreground-main"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl border border-border-custom bg-surface text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}