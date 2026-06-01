import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import QRCode from "react-qr-code";
import * as XLSX from "xlsx";
import {
  ArrowLeft, AlertCircle, Star, Download, Shirt, FileText,
  Palette, CheckCircle2, Upload, Clock, History, Users, Plus,
  DollarSign, Printer, AlertTriangle, MessageSquare, Maximize2,
  X, ChevronDown, Package
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { api } from "@/src/services/api";
import { EditOrder } from "@/src/pages/orders/EditOrder";
import { ReceiptModal } from "@/src/pages/components/ReceiptModal";
import LoadingState from "@/src/pages/components/LoadingState";
import UniformDesigner from "@/src/pages/components/UniformDesigner";

import type {
  Order, OrderHistory, OrderItem, OrderStatus,
  Client, Payment, ProductionAssignment, Employee, User,
} from "@/src/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CAM_TASKS = ["filetes", "despuntes", "collarin", "dobladillo_remate"] as const;
const PANT_TASKS = ["filete_p", "despuntes_p", "caucho", "sentar_caucho", "collarin_p", "remate"] as const;

const LABEL_TO_KEY: Record<string, string> = {
  "Filetes": "filetes", "Despuntes": "despuntes", "Collarín": "collarin",
  "Dobladillo y Remate": "dobladillo_remate",
  "Filete": "filete_p", "Caucho": "caucho", "Sentar Caucho": "sentar_caucho",
  "Remate": "remate",
};

const TASK_LABELS: Record<string, string> = {
  filetes: "Filetes", despuntes: "Despuntes", collarin: "Collarín",
  dobladillo_remate: "Dobladillo y Remate",
  filete_p: "Filete", despuntes_p: "Despuntes", caucho: "Caucho",
  sentar_caucho: "Sentar Caucho", collarin_p: "Collarín", remate: "Remate",
};

const CAMISETA_TASK_DEFS = [
  { key: "filetes",           label: "Filetes",             priceKey: "filetes"           },
  { key: "despuntes",         label: "Despuntes",           priceKey: "despuntes"         },
  { key: "collarin",          label: "Collarín",            priceKey: "collarin"          },
  { key: "dobladillo_remate", label: "Dobladillo y Remate", priceKey: "dobladillo_remate" },
] as const;

const PANTALONETA_TASK_DEFS = [
  { key: "filete_p",      label: "Filete",        priceKey: "filete_p"      },
  { key: "despuntes_p",   label: "Despuntes",     priceKey: "despuntes_p"   },
  { key: "caucho",        label: "Caucho",        priceKey: "caucho"        },
  { key: "sentar_caucho", label: "Sentar Caucho", priceKey: "sentar_caucho" },
  { key: "collarin_p",    label: "Collarín",      priceKey: "collarin_p"    },
  { key: "remate",        label: "Remate",        priceKey: "remate"        },
] as const;

const PRE_PRODUCTION_STATUSES = [
  "Abono pendiente", "Abono confirmado", "En diseño",
  "Versión enviada", "Corrección solicitada", "Diseño aprobado",
];

const EMPTY_ASSIGNMENT_FORM = {
  employee_id:  "",
  garment_type: "Camiseta",
  tasks: {
    filetes:           { enabled: false, quantity: 0, price: 0 },
    despuntes:         { enabled: false, quantity: 0, price: 0 },
    collarin:          { enabled: false, quantity: 0, price: 0 },
    dobladillo_remate: { enabled: false, quantity: 0, price: 0 },
    filete_p:          { enabled: false, quantity: 0, price: 0 },
    despuntes_p:       { enabled: false, quantity: 0, price: 0 },
    caucho:            { enabled: false, quantity: 0, price: 0 },
    sentar_caucho:     { enabled: false, quantity: 0, price: 0 },
    collarin_p:        { enabled: false, quantity: 0, price: 0 },
    remate:            { enabled: false, quantity: 0, price: 0 },
  },
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addBusinessDays(startDate: Date, days: number): string {
  let date  = new Date(startDate);
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) count++;
  }
  return date.toISOString().split("T")[0];
}

function resolveTaskKey(labelRaw: string, garmentType: string): string | undefined {
  let key = LABEL_TO_KEY[labelRaw];
  if (labelRaw === "Despuntes" && garmentType === "Pantaloneta") key = "despuntes_p";
  if (labelRaw === "Collarín"  && garmentType === "Pantaloneta") key = "collarin_p";
  return key;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderDetailsProps {
  orderId:  number;
  onBack:   () => void;
  onUpdate: () => void;
  user:     User;
  canEdit:  boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderDetails({ orderId, onBack, onUpdate, user, canEdit }: OrderDetailsProps) {
  const role = user.role;

  // ── State ─────────────────────────────────────────────────────────────────

  const [order,              setOrder]              = useState<Order | null>(null);
  const [history,            setHistory]            = useState<OrderHistory[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [isUploading,        setIsUploading]        = useState(false);
  const [error,              setError]              = useState<string | null>(null);
  const [assignments,        setAssignments]        = useState<ProductionAssignment[]>([]);
  const [productionAssignments, setProductionAssignments] = useState<any[]>([]);
  const [employees,          setEmployees]          = useState<Employee[]>([]);
  const [payments,           setPayments]           = useState([]);
  const [productPrices,      setProductPrices]      = useState<Record<string, number>>({});
  const [products, setProducts] = useState<any[]>([]);

  // UI toggles
  const [showHistory,              setShowHistory]              = useState(false);
  const [isEditModalOpen,          setIsEditModalOpen]          = useState(false);
  const [showAssignmentModal,      setShowAssignmentModal]      = useState(false);
  const [showProductionAssignModal,setShowProductionAssignModal]= useState(false);
  const [showRejectModal,          setShowRejectModal]          = useState(false);
  const [showQualityRejectModal,   setShowQualityRejectModal]   = useState(false);
  const [showRepositionModal,      setShowRepositionModal]      = useState(false);
  const [showStatusConfirm,        setShowStatusConfirm]        = useState(false);
  const [showReceiptModal,         setShowReceiptModal]         = useState(false);
  const [showImageModal,           setShowImageModal]           = useState(false);

  // Form state
  const [selectedFilePreview,      setSelectedFilePreview]      = useState<string | null>(null);

  // ── NUEVO: estado para los dos archivos de diseño ──────────────────────────
  const [selectedUniformFile,      setSelectedUniformFile]      = useState<File | null>(null);
  const [selectedPorteroFile,      setSelectedPorteroFile]      = useState<File | null>(null);
  const [uniformPreview,           setUniformPreview]           = useState<string | null>(null);
  const [porteroPreview,           setPorteroPreview]           = useState<string | null>(null);
  // ──────────────────────────────────────────────────────────────────────────

  const [rejectComment,            setRejectComment]            = useState("");
  const [qualityRejectComment,     setQualityRejectComment]     = useState("");
  const [repositionReason,         setRepositionReason]         = useState("");
  const [pendingStatus,            setPendingStatus]            = useState<OrderStatus | null>(null);
  const [pendingStatusLabel,       setPendingStatusLabel]       = useState("");
  const [lastPayment,              setLastPayment]              = useState<Payment | null>(null);
  const [selectedImageUrl,         setSelectedImageUrl]         = useState("");
  const [newReferences,            setNewReferences]            = useState<File[]>([]);
  const [newReferencePreviews,     setNewReferencePreviews]     = useState<string[]>([]);

  // Loading flags
  const [isSubmittingReject,         setIsSubmittingReject]         = useState(false);
  const [isSubmittingQualityReject,  setIsSubmittingQualityReject]  = useState(false);
  const [isSubmittingReposition,     setIsSubmittingReposition]     = useState(false);

  const [assignmentForm,       setAssignmentForm]       = useState(EMPTY_ASSIGNMENT_FORM);
  const [productionAssignForm, setProductionAssignForm] = useState({ employee_id: "", notes: "" });

  // Client search
  const [clientSearch,  setClientSearch]  = useState("");
  const [searchResults, setSearchResults] = useState<Client[]>([]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { loadOrder(); }, [orderId]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (clientSearch.length > 2) {
        try { setSearchResults(await api.searchClients(clientSearch)); }
        catch { /* silent */ }
      } else { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    const productionStatuses = [
      "En cuadro", "En montaje", "En impresión", "En sublimación",
      "En corte", "En empaque", "En confección",
    ];
    if (productionStatuses.includes(order?.status || "") || assignments.length > 0) {
      api.getEmployees().then(setEmployees).catch(console.error);
    }
  }, [order?.status]);

  useEffect(() => {
    if (!showAssignmentModal) return;
    api.getProducts().then(prods => {
      const camiseta    = (prods.find(p => p.name.toLowerCase().includes("camiseta"))    || prods[0]) as any;
      const pantaloneta = (prods.find(p => p.name.toLowerCase().includes("pantaloneta")) || prods[0]) as any;
      setProductPrices({
        filetes:           camiseta.price_filetes           || 0,
        despuntes:         camiseta.price_despuntes         || 0,
        collarin:          camiseta.price_collarin          || 0,
        dobladillo_remate: camiseta.price_dobladillo_remate || 0,
        filete_p:          pantaloneta.price_filete_p       || 0,
        despuntes_p:       pantaloneta.price_despuntes_p    || 0,
        caucho:            pantaloneta.price_caucho         || 0,
        sentar_caucho:     pantaloneta.price_sentar_caucho  || 0,
        collarin_p:        pantaloneta.price_collarin_p     || 0,
        remate:            pantaloneta.price_remate         || 0,
      });
    }).catch(console.error);
  }, [showAssignmentModal]);

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadOrder = async () => {
    try {
      const [orderData, historyData, assignmentsData, productsData] = await Promise.all([
        api.getOrder(orderId),
        api.getOrderHistory(orderId),
        api.getOrderAssignments(orderId),
        api.getProducts(),
      ]);
      setOrder(orderData);
      setHistory(historyData);
      setAssignments(assignmentsData);
      setProductionAssignments(assignmentsData.filter((a: any) => a.department !== "Confección"));
      setProducts(productsData);
    } catch (err: any) {
      setError(err.message || "Error al cargar la orden");
    } finally {
      setLoading(false);
    }
  };

  const getItemCategory = (garmentType: string) => {
    return garmentType || "—";
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!pendingStatus) {
      setPendingStatus(newStatus);
      setPendingStatusLabel(newStatus);
      setShowStatusConfirm(true);
      return;
    }
    try {
      setError(null);
      if (newStatus === "En cuadro") {
        await api.updateOrder(orderId, { delivery_date: addBusinessDays(new Date(), 15), user_name: user.name });
      }
      await api.updateStatus(orderId, newStatus, user.name);

      if (order?.is_reposition && order?.reposition_from_status) {
        const statusOrder: OrderStatus[] = [
          "En sublimación", "En corte", "En confección",
          "En empaque", "En despacho", "Entregado",
        ];
        const fromIdx = statusOrder.indexOf(order.reposition_from_status as OrderStatus);
        const newIdx  = statusOrder.indexOf(newStatus);
        if (fromIdx !== -1 && newIdx !== -1 && newIdx >= fromIdx) {
          await api.updateOrder(orderId, { is_reposition: false, reposition_reason: null, reposition_from_status: null, user_name: user.name });
        }
      }

      await loadOrder();
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Error al actualizar el estado");
    } finally {
      setShowStatusConfirm(false);
      setPendingStatus(null);
      setPendingStatusLabel("");
    }
  };

  const handleApproveDesign = async () => {
    if (!order?.versions?.length) return;
    try {
      const latest = order.versions[order.versions.length - 1];
      await api.updateDesignVersionStatus(latest.id, order.id, "Diseño aprobado", "", user?.name || "Cliente");
      toast.success("Diseño aprobado correctamente");
      await loadOrder();
      onUpdate();
    } catch { toast.error("Error al aprobar el diseño"); }
  };

  const handleRejectDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.versions?.length) return;
    if (!rejectComment.trim()) { toast.error("Debes ingresar un comentario"); return; }
    setIsSubmittingReject(true);
    try {
      const latest = order.versions[order.versions.length - 1];
      await api.updateDesignVersionStatus(latest.id, order.id, "Corrección solicitada", rejectComment, user?.name || "Cliente");
      toast.success("Correcciones solicitadas correctamente");
      setShowRejectModal(false);
      setRejectComment("");
      await loadOrder();
      onUpdate();
    } catch { toast.error("Error al solicitar correcciones"); }
    finally { setIsSubmittingReject(false); }
  };

  // ── NUEVO: handler de upload con dos archivos ──────────────────────────────
  const handleDesignUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      setError(null);

      const form = e.currentTarget;
      const comments = (form.querySelector('textarea[name="comments"]') as HTMLTextAreaElement)?.value || "";
      const nextVersion = (order?.versions?.length || 0) + 1;

      const filesToUpload: { file: File; label: string }[] = [];
      if (selectedUniformFile) filesToUpload.push({ file: selectedUniformFile, label: "Uniforme" });
      if (selectedPorteroFile) filesToUpload.push({ file: selectedPorteroFile, label: "Portero" });

      if (!filesToUpload.length) {
        toast.error("Sube al menos una imagen (Uniforme o Portero)");
        setIsUploading(false);
        return;
      }

      for (let i = 0; i < filesToUpload.length; i++) {
        const { file, label } = filesToUpload[i];
        const formData = new FormData();
        formData.append("design", file);
        formData.append("version_number", (nextVersion + i).toString());
        // Solo el primero cambia el estado a "Versión enviada"; el resto usa un estado neutral
        formData.append("status", i === 0 ? "Versión enviada" : "Versión enviada");
        formData.append("comments", `[${label}]${comments ? " — " + comments : ""}`);
        await api.uploadDesign(orderId, formData, user.name);
      }

      // Garantizar que el estado quede en "Versión enviada"
      await api.updateStatus(orderId, "Versión enviada" as OrderStatus, user.name);

      // Limpiar estado
      setSelectedUniformFile(null);
      setSelectedPorteroFile(null);
      setUniformPreview(null);
      setPorteroPreview(null);

      await loadOrder();
      onUpdate();
    } catch (err: any) {
      setError(err.message || "Error al subir el diseño");
    } finally {
      setIsUploading(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const handleQualityReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualityRejectComment.trim()) { toast.error("Debes ingresar el motivo del rechazo"); return; }
    setIsSubmittingQualityReject(true);
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "En cuadro",
          user_name: user.name,
          details_override: `⚠ Rechazo de calidad en impresión — Motivo: ${qualityRejectComment}`,
        }),
      });
      toast.success("Rechazo registrado — orden devuelta a En cuadro");
      setShowQualityRejectModal(false);
      setQualityRejectComment("");
      await loadOrder();
      onUpdate();
    } catch { toast.error("Error al registrar el rechazo"); }
    finally { setIsSubmittingQualityReject(false); }
  };

  const handleMarkReposition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReposition(true);
    try {
      await api.updateOrder(orderId, { is_reposition: true, reposition_reason: repositionReason, reposition_from_status: order?.status, user_name: user.name });
      await api.updateStatus(orderId, "En cuadro" as OrderStatus, user.name);
      await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "En cuadro", user_name: user.name, details_override: `⚡ REPOSICIÓN — Motivo: ${repositionReason}` }),
      });
      toast.success("Orden marcada como reposición — devuelta a En cuadro con prioridad máxima");
      setShowRepositionModal(false);
      setRepositionReason("");
      await loadOrder();
      onUpdate();
    } catch { toast.error("Error al marcar la reposición"); }
    finally { setIsSubmittingReposition(false); }
  };

  const handleAddReferences = async () => {
    if (!newReferences.length) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      newReferences.forEach(f => fd.append("references", f));
      await api.uploadReferences(orderId, fd);
      setNewReferences([]);
      setNewReferencePreviews([]);
      await loadOrder();
      onUpdate();
    } catch { setError("Error al subir las referencias"); }
    finally { setIsUploading(false); }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.employee_id) { toast.error("Selecciona un empleado"); return; }
    const activeTasks = Object.entries(assignmentForm.tasks).filter(([_, t]) => t.enabled && t.quantity > 0);
    if (!activeTasks.length) { toast.error("Selecciona al menos una tarea con cantidad mayor a 0"); return; }
    try {
      for (const [key, task] of activeTasks) {
        await api.createAssignment({
          order_id:       orderId,
          employee_id:    parseInt(assignmentForm.employee_id),
          department:     "Confección",
          garment_count:  task.quantity,
          price_per_unit: productPrices[key] || 0,
          notes:          `[${assignmentForm.garment_type}] ${TASK_LABELS[key]}${assignmentForm.notes ? " — " + assignmentForm.notes : ""}`,
        });
      }
      toast.success("Asignación registrada correctamente");
      setShowAssignmentModal(false);
      setAssignmentForm(EMPTY_ASSIGNMENT_FORM);
      loadOrder();
    } catch { toast.error("Error al registrar la asignación"); }
  };

  const handleCreateProductionAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productionAssignForm.employee_id) { toast.error("Selecciona un empleado"); return; }
    try {
      const existing = productionAssignments.filter(a => a.department === order!.status);
      for (const prev of existing) await api.deleteAssignment(prev.id);
      await api.createAssignment({
        order_id:       orderId,
        employee_id:    parseInt(productionAssignForm.employee_id),
        department:     order!.status,
        garment_count:  order?.items?.length || 0,
        price_per_unit: 0,
        notes:          productionAssignForm.notes || "",
      });
      toast.success(existing.length > 0 ? "Responsable actualizado correctamente" : "Empleado asignado correctamente");
      setShowProductionAssignModal(false);
      setProductionAssignForm({ employee_id: "", notes: "" });
      await loadOrder();
      onUpdate();
    } catch { toast.error("Error al asignar empleado"); }
  };

  const exportToExcel = () => {
    if (!order) return;
    const orderInfo = [
      ["ORDEN",            order.order_number],
      ["CLIENTE",          order.client_name || "-"],
      ["DOCUMENTO",        `${order.client_doc_type || ""} ${order.client_doc || ""}`.trim() || "-"],
      ["ESTADO",           order.status || "-"],
      ["FECHA",            order.created_at || "-"],
      ["FECHA DE ENTREGA", order.delivery_date
        ? new Date(new Date(order.delivery_date).setDate(new Date(order.delivery_date).getDate() - 1)).toISOString().split("T")[0]
        : "-"],
      [],
      ["DETALLE DE UNIFORMES"],
    ];
    const headers = [["Nombre / Jugador", "Categoria", "Número", "Talla", "Manga", "Tipo", "Horma", "Observaciones"]];
    const itemsData = order.items?.map(item => ([
      item.player_name || "-", item.garment_type || "-", item.number || "-", item.size || "-",
      item.sleeve || "-", item.design_type || "-", item.fit || "-", item.observations || "-",
    ])) || [];

    const ws = XLSX.utils.aoa_to_sheet([...orderInfo, ...headers, ...itemsData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedido");
    XLSX.writeFile(wb, `Pedido_${order.order_number}.xlsx`);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const getTaskTotals = () => {
    const totals: Record<string, number> = {};
    assignments.forEach(a => {
      const notesRaw   = a.notes || "";
      const typeMatch  = notesRaw.match(/^\[(.+?)\]/);
      const garmentType = typeMatch ? typeMatch[1] : "Camiseta";
      const rest       = notesRaw.replace(/^\[.+?\]\s*/, "").split(" — ")[0].trim();
      const key        = resolveTaskKey(rest, garmentType);
      if (key) totals[key] = (totals[key] || 0) + (a.garment_count || 0);
    });
    return totals;
  };

  const getAlreadyRegistered = (key: string) => {
    let count = 0;
    assignments.forEach(a => {
      const notesRaw    = a.notes || "";
      const typeMatch   = notesRaw.match(/^\[(.+?)\]/);
      const garmentType = typeMatch ? typeMatch[1] : "Camiseta";
      const rest        = notesRaw.replace(/^\[.+?\]\s*/, "").split(" — ")[0].trim();
      const assignedKey = resolveTaskKey(rest, garmentType);
      if (assignedKey === key && garmentType === assignmentForm.garment_type) {
        count += a.garment_count || 0;
      }
    });
    return count;
  };

  // ── Early returns ─────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Cargando Orden" />;

  if (error && !order) return (
    <div className="text-center py-24 bg-surface rounded-[48px] border border-border-custom shadow-2xl max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
        <AlertCircle className="text-accent" size={40} />
      </div>
      <h4 className="font-black text-3xl tracking-tighter text-foreground-main uppercase mb-4">Error de Conexión</h4>
      <p className="text-foreground-muted mb-10 font-bold uppercase tracking-widest text-xs px-12 leading-relaxed">{error}</p>
      <button onClick={loadOrder} className="bg-foreground-main text-background px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all active:scale-95 shadow-xl">
        Reintentar Sincronización
      </button>
    </div>
  );

  if (!order) return null;

  const isPreProduction     = PRE_PRODUCTION_STATUSES.includes(order.status);
  const displayDeliveryDate = isPreProduction ? addBusinessDays(new Date(), 15) : order.delivery_date;

  const camisetas    = order.items?.filter(i => i.garment_type?.toLowerCase().includes("camiseta")).length    || 0;
  const pantalonetas = order.items?.filter(i => i.garment_type?.toLowerCase().includes("pantaloneta")).length || 0;
  const otros        = (order.items?.length || 0) - camisetas - pantalonetas;

  const taskTotals  = getTaskTotals();
  const totalCamisetas    = order.items?.filter(i => i.garment_type === "Camiseta").length    || 0;
  const totalPantalonetas = order.items?.filter(i => i.garment_type === "Pantaloneta").length || 0;

  const checkConfeccionCompleta = (): { ok: boolean; msg: string } => {
    if (totalCamisetas > 0) {
      for (const tk of CAM_TASKS) {
        if ((taskTotals[tk] || 0) < totalCamisetas)
          return { ok: false, msg: `Faltan tareas de camiseta: se necesitan ${totalCamisetas} en cada tarea` };
      }
    }
    if (totalPantalonetas > 0) {
      for (const tk of PANT_TASKS) {
        if ((taskTotals[tk] || 0) < totalPantalonetas)
          return { ok: false, msg: `Faltan tareas de pantaloneta: se necesitan ${totalPantalonetas} en cada tarea` };
      }
    }
    return { ok: true, msg: "" };
  };

  const confeccion = checkConfeccionCompleta();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <EditOrder
          order={order}
          items={order.items || []}
          onCancel={() => setIsEditModalOpen(false)}
          onSuccess={() => { setIsEditModalOpen(false); loadOrder(); onUpdate(); }}
          user={user}
        />
      )}

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button onClick={onBack} className="flex items-center gap-3 hover:text-foreground-main font-black uppercase tracking-widest text-[10px] transition-colors">
          <ArrowLeft size={20} className="text-accent" />
          Volver a Órdenes
        </button>

        <div className="flex items-center gap-4 flex-wrap">
          {error && (
            <div className="bg-accent/10 text-accent px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-accent/20">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!!order.is_priority && (
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
              <Star size={14} className="fill-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Orden Prioritaria</span>
            </div>
          )}

          {canEdit && role === "Admin" && (
            <button
              onClick={async () => {
                try {
                  await api.updateOrder(orderId, { is_priority: !order.is_priority, user_name: user.name });
                  toast.success(order.is_priority ? "Prioridad eliminada" : "Orden marcada como prioritaria");
                  await loadOrder();
                  onUpdate();
                } catch { toast.error("Error al cambiar prioridad"); }
              }}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2",
                order.is_priority
                  ? "bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400"
                  : "bg-surface-hover text-foreground-muted border-border-custom hover:border-yellow-500/40 hover:text-yellow-500"
              )}
            >
              <Star size={14} />
              {order.is_priority ? "Quitar Prioridad" : "Marcar Prioridad"}
            </button>
          )}

          {canEdit && (
            <button onClick={() => setIsEditModalOpen(true)} className="bg-surface-hover text-foreground-main px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover/80 transition-all border border-border-custom">
              Editar Orden
            </button>
          )}

          <span className={cn(
            "px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500",
            order.status === "Entregado"         ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]" :
            order.status === "Abono confirmado"  ? "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" :
            "bg-accent text-white border-accent shadow-xl shadow-accent/20"
          )}>
            {order.status}
          </span>

          {["En cuadro","En montaje","En impresión","En sublimación","En corte","En confección","En empaque","En despacho","Entregado"].includes(order.status) && (
            <button onClick={exportToExcel} className="bg-surface-hover text-foreground-main px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover/80 transition-all border border-border-custom flex items-center gap-2">
              <Download size={14} /> Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {showReceiptModal && lastPayment && (
        <ReceiptModal order={order} payment={lastPayment} onClose={() => setShowReceiptModal(false)} />
      )}

      {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-10">

          {/* ORDER HEADER CARD */}
          <div className="bg-surface p-12 rounded-[48px] border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32" />
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-accent text-[11px] font-black uppercase tracking-[0.5em] bg-accent/10 px-4 py-1.5 rounded-xl border border-accent/20 shadow-[0_0_20px_rgba(225,29,72,0.1)]">
                    {order.order_number}
                  </span>
                  <div className="h-[1px] w-8 bg-border-custom" />
                  <span className="text-[11px] font-black uppercase tracking-[0.5em]">{order.client_city}</span>
                </div>
                <h3 className="text-5xl font-black tracking-tighter text-foreground-main uppercase leading-none drop-shadow-2xl hover:text-accent transition-colors duration-700">
                  {order.client_name}
                </h3>
              </div>
            </div>

            {/* CLIENT INFO */}
            <div className="flex flex-wrap gap-10 py-12 border-y border-border-custom relative z-10">
              {[
                { label: "Documento",     value: `${order.client_doc_type} - ${order.client_doc}` },
                { label: "Teléfono",      value: order.client_phone },
                { label: "Entrega",       value: displayDeliveryDate ? format(new Date(displayDeliveryDate), "dd/MM/yyyy") : "N/A", extra: isPreProduction },
              ].map(({ label, value, extra }) => (
                <div key={label} className="min-w-[150px] flex-1 space-y-3">
                  <p className="font-black text-foreground-main">{label}</p>
                  <p className="font-black text-foreground-main tracking-tight">
                    {value}
                    {extra && <span className="text-foreground-muted text-[9px] font-bold uppercase tracking-widest ml-2">(estimado)</span>}
                  </p>
                </div>
              ))}
              <div className="min-w-[150px] flex-1 space-y-3">
                <p className="font-black text-foreground-main">Equipo</p>
                {order.team_name
                  ? <p className="font-black text-accent tracking-tight flex items-center gap-2"><Users size={16} />{order.team_name}</p>
                  : <p className="font-black text-foreground-muted/30 tracking-tight flex items-center gap-2"><Users size={16} />Sin equipo</p>
                }
              </div>
              <div className="min-w-[150px] flex-1 space-y-3">
                <p className="font-black text-foreground-main">Costo Costura</p>
                <p className="font-black text-accent tracking-tight flex items-center gap-2">
                  <DollarSign size={16} />
                  {order.total_amount && order.total_amount > 0 ? Number(order.total_amount).toLocaleString("es-CO") : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* UNIFORM DESIGNER */}
          <UniformDesigner
            order={order}
            user={user}
            readOnly={["En cuadro","En montaje","En impresión","En sublimación","En corte","En confección","En empaque","En despacho","Entregado"].includes(order.status)}
            onSaved={() => { loadOrder(); onUpdate(); }}
          />

          {/* UNIFORMS TABLE */}
          <div className="bg-surface rounded-[48px] border border-border-custom shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32" />
            <div className="p-12 border-b border-border-custom flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                  <Shirt className="text-accent" size={24} />
                </div>
                <div>
                  <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px]">Listado de Uniformes</h4>
                  <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-1">Especificaciones por jugador</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] bg-surface-hover px-5 py-2.5 rounded-2xl border border-border-custom shadow-inner">
                {order.items?.filter(i => (i as any).section !== 'adicional').length || 0} Unidades
              </span>
            </div>
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-foreground-main/[0.02]">
                    {["Nombre / Jugador", "Categoría", "N°", "Talla","Manga","Tipo","Horma","Observaciones"].map((h, i) => (
                      <th key={h} className={`py-10 ${i === 0 || i === 6 ? "px-10" : "px-6"} border-b border-border-custom ${i >= 1 && i <= 5 ? "text-center" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {order.items?.filter(i => (i as any).section !== 'adicional').map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gradient-to-r hover:from-accent/[0.03] hover:to-transparent transition-all duration-700 group border-b border-border-custom/50 last:border-0">
                      <td className="py-12 px-10">
                        <span className="font-black text-foreground-main tracking-tighter group-hover:text-accent transition-all duration-500 uppercase">{item.player_name || "-"}</span>
                      </td>
                      <td className="py-12 px-6">
                        <span className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">
                          {item.garment_type || "—"}
                        </span>
                      </td>
                      <td className="py-12 px-6 text-center"><span className="font-black text-foreground-main tracking-tighter">{item.number || "-"}</span></td>
                      <td className="py-12 px-6 text-center"><span className="font-black text-foreground-main tracking-tighter group-hover:text-accent transition-all duration-500">{item.size || "-"}</span></td>
                      <td className="py-12 px-6 text-center"><span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.sleeve || "-"}</span></td>
                      <td className="py-12 px-6 text-center"><span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.design_type || "-"}</span></td>
                      <td className="py-12 px-6 text-center"><span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.fit || "-"}</span></td>
                      <td className="py-10 px-10"><span className="text-foreground-main italic text-[11px] font-bold leading-relaxed">{item.observations || "-"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ADDITIONAL PRODUCTS TABLE */}
          {(() => {
            const adicionales = order.items?.filter(i => (i as any).section === 'adicional') ?? [];
            if (!adicionales.length) return null;
            return (
              <div className="bg-surface rounded-[48px] border border-border-custom shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32" />
                <div className="p-12 border-b border-border-custom flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                      <Package className="text-accent" size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px]">Productos Adicionales</h4>
                      <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-1">Chaquetas, medias, camisetas individuales</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] bg-surface-hover px-5 py-2.5 rounded-2xl border border-border-custom shadow-inner">
                    {adicionales.length} Unidades
                  </span>
                </div>
                <div className="overflow-x-auto relative z-10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-foreground-main/[0.02]">
                        {["Prenda", "Nombre / Jugador", "N°", "Talla", "Manga", "Tipo", "Horma", "Observaciones"].map((h, i) => (
                          <th key={h} className={`py-8 ${i === 0 || i === 7 ? "px-10" : "px-6"} border-b border-border-custom text-[9px] uppercase font-black tracking-[0.25em] text-foreground-muted ${i >= 2 && i <= 6 ? "text-center" : ""}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {adicionales.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-gradient-to-r hover:from-accent/[0.03] hover:to-transparent transition-all duration-700 group">
                          <td className="py-8 px-10">
                            <span className="font-black text-accent text-[10px] uppercase tracking-widest">{item.garment_type || "—"}</span>
                          </td>
                          <td className="py-8 px-6">
                            <span className="font-black text-foreground-main tracking-tighter group-hover:text-accent transition-all duration-500 uppercase">{item.player_name || "—"}</span>
                          </td>
                          <td className="py-8 px-6 text-center">
                            <span className="font-black text-foreground-main">{item.number || "—"}</span>
                          </td>
                          <td className="py-8 px-6 text-center">
                            <span className="font-black text-foreground-main group-hover:text-accent transition-all duration-500">{item.size || "—"}</span>
                          </td>
                          <td className="py-8 px-6 text-center">
                            <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.sleeve || "—"}</span>
                          </td>
                          <td className="py-8 px-6 text-center">
                            <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.design_type || "—"}</span>
                          </td>
                          <td className="py-8 px-6 text-center">
                            <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.fit || "—"}</span>
                          </td>
                          <td className="py-8 px-10">
                            <span className="text-foreground-main italic text-[11px] font-bold leading-relaxed">{item.observations || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-10">

          {/* RECEIPT CARD */}
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                <FileText className="text-accent" size={24} />
              </div>
              <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">Recibo de Orden</h4>
            </div>

            <div className="bg-background rounded-[28px] border border-border-custom p-6 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground-muted mb-4">Resumen de Uniformes</p>
              <div className="space-y-3">
                {[
                  { label: "Camisetas",    count: camisetas    },
                  { label: "Pantalonetas", count: pantalonetas },
                  { label: "Uniformes",    count: otros        },
                ].filter(r => r.count > 0).map(({ label, count }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-border-custom last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center"><Shirt className="text-accent" size={14} /></div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-foreground-main">{label}</span>
                    </div>
                    <span className="font-black text-xl text-foreground-main tracking-tighter">{count}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent">Total Uniformes</span>
                  <span className="font-black text-2xl text-foreground-main tracking-tighter">{order.items?.length || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 pt-2">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground-muted">Escanea para seguimiento</p>
              <div className="p-4 bg-white rounded-[24px] shadow-xl shadow-black/20 border border-border-custom">
                <QRCode value={`${window.location.origin}/seguimiento/${order.order_number}`} size={140} bgColor="#ffffff" fgColor="#0f0f0f" level="M" includeMargin={false} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-foreground-main uppercase tracking-widest">{order.order_number}</p>
                <p className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest">{order.client_name}</p>
              </div>
            </div>

            <button onClick={() => window.print()} className="w-full bg-surface-hover text-foreground-main py-4 rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-foreground-main hover:text-background transition-all border border-border-custom">
              <Download size={14} /> Imprimir Recibo
            </button>
          </div>

          {/* DESIGN UPLOAD */}
          {(role === "Admin" || role === "Diseño") && (
            <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                  <Palette className="text-accent" size={24} />
                </div>
                <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">Diseño del Cliente</h4>
              </div>
              <p className="text-foreground-muted text-[9px] font-black uppercase tracking-widest leading-relaxed">
                Carga el diseño para cada producto o uniforme.
              </p>
              <div className="grid grid-cols-1 gap-8">
                {(() => {
                  const cats = Array.from(new Set(order.items?.map(i => i.garment_type).filter(Boolean) || [])) as string[];
                  if (!cats.includes("Portero")) cats.push("Portero");
                  return cats;
                })().map(cat => {
                  const design = [...(order.references || [])].reverse().find(r => r.comments === cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">{cat}</p>
                      {design ? (
                        <div className="aspect-video rounded-3xl overflow-hidden border border-border-custom relative group shadow-lg cursor-pointer" onClick={() => { setSelectedImageUrl(design.file_path); setShowImageModal(true); }}>
                          <img src={design.file_path} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={design.file_path} download onClick={e => e.stopPropagation()} className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all" target="_blank" rel="noreferrer">
                              <Download size={20} />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={e => {
                          e.preventDefault();
                          const input = (e.currentTarget as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
                          if (input.files?.[0]) {
                            const fd = new FormData();
                            fd.append("references", input.files[0]);
                            fd.append("comments", cat);
                            api.uploadReferences(orderId, fd, user.name).then(() => loadOrder());
                          }
                        }}>
                          <label className="aspect-video border-2 border-dashed border-border-custom rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group relative overflow-hidden">
                            <div className="w-12 h-12 bg-foreground-main/[0.02] rounded-2xl flex items-center justify-center text-foreground-muted/20 group-hover:text-accent group-hover:scale-110 transition-all">
                              <Upload size={24} />
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] font-black text-foreground-muted/50 uppercase tracking-[0.2em] group-hover:text-foreground-main transition-colors">Subir Diseño Final</p>
                              <p className="text-[8px] font-bold text-foreground-muted/30 uppercase tracking-widest mt-1">{cat}</p>
                            </div>
                            <input type="file" className="hidden" onChange={e => e.currentTarget.form?.requestSubmit()} />
                          </label>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FLOW ACTIONS */}
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                <CheckCircle2 className="text-accent" size={24} />
              </div>
              <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">Acciones de Flujo</h4>
            </div>
            <div className="space-y-4">

              {/* Abono confirmado → En diseño */}
              {order.status === "Abono confirmado" && (role === "Admin" || role === "Ventas") && (() => {
                const orderCats = Array.from(new Set(order.items?.map(i => i.garment_type).filter(Boolean) || [])) as string[];
                const hasDesign = (order.references || []).some(r => orderCats.includes(r.comments || ""));
                return (
                  <div className="space-y-3">
                    <button
                      onClick={() => hasDesign && handleStatusUpdate("En diseño")}
                      disabled={!hasDesign}
                      className={cn("w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all",
                        hasDesign ? "bg-foreground-main text-background hover:bg-foreground-main/90" : "bg-surface-hover text-foreground-muted/40 cursor-not-allowed border border-dashed border-border-custom")}
                    >
                      <Palette size={18} /> Avanzar a: Diseño
                    </button>
                    {!hasDesign && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} /> Sube el diseño ejemplo antes de continuar
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* ── En diseño / Corrección → NUEVO formulario de dos imágenes ── */}
              {(order.status === "En diseño" || order.status === "Corrección solicitada") && (role === "Admin" || role === "Diseño") && (
                <form onSubmit={handleDesignUpload} className="space-y-5">

                  {/* Uniforme */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted flex items-center gap-2">
                      <Shirt size={12} className="text-accent" /> Diseño Uniforme
                    </p>
                    <div className="relative group border-2 border-dashed border-border-custom rounded-[28px] p-6 text-center hover:border-accent/40 transition-all cursor-pointer bg-background overflow-hidden">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setSelectedUniformFile(f); setUniformPreview(URL.createObjectURL(f)); }
                        }}
                      />
                      {uniformPreview ? (
                        <div className="relative z-10">
                          <img src={uniformPreview} className="max-h-36 mx-auto rounded-2xl shadow-xl border border-border-custom" />
                          <p className="text-[9px] font-black text-accent uppercase tracking-widest mt-3">Uniforme seleccionado ✓</p>
                        </div>
                      ) : (
                        <div className="relative z-10 py-4">
                          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="text-accent" size={20} />
                          </div>
                          <p className="text-[10px] font-black text-foreground-main uppercase tracking-[0.2em] mb-1">Subir Uniforme</p>
                          <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest">JPG, PNG o PDF</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Portero */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted flex items-center gap-2">
                      <Users size={12} className="text-accent" /> Diseño Portero
                      <span className="text-foreground-muted/40 font-bold normal-case tracking-normal text-[9px]">(opcional)</span>
                    </p>
                    <div className="relative group border-2 border-dashed border-border-custom rounded-[28px] p-6 text-center hover:border-accent/40 transition-all cursor-pointer bg-background overflow-hidden">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setSelectedPorteroFile(f); setPorteroPreview(URL.createObjectURL(f)); }
                        }}
                      />
                      {porteroPreview ? (
                        <div className="relative z-10">
                          <img src={porteroPreview} className="max-h-36 mx-auto rounded-2xl shadow-xl border border-border-custom" />
                          <p className="text-[9px] font-black text-accent uppercase tracking-widest mt-3">Portero seleccionado ✓</p>
                        </div>
                      ) : (
                        <div className="relative z-10 py-4">
                          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="text-accent" size={20} />
                          </div>
                          <p className="text-[10px] font-black text-foreground-main uppercase tracking-[0.2em] mb-1">Subir Portero</p>
                          <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest">JPG, PNG o PDF</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <textarea
                    name="comments"
                    placeholder="Añadir comentarios generales..."
                    className="w-full p-6 rounded-[24px] bg-background border border-border-custom text-foreground-main font-bold text-xs outline-none focus:border-accent/30 transition-all resize-none leading-relaxed"
                    rows={3}
                  />

                  <button
                    type="submit"
                    disabled={isUploading || (!selectedUniformFile && !selectedPorteroFile)}
                    className="w-full bg-accent text-white py-5 rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-accent/90 transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)] active:scale-[0.98]"
                  >
                    {isUploading ? <Clock className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Enviar Versión{selectedUniformFile && selectedPorteroFile ? "es" : ""} a Revisión
                  </button>
                </form>
              )}
              {/* ────────────────────────────────────────────────────────── */}

              {/* Versión enviada → aprobar/corregir */}
              {order.status === "Versión enviada" && (role === "Admin" || role === "Cliente") && (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleApproveDesign} className="bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(22,163,74,0.2)]">Aprobar</button>
                  <button onClick={() => setShowRejectModal(true)} className="bg-accent hover:bg-accent/90 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]">Corregir</button>
                </div>
              )}

              {/* Diseño aprobado / En cuadro / En montaje */}
              {["Diseño aprobado","En cuadro","En montaje"].includes(order.status) && (role === "Admin" || role === "Diseño") && (() => {
                const stepMap: Partial<Record<string, { label: string; next: OrderStatus; icon: any }>> = {
                  "Diseño aprobado": { label: "Avanzar a: Producción", next: "En cuadro",   icon: Printer       },
                  "En cuadro":       { label: "Avanzar a: Montaje",    next: "En montaje",  icon: CheckCircle2  },
                  "En montaje":      { label: "Avanzar a: Impresión",  next: "En impresión", icon: Printer      },
                };
                const step = stepMap[order.status];
                if (!step) return null;
                const Icon = step.icon;
                const requiresAssign = order.status === "En cuadro" || order.status === "En montaje";
                const hasAssign      = productionAssignments.some(a => a.department?.trim().toLowerCase() === order.status?.trim().toLowerCase());
                const canAdvance     = !requiresAssign || hasAssign;
                return (
                  <div className="space-y-3">
                    <button
                      onClick={() => canAdvance && handleStatusUpdate(step.next)}
                      disabled={!canAdvance}
                      className={cn("w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all",
                        canAdvance ? "bg-foreground-main text-background hover:bg-foreground-main/90" : "bg-surface-hover text-foreground-muted/40 cursor-not-allowed border border-dashed border-border-custom")}
                    >
                      <Icon size={18} /> {step.label}
                    </button>
                    {!canAdvance && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} /> Asigna un responsable antes de avanzar
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* En impresión → Entregado */}
              {(["En impresión","En sublimación","En corte","En confección","En empaque","En despacho"] as OrderStatus[]).includes(order.status) &&
                (role === "Admin" || role === "Ventas" || role === "Impresión" || role === "Confección" || role === "Empaque") && (() => {
                const nextMap: Partial<Record<OrderStatus, OrderStatus>> = {
                  "En impresión":   "En sublimación",
                  "En sublimación": "En corte",
                  "En corte":       "En confección",
                  "En confección":  "En empaque",
                  "En empaque":     "En despacho",
                  "En despacho":    "Entregado",
                };
                const next = nextMap[order.status];
                if (!next) return null;

                const estadosConAsignacion: OrderStatus[] = ["En impresión","En sublimación","En corte","En empaque"];
                const requiereAsign = estadosConAsignacion.includes(order.status);
                const tieneAsign    = productionAssignments.some(a => a.department?.trim().toLowerCase() === order.status?.trim().toLowerCase());
                const puedeAvanzar  = (order.status === "En confección" ? confeccion.ok : true) && (!requiereAsign || tieneAsign);

                return (
                  <div className="space-y-3">
                    <button
                      onClick={() => puedeAvanzar && handleStatusUpdate(next)}
                      disabled={!puedeAvanzar}
                      className={cn("w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all",
                        puedeAvanzar ? "bg-foreground-main text-background hover:bg-foreground-main/90" : "bg-surface-hover text-foreground-muted/40 cursor-not-allowed border border-dashed border-border-custom")}
                    >
                      <CheckCircle2 size={18} /> Avanzar a: {next}
                    </button>
                    {requiereAsign && !tieneAsign && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} /> Asigna un responsable antes de avanzar
                      </p>
                    )}
                    {order.status === "En confección" && !confeccion.ok && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} /> {confeccion.msg}
                      </p>
                    )}
                    {order.status === "En impresión" && (role === "Admin" || role === "Ventas" || role === "Impresión") && (
                      <button onClick={() => setShowQualityRejectModal(true)} className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-amber-500/20 transition-all">
                        <AlertTriangle size={18} /> Rechazar calidad → En cuadro
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Reposición */}
              {(["En sublimación","En corte","En confección","En empaque"] as OrderStatus[]).includes(order.status) && (role === "Admin" || role === "Ventas") && (
                <div className="pt-4 border-t border-border-custom">
                  {!order.is_reposition ? (
                    <button onClick={() => setShowRepositionModal(true)} className="w-full bg-orange-500/10 border border-orange-500/30 text-orange-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-orange-500/20 transition-all">
                      <AlertTriangle size={18} /> Marcar como Reposición
                    </button>
                  ) : (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center gap-3">
                      <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">⚡ Orden en Reposición</p>
                        {order.reposition_reason && <p className="text-xs text-foreground-muted mt-1">{order.reposition_reason}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {order.status === "Entregado" && (
                <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-500">✓ Orden completada y entregada</p>
                </div>
              )}
            </div>
          </div>

          {/* CONFECCIÓN PANEL */}
          {order.status === "En confección" && (role === "Admin" || role === "Ventas" || role === "Confección") && (
            <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                    <Shirt className="text-accent" size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px]">Confección</h4>
                    <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">
                      {assignments.reduce((s, a) => s + (a.garment_count || 0), 0)} uds registradas
                    </p>
                  </div>
                </div>
                {(role === "Admin" || role === "Ventas") && (
                  <button onClick={() => { api.getEmployees().then(setEmployees).catch(console.error); setShowAssignmentModal(true); }}
                    className="bg-accent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 hover:scale-105 transition-all">
                    <Plus size={14} /> Registrar
                  </button>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="text-center py-8 bg-surface-hover rounded-2xl border border-dashed border-border-custom">
                  <Shirt size={32} className="mx-auto text-foreground-muted/20 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted/40">Sin asignaciones registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.values(
                    assignments
                      .filter((a: any) => a.department === "Confección")
                      .reduce((acc, a) => {
                        const key = a.employee_id;
                        if (!acc[key]) acc[key] = { employee_name: a.employee_name || `Empleado #${a.employee_id}`, items: [] };
                        acc[key].items.push(a);
                        return acc;
                      }, {} as Record<number, any>)
                  ).map((emp: any, i) => (
                    <div key={i} className="bg-surface-hover p-5 rounded-2xl border border-border-custom space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent"><Users size={18} /></div>
                        <p className="font-black text-sm text-foreground-main">{emp.employee_name}</p>
                      </div>
                      {emp.items.map((a: any, j: number) => (
                        <div key={j} className="flex items-center justify-between border-t border-border-custom pt-3">
                          <div>
                            <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}</p>
                            {a.notes && <p className="text-[10px] text-foreground-muted italic mt-0.5">{a.notes}</p>}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">{a.department}</p>
                            <p className="text-[9px] text-foreground-muted font-bold">{a.garment_count || 0} uds</p>
                            {a.duration_minutes != null ? (
                              <p className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                a.duration_minutes > 480 ? "bg-red-500/10 text-red-500" : a.duration_minutes > 240 ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500")}>
                                {a.duration_minutes < 60 ? `${a.duration_minutes}m` : `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m`}
                              </p>
                            ) : (
                              <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted/40 px-2 py-1 rounded-lg bg-surface border border-border-custom">En progreso</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-5 py-4 bg-accent/10 rounded-2xl border border-accent/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">Total Confeccionado</p>
                    <div className="text-right">
                      <p className="font-black text-foreground-main">{assignments.reduce((s, a) => s + (a.garment_count || 0), 0)} / {order.items?.length || 0} uniformes</p>
                      <p className="text-[9px] text-foreground-muted font-bold">${assignments.reduce((s, a) => s + (a.garment_count || 0) * (a.price_per_unit || 0), 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DESIGN HISTORY */}
          <div className="bg-surface p-10 rounded-[40px] border border-border-custom shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] -mr-16 -mt-16" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                <Palette className="text-accent" size={24} />
              </div>
              <div>
                <h4 className="font-black text-foreground-main text-[11px] uppercase tracking-[0.3em]">Historial de Diseño</h4>
                <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-1">Versiones enviadas</p>
              </div>
            </div>

            {/* Quality reject banner */}
            {order.status === "En cuadro" && (() => {
              const lastReject = history.find(h => h.details?.includes("Rechazo de calidad") || h.details?.includes("⚠"));
              if (!lastReject) return null;
              const motivo = (lastReject.details || "").replace("⚠ Rechazo de calidad en impresión — Motivo: ", "").replace("⚠ ", "").trim();
              return (
                <div className="flex items-start gap-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-[28px] px-8 py-6">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0 mt-0.5"><AlertTriangle size={20} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2">⚠ Devuelto por rechazo de calidad en impresión</p>
                    <p className="text-sm font-bold text-foreground-main leading-relaxed mb-2">{motivo}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Registrado por: {lastReject.user_name} · {format(new Date(lastReject.created_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-4 relative z-10">
              {order.versions?.map(v => {
                // Detectar si la versión es de Uniforme o Portero
                const isUniforme = v.comments?.startsWith("[Uniforme]");
                const isPortero  = v.comments?.startsWith("[Portero]");
                const cleanComment = v.comments?.replace(/^\[(Uniforme|Portero)\]\s*—?\s*/, "").trim();

                return (
                  <div key={v.id} className="flex gap-6 p-6 rounded-[32px] border border-border-custom hover:bg-background transition-all group">
                    <div className="w-24 h-24 bg-background rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-border-custom group-hover:border-accent/30 transition-colors cursor-pointer relative"
                      onClick={() => { if (v.file_path) { setSelectedImageUrl(v.file_path); setShowImageModal(true); } }}>
                      {v.file_path ? (
                        <>
                          <img src={v.file_path} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white"><Maximize2 size={16} /></div>
                          </div>
                        </>
                      ) : <Palette size={28} className="text-foreground-muted" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-foreground-main text-base tracking-tight group-hover:text-accent transition-colors">Versión {v.version_number}</p>
                          {/* Badge de tipo */}
                          {isUniforme && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                              <Shirt size={9} /> Uniforme
                            </span>
                          )}
                          {isPortero && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                              <Users size={9} /> Portero
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest bg-background px-2 py-1 rounded-lg">{format(new Date(v.created_at), "dd/MM")}</span>
                      </div>
                      {cleanComment && (
                        <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed italic mb-3">{cleanComment}</p>
                      )}
                      {v.client_comments && (
                        <div className="mb-3 p-3 bg-accent/5 border border-accent/10 rounded-xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 flex items-center gap-1.5"><MessageSquare size={10} /> Comentarios del Cliente:</p>
                          <p className="text-[11px] text-foreground-main italic">{v.client_comments}</p>
                        </div>
                      )}
                      <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border w-fit",
                        v.status === "Aprobado" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-accent/10 text-accent border-accent/20")}>
                        {v.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {(!order.versions || !order.versions.length) && (
                <div className="text-center py-16 bg-background rounded-[32px] border border-dashed border-border-custom">
                  <Palette className="mx-auto text-foreground-muted opacity-20 mb-4" size={48} />
                  <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest italic">No hay versiones aún</p>
                </div>
              )}
            </div>
          </div>

          {/* RESPONSABLE PANEL */}
          {(["En cuadro","En montaje","En impresión","En sublimación","En corte","En empaque"] as OrderStatus[]).includes(order.status) &&
            (role === "Admin" || role === "Ventas" || role === "Diseño" || role === "Impresión" || role === "Sublimación" || role === "Corte" || role === "Empaque") && (
            <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5"><Users className="text-accent" size={24} /></div>
                  <div>
                    <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px]">Responsable</h4>
                    <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">{order.status}</p>
                  </div>
                </div>
                {(role === "Admin" || role === "Ventas") && (
                  <button onClick={() => { api.getEmployees().then(setEmployees).catch(console.error); setShowProductionAssignModal(true); }}
                    className="bg-accent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 hover:scale-105 transition-all">
                    <Plus size={14} />
                    {productionAssignments.some(a => a.department === order.status) ? "Cambiar" : "Asignar"}
                  </button>
                )}
              </div>
              {productionAssignments.filter(a => a.department === order.status).length === 0 ? (
                <div className="text-center py-8 bg-surface-hover rounded-2xl border border-dashed border-border-custom">
                  <Users size={32} className="mx-auto text-foreground-muted/20 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted/40">Sin empleado asignado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productionAssignments.filter(a => a.department === order.status).map((a: any, i) => (
                    <div key={i} className="bg-surface-hover p-5 rounded-2xl border border-border-custom flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent"><Users size={18} /></div>
                        <div>
                          <p className="font-black text-sm text-foreground-main">{a.employee_name || `Empleado #${a.employee_id}`}</p>
                          <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}</p>
                          {a.notes && <p className="text-[10px] text-foreground-muted italic mt-0.5">{a.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest">{a.department}</p>
                        <p className="text-[9px] text-foreground-muted font-bold mt-1">{order.items?.length || 0} uniformes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CHANGE LOG ───────────────────────────────────────────────────── */}
      <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5"><History className="text-accent" size={24} /></div>
            <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">Historial de Cambios</h4>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent/90 transition-colors">
            {showHistory ? "Ocultar" : "Ver Todo"}
          </button>
        </div>
        <div className={cn("space-y-6 transition-all overflow-hidden relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom", showHistory ? "max-h-[500px] overflow-y-auto pr-2" : "max-h-[200px]")}>
          {history.map(h => {
            const isQR = h.details?.includes("Rechazo de calidad");
            return (
              <div key={h.id} className="relative pl-8 group">
                <div className={cn("absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 transition-colors", isQR ? "bg-amber-500/20 border-amber-500" : "bg-surface border-border-custom group-hover:border-accent")} />
                <div className="flex justify-between items-start mb-1">
                  <p className={cn("text-[11px] font-black tracking-tight leading-tight", isQR ? "text-amber-500" : "text-foreground-main")}>{h.action}</p>
                  <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest">{format(new Date(h.created_at), "dd/MM HH:mm")}</span>
                </div>
                {isQR ? (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 mb-1"><AlertTriangle size={10} /> Motivo del rechazo:</p>
                    <p className="text-[10px] text-foreground-main leading-relaxed">{h.details?.replace("⚠ Rechazo de calidad en impresión — Motivo: ", "")}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-foreground-muted leading-relaxed mb-1">{h.details}</p>
                )}
                <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Por: {h.user_name}</p>
              </div>
            );
          })}
          {!history.length && <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest italic text-center py-8">Sin historial registrado</p>}
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

      {/* Status confirm */}
      {showStatusConfirm && pendingStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-md bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto"><CheckCircle2 size={40} /></div>
              <div>
                <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">¿Confirmar cambio de estado?</h4>
                <p className="text-foreground-muted text-sm mt-2">Pasará a: <span className="font-black text-foreground-main uppercase">{pendingStatusLabel}</span></p>
                <p className="text-foreground-muted text-xs mt-1">Esta acción quedará registrada en el historial.</p>
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => { setShowStatusConfirm(false); setPendingStatus(null); setPendingStatusLabel(""); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all">Cancelar</button>
                <button onClick={() => { const s = pendingStatus!; setShowStatusConfirm(false); setPendingStatus(null); setPendingStatusLabel(""); handleStatusUpdate(s); }} className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20">Confirmar</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject design */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-[40px] p-10 border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] -mr-16 -mt-16" />
            <h3 className="text-2xl font-black text-foreground-main tracking-tighter mb-2 relative z-10">Solicitar Correcciones</h3>
            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-8 relative z-10">Detalla los cambios necesarios para el diseñador</p>
            <form onSubmit={handleRejectDesign} className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-3">Comentarios y Correcciones</label>
                <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-6 text-foreground-main text-sm font-bold outline-none focus:border-accent/50 transition-all resize-none min-h-[120px]" placeholder="Ej. Cambiar el color del logo..." required />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowRejectModal(false); setRejectComment(""); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground-main hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmittingReject || !rejectComment.trim()} className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-accent/90 transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmittingReject ? <Clock className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Enviar Correcciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quality reject */}
      {showQualityRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-[40px] p-10 border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500"><AlertTriangle size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-foreground-main tracking-tighter uppercase">Rechazar Calidad</h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">La orden volverá a En cuadro</p>
              </div>
            </div>
            <form onSubmit={handleQualityReject} className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-3">Motivo del Rechazo <span className="text-amber-500">*</span></label>
                <textarea value={qualityRejectComment} onChange={e => setQualityRejectComment(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-6 text-foreground-main text-sm font-bold outline-none focus:border-amber-500/50 transition-all resize-none min-h-[120px]" placeholder="Ej. Colores descuadrados..." required />
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2"><AlertTriangle size={12} /> Este motivo quedará registrado en el historial.</p>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => { setShowQualityRejectModal(false); setQualityRejectComment(""); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground-main hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmittingQualityReject || !qualityRejectComment.trim()} className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-500/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20">
                  {isSubmittingQualityReject ? <Clock className="animate-spin" size={16} /> : <AlertTriangle size={16} />} Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reposition */}
      {showRepositionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-[40px] p-10 border border-orange-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500"><AlertTriangle size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-foreground-main tracking-tighter uppercase">Marcar Reposición</h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">Esta orden tendrá prioridad inmediata en producción</p>
              </div>
            </div>
            <form onSubmit={handleMarkReposition} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-3">Motivo de la Reposición <span className="text-orange-500">*</span></label>
                <textarea value={repositionReason} onChange={e => setRepositionReason(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-6 text-foreground-main text-sm font-bold outline-none focus:border-orange-500/50 transition-all resize-none min-h-[100px]" placeholder="Ej. Defecto en sublimación..." required />
              </div>
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2"><AlertTriangle size={12} /> Esta orden aparecerá primero en el KDS de producción.</p>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowRepositionModal(false)} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmittingReposition || !repositionReason.trim()} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-500/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20">
                  {isSubmittingReposition ? <Clock className="animate-spin" size={16} /> : <AlertTriangle size={16} />} Confirmar Reposición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment modal (confección) */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-2xl bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent"><Shirt size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-foreground-main uppercase tracking-tight">Registrar Confección</h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">Orden {order.order_number} · {order.items?.length || 0} uniformes totales</p>
              </div>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Empleado</label>
                <div className="relative">
                  <select value={assignmentForm.employee_id} onChange={e => setAssignmentForm(p => ({ ...p, employee_id: e.target.value }))} required
                    className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main appearance-none cursor-pointer pr-12">
                    <option value="" disabled>Seleccionar empleado...</option>
                    {employees.filter(e => e.active && (e.role === "Confección" || e.role === "Admin")).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted" size={18} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Tipo de Prenda</label>
                <div className="flex gap-3">
                  {["Camiseta", "Pantaloneta"].map(tipo => (
                    <button key={tipo} type="button" onClick={() => setAssignmentForm(p => ({ ...p, garment_type: tipo }))}
                      className={cn("flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border",
                        assignmentForm.garment_type === tipo ? "bg-accent text-white border-accent shadow-lg shadow-accent/20" : "bg-surface-hover text-foreground-muted border-border-custom hover:text-foreground-main")}>
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Tareas — {assignmentForm.garment_type}</label>
                <div className="bg-surface-hover rounded-[24px] border border-border-custom overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_120px_100px] gap-4 px-5 py-3 border-b border-border-custom bg-surface">
                    <div className="w-5" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Tarea</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted text-center">Cantidad</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted text-right">Subtotal</p>
                  </div>
                  {(assignmentForm.garment_type === "Camiseta" ? CAMISETA_TASK_DEFS : PANTALONETA_TASK_DEFS).map(({ key, label, priceKey }) => {
                    const task      = assignmentForm.tasks[key];
                    const unitPrice = productPrices[priceKey] || 0;
                    const subtotal  = (task.quantity || 0) * unitPrice;
                    const maxAllowed = Math.max(0, (order.items?.length || 0) - getAlreadyRegistered(key));
                    return (
                      <div key={key} className={cn("grid grid-cols-[auto_1fr_120px_100px] gap-4 items-center px-5 py-3 border-b border-border-custom last:border-0 transition-all", task.enabled ? "bg-accent/5" : "opacity-50")}>
                        <input type="checkbox" checked={task.enabled}
                          onChange={e => setAssignmentForm(p => ({ ...p, tasks: { ...p.tasks, [key]: { ...p.tasks[key], enabled: e.target.checked } } }))}
                          className="w-4 h-4 accent-accent cursor-pointer" />
                        <div>
                          <p className={cn("text-[11px] font-black uppercase tracking-wider", task.enabled ? "text-foreground-main" : "text-foreground-muted")}>{label}</p>
                          <p className="text-[9px] text-foreground-muted font-bold">${unitPrice.toLocaleString()} c/u</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <input type="number" min={0} max={maxAllowed} value={task.quantity || ""} disabled={!task.enabled} placeholder="0"
                            onChange={e => { const val = Math.min(Number(e.target.value), maxAllowed); setAssignmentForm(p => ({ ...p, tasks: { ...p.tasks, [key]: { ...p.tasks[key], quantity: val, price: unitPrice } } })); }}
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-border-custom outline-none text-foreground-main font-black text-center text-sm disabled:opacity-30 focus:border-accent/50" />
                          {task.enabled && <p className="text-[8px] font-black uppercase tracking-widest text-foreground-muted">máx {maxAllowed}</p>}
                        </div>
                        <p className={cn("text-right font-black text-sm", task.enabled && task.quantity > 0 ? "text-accent" : "text-foreground-muted/30")}>${subtotal.toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center px-5 py-4 bg-accent/10 rounded-2xl border border-accent/20">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent">Total a Pagar</p>
                  <p className="text-[9px] text-foreground-muted font-bold mt-0.5">Tarifas tomadas del catálogo</p>
                </div>
                <p className="font-black text-2xl text-foreground-main tracking-tighter">
                  ${Object.entries(assignmentForm.tasks).filter(([_, t]) => t.enabled && t.quantity > 0)
                    .reduce((s, [k, t]) => s + t.quantity * (productPrices[k] || 0), 0).toLocaleString()}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Observaciones (opcional)</label>
                <input type="text" value={assignmentForm.notes} onChange={e => setAssignmentForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ej. Prendas con refuerzo..."
                  className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main" />
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setShowAssignmentModal(false)} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20">
                  <CheckCircle2 size={16} className="inline mr-2" /> Registrar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Production assign modal */}
      {showProductionAssignModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-md bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent"><Users size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-foreground-main uppercase tracking-tight">Asignar Empleado</h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">{order.status} · {order.order_number}</p>
              </div>
            </div>
            <form onSubmit={handleCreateProductionAssignment} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Empleado</label>
                <div className="relative">
                  <select value={productionAssignForm.employee_id} onChange={e => setProductionAssignForm(p => ({ ...p, employee_id: e.target.value }))} required
                    className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main appearance-none cursor-pointer pr-12">
                    <option value="" disabled>Seleccionar empleado...</option>
                    {employees.filter(e => e.active).map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted" size={18} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Observaciones (opcional)</label>
                <input type="text" value={productionAssignForm.notes} onChange={e => setProductionAssignForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ej. Turno mañana..."
                  className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main" />
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => { setShowProductionAssignModal(false); setProductionAssignForm({ employee_id: "", notes: "" }); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20">
                  <CheckCircle2 size={16} className="inline mr-2" /> Asignar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Image lightbox */}
      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 sm:p-8" onClick={() => setShowImageModal(false)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-3 rounded-full backdrop-blur-md" onClick={() => setShowImageModal(false)}>
            <X size={24} />
          </button>
          <img src={selectedImageUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} referrerPolicy="no-referrer" />
        </div>
      )}
    </motion.div>
  );
}