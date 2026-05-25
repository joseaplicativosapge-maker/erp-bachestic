import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Palette,
  Upload,
  Download,
  Maximize2,
  Shirt,
  Users,
  Save,
  RefreshCw,
  History,
  MessageSquare,
  Search,
  X,
  CheckCircle,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './api';
import { Order, OrderItem, OrderStatus, Role, User, Payment } from './types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
import UniformDesigner from './UniformDesigner';

// ---------------------------------------------------------------------------
// Utilidades locales (si ya tienes cn en @/lib/utils cámbialo aquí)
// ---------------------------------------------------------------------------
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Tipos auxiliares mínimos — ajusta si ya los tienes centralizados
// ---------------------------------------------------------------------------
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Card({ children, className, ...props }: CardProps) {
  return (
    <div className={cn('rounded-2xl bg-surface border border-border-custom', className)} {...props}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReceiptModal — stub; reemplaza con tu componente real si existe
// ---------------------------------------------------------------------------
function ReceiptModal({
  order,
  payment,
  onClose,
}: {
  order: Order;
  payment: Payment;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface p-8 rounded-[40px] border border-border-custom max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <p className="font-black text-foreground-main">Recibo de pago</p>
        <button onClick={onClose} className="mt-4 text-accent text-sm font-bold">Cerrar</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UniformDesignerSection — wrapper del UniformDesigner existente
// ---------------------------------------------------------------------------
function UniformDesignerSection({
  order,
  user,
  readOnly,
  onSaved,
}: {
  order: Order;
  user?: User;
  readOnly: boolean;
  onSaved: () => void;
}) {
  return (
    <UniformDesigner
      order={order}
      user={user}
      readOnly={readOnly}
      onSaved={onSaved}
    />
  );
}

// ---------------------------------------------------------------------------
// ClientRoadmap
// ---------------------------------------------------------------------------
export default function ClientRoadmap({
  orders,
  user,
  initialSearch = '',
  role,
  isPublic = false,
}: {
  orders: Order[];
  user?: User;
  initialSearch?: string;
  role: Role;
  isPublic?: boolean;
  key?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPayment] = useState<Payment | null>(null);
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleConfirmOrder = async () => {
    if (!foundOrder) return;
    try {
      await api.updateStatus(foundOrder.id, 'Abono pendiente', user?.name || 'Cliente');
      setShowConfirmModal(false);
      handleSearch();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchInitialOrder = async () => {
      if (initialSearch) {
        try {
          const allOrders = await api.getOrders(false);
          const order = allOrders.find(
            o => o.order_number.toLowerCase() === initialSearch.toLowerCase()
          );
          if (order) {
            const fullOrder = await api.getOrder(order.id);
            setFoundOrder(fullOrder);
            setEditingItems(fullOrder.items || []);
          } else {
            setFoundOrder(null);
          }
        } catch (error) {
          console.error(error);
          setFoundOrder(null);
        }
      }
    };
    fetchInitialOrder();
  }, [initialSearch]);

  const handleSearch = async () => {
    if (!search.trim()) return;
    try {
      const allOrders = await api.getOrders(false);
      const order = allOrders.find(
        o => o.order_number.toLowerCase() === search.toLowerCase()
      );
      if (order) {
        const fullOrder = await api.getOrder(order.id);
        setFoundOrder(fullOrder);
        setEditingItems(fullOrder.items || []);
      } else {
        setFoundOrder(null);
      }
    } catch (error) {
      console.error(error);
      setFoundOrder(null);
    }
  };

  useEffect(() => {
    const checkAndTransition = async () => {
      if (foundOrder && foundOrder.status === 'Abono confirmado') {
        const hasReferences = foundOrder.references && foundOrder.references.length > 0;
        if (hasReferences) {
          try {
            await api.updateStatus(foundOrder.id, 'En diseño', user?.name || 'Cliente');
            handleSearch();
          } catch (error) {
            console.error('Error in auto-transition:', error);
          }
        }
      }
    };
    checkAndTransition();
  }, [foundOrder, user]);

  const handleSaveItems = () => {
    if (!foundOrder) return;

    const requiredFields: { key: keyof OrderItem; label: string }[] = [
      { key: 'player_name', label: 'Nombre en Camiseta' },
      { key: 'number', label: 'Número' },
      { key: 'size', label: 'Talla' },
      { key: 'sleeve', label: 'Manga' },
      { key: 'design_type', label: 'Jugador' },
      { key: 'fit', label: 'Horma' },
    ];

    for (let i = 0; i < editingItems.length; i++) {
      const item = editingItems[i];
      for (const field of requiredFields) {
        const value = item[field.key as keyof typeof item];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          toast.error(`Prenda #${i + 1}: el campo "${field.label}" es obligatorio`);
          return;
        }
      }
    }

    if (isPublic) {
      setShowSaveConfirmModal(true);
    } else {
      executeSaveItems();
    }
  };

  const executeSaveItems = async () => {
    if (!foundOrder) return;
    setIsSavingItems(true);
    try {
      await api.updateOrder(foundOrder.id, {
        ...foundOrder,
        active: foundOrder.active ? true : false,
        status: 'En cuadro',
        items: editingItems,
        user_name: user?.name || 'Cliente',
      });
      setShowSaveConfirmModal(false);
      if (isPublic) setShowThankYouMessage(true);
      handleSearch();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la información');
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleApproveDesign = async () => {
    if (!foundOrder || !foundOrder.versions || foundOrder.versions.length === 0) return;
    try {
      const latestVersion = foundOrder.versions[foundOrder.versions.length - 1];
      await api.updateDesignVersionStatus(
        latestVersion.id,
        foundOrder.id,
        'Diseño aprobado',
        '',
        user?.name || 'Cliente'
      );
      toast.success('Diseño aprobado correctamente');
      handleSearch();
    } catch (error) {
      console.error(error);
      toast.error('Error al aprobar el diseño');
    }
  };

  const handleRejectDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundOrder || !foundOrder.versions || foundOrder.versions.length === 0) return;
    if (!rejectComment.trim()) {
      toast.error('Debes ingresar un comentario');
      return;
    }
    setIsSubmittingReject(true);
    try {
      const latestVersion = foundOrder.versions[foundOrder.versions.length - 1];
      await api.updateDesignVersionStatus(
        latestVersion.id,
        foundOrder.id,
        'Corrección solicitada',
        rejectComment,
        user?.name || 'Cliente'
      );
      toast.success('Correcciones solicitadas correctamente');
      setShowRejectModal(false);
      setRejectComment('');
      handleSearch();
    } catch (error) {
      console.error(error);
      toast.error('Error al solicitar correcciones');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // -------------------------------------------------------------------------
  // Derivados de estado
  // -------------------------------------------------------------------------
  const isDesignPhase =
    foundOrder &&
    [
      'En diseño',
      'En cuadro',
      'En montaje',
      'Versión enviada',
      'En corte',
      'En impresión',
      'En sublimación',
      'En confección',
      'En empaque',
      'Entregado',
      'Corrección solicitada',
      'Arte final cargado',
    ].includes(foundOrder.status);

  const canFillItems = foundOrder?.status === 'Diseño aprobado';

  const isReadOnlyItems =
    foundOrder &&
    [
      'En cuadro',
      'En montaje',
      'En impresión',
      'En sublimación',
      'En corte',
      'En confección',
      'En empaque',
      'En despacho',
      'Entregado',
    ].includes(foundOrder.status);

  const isPostDesign =
    foundOrder &&
    [
      'En cuadro',
      'En montaje',
      'En impresión',
      'En sublimación',
      'En corte',
      'En confección',
      'En empaque',
      'En despacho',
      'Entregado',
    ].includes(foundOrder.status);

  const steps: OrderStatus[] = isPublic
    ? (['Abono confirmado', 'En producción', 'En despacho', 'Entregado'] as any)
    : ['Abono confirmado', 'En diseño', 'En sublimación', 'En confección', 'En despacho', 'Entregado'];

  const getDisplayStatus = (status: OrderStatus) => {
    if (['En diseño', 'Versión enviada', 'Corrección solicitada'].includes(status))
      return 'En espera por aprobación';
    if (status === 'Arte final cargado') return 'Diseño aprobado';
    if (
      isPublic &&
      ['En sublimación', 'En corte', 'En confección', 'En empaque'].includes(status)
    )
      return 'En producción';
    return status;
  };

  const getNormalizedStatus = (status: OrderStatus) => {
    if (isPublic) {
      if (
        [
          'En diseño',
          'Versión enviada',
          'Corrección solicitada',
          'Diseño aprobado',
          'En cuadro',
          'En montaje',
          'En impresión',
          'En sublimación',
          'En corte',
          'En confección',
          'En empaque',
        ].includes(status)
      )
        return 'En producción' as any;
    } else {
      if (['Diseño aprobado', 'En cuadro', 'En montaje', 'En impresión'].includes(status))
        return 'En diseño';
      if (status === 'Versión enviada') return 'En diseño';
      if (['En sublimación', 'En corte'].includes(status)) return 'En sublimación';
      if (['En confección', 'En empaque'].includes(status)) return 'En confección';
    }
    if (['En despacho'].includes(status)) return 'En despacho';
    return status;
  };

  const currentStepIndex = foundOrder
    ? steps.indexOf(getNormalizedStatus(foundOrder.status))
    : -1;

  const getStepTime = (step: OrderStatus, index: number) => {
    if (!foundOrder || !foundOrder.history) return null;
    let startTime: Date | null = null;
    if (index === 0) {
      startTime = new Date(foundOrder.created_at);
    } else {
      const stepAliases: Partial<Record<OrderStatus, string[]>> = {
        'En sublimación': ['En sublimación', 'En impresión'],
      };
      const aliases = stepAliases[step] || [step];
      const historyEntry = [...foundOrder.history]
        .reverse()
        .find(
          h => h.action === 'Cambio de Estado' && aliases.some(a => h.details.includes(a))
        );
      if (historyEntry) startTime = new Date(historyEntry.created_at);
    }
    if (!startTime) return null;
    let endTime: Date | null = null;
    if (index < currentStepIndex) {
      const nextStep = steps[index + 1];
      const nextHistoryEntry = [...foundOrder.history]
        .reverse()
        .find(h => h.action === 'Cambio de Estado' && h.details.includes(nextStep));
      if (nextHistoryEntry) {
        endTime = new Date(nextHistoryEntry.created_at);
      } else {
        for (let i = index + 1; i <= currentStepIndex; i++) {
          const futureEntry = [...foundOrder.history]
            .reverse()
            .find(h => h.action === 'Cambio de Estado' && h.details.includes(steps[i]));
          if (futureEntry) {
            endTime = new Date(futureEntry.created_at);
            break;
          }
        }
      }
    } else if (index === currentStepIndex) {
      endTime = new Date();
    }
    if (!endTime) return null;
    const diffMs = endTime.getTime() - startTime.getTime();
    if (diffMs < 0) return null;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const SIZES = ['2', '4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'];

  const getDeliveryMessage = (order: any) => {
    const { status, delivery_date } = order;
    const hasItems = order.items && order.items.length > 0;
    if ((canFillItems && hasItems) || isPostDesign) {
      return delivery_date
        ? format(new Date(delivery_date), 'dd MMM, yyyy') +
            ' (Estimado) <br> Recuerde que debe de cargar el listado. <br> La fecha de entrega puede correr si pasa un dia y no ha cargado este listado.'
        : 'PENDIENTE';
    }
    if (status === 'Diseño aprobado' && !hasItems)
      return 'Completa la lista de uniformes para programar entrega';
    switch (status) {
      case 'Abono pendiente':
        return 'Esperando confirmación de pago';
      case 'Abono confirmado':
        return 'Carga la información requerida. <br>Estas imagenes son de importancia ya que son la referencia de la orden al diseñador.';
      case 'En diseño':
        return 'Estamos en construcción de tu prediseño.<br> Una vez aprobada esta de tú parte podremos seguir con el siguiente paso.';
      case 'Versión enviada':
        return 'Pendiente de aprobación del cliente';
      case 'Corrección solicitada':
        return 'Aplicando correcciones al diseño';
      default:
        return 'Fecha por definir';
    }
  };

  const productionSubSteps = [
    'En diseño',
    'Versión enviada',
    'Corrección solicitada',
    'Diseño aprobado',
    'En cuadro',
    'En montaje',
    'En impresión',
    'En sublimación',
    'En corte',
    'En confección',
    'En empaque',
  ];
  const productionProgressIndex = foundOrder
    ? productionSubSteps.indexOf(foundOrder.status)
    : -1;
  const productionPercent =
    productionProgressIndex >= 0
      ? Math.round(((productionProgressIndex + 1) / productionSubSteps.length) * 100)
      : 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto space-y-16">
      {/* Buscador */}
      <div className="text-center space-y-6">
        <h3 className="text-4xl font-black tracking-tighter text-foreground-main">Sigue tu Pedido</h3>
        <p className="text-foreground-muted text-[10px] font-black tracking-[0.3em]">
          Ingresa tu número de orden para ver el estado técnico en tiempo real
        </p>
        <div className="flex flex-col md:flex-row max-w-xl mx-auto gap-4 pt-4">
          <input
            type="text"
            placeholder="EJ. ORD-ABC123"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-8 py-5 rounded-[24px] border border-border-custom bg-surface text-foreground-main focus:ring-2 focus:ring-accent/20 outline-none transition-all font-black uppercase tracking-widest text-sm placeholder:text-foreground-muted/30"
          />
          <button
            onClick={handleSearch}
            className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20 whitespace-nowrap"
          >
            Buscar Orden
          </button>
        </div>
      </div>

      {foundOrder ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface p-12 border border-border-custom shadow-2xl relative overflow-hidden"
        >
          {/* Barra superior de progreso */}
          <div className="absolute top-0 left-0 w-full h-1 bg-accent/20" />
          <div
            className="absolute top-0 left-0 h-1 bg-accent transition-all duration-1000 shadow-[0_0_8px_var(--accent-glow)]"
            style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
          />

          {/* Header: estado + fecha */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-10">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted mb-3">
                Estado Actual del Proceso
              </p>
              <h4 className="text-4xl font-black text-accent tracking-tighter uppercase">
                {getDisplayStatus(foundOrder.status)}
              </h4>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4">
              <div className="text-center md:text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted mb-3">
                  Fecha Estimada de Entrega
                </p>
                <h4
                  className="text-3xl font-black tracking-tighter transition-all duration-500"
                  style={{ color: isPostDesign ? 'var(--text-main)' : 'var(--text-muted)' }}
                >
                  {isPostDesign
                    ? foundOrder.delivery_date
                      ? format(new Date(foundOrder.delivery_date), 'dd MMM, yyyy')
                      : 'PENDIENTE'
                    : 'Por confirmar'}
                </h4>
                {!isPostDesign && (
                  <div className="mt-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-4 rounded-2xl shadow-lg animate-fade-in">
                    <div className="mt-0.5">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Información importante
                      </p>
                      <p
                        className="text-xs font-semibold leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: getDeliveryMessage(foundOrder) }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showReceiptModal && lastPayment && (
            <ReceiptModal
              order={foundOrder}
              payment={lastPayment}
              onClose={() => setShowReceiptModal(false)}
            />
          )}

          {/* Progress Steps */}
          <div className="relative pt-16 pb-8">
            <div className="absolute top-[85px] left-0 w-full h-1 bg-foreground-main/5" />
            <div
              className="absolute top-[85px] left-0 h-1 bg-accent transition-all duration-1000 shadow-[0_0_20px_var(--accent-glow)]"
              style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {steps.map((step, i) => {
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const designSubSteps: OrderStatus[] = [
                  'Diseño aprobado',
                  'En cuadro',
                  'En montaje',
                  'En impresión',
                ];
                const isDesignApprovedStep = step === 'En diseño';
                const currentOrderStatus = foundOrder?.status;
                const isInDesignSubPhase =
                  currentOrderStatus &&
                  (designSubSteps.includes(currentOrderStatus as OrderStatus) ||
                    [
                      'Diseño aprobado',
                      'En diseño',
                      'Versión enviada',
                      'Corrección solicitada',
                      'En cuadro',
                      'En montaje',
                      'En impresión',
                    ].includes(currentOrderStatus));

                return (
                  <div key={step} className="flex flex-col items-center gap-6 relative">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10 border-4 border-surface shadow-2xl',
                        isCompleted
                          ? 'bg-accent text-white'
                          : 'bg-surface text-foreground-muted/20 border-border-custom',
                        isCurrent && 'scale-125 ring-8 ring-accent/10'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>

                    {/* Sub-pasos Diseño */}
                    {isDesignApprovedStep && !isPublic && (
                      <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 mt-2 w-32">
                        <div className="w-[1px] h-3 bg-border-custom mx-auto" />
                        <div className="bg-surface border border-border-custom rounded-2xl p-2 space-y-1.5 w-full shadow-lg">
                          {designSubSteps.map(sub => {
                            const subStatusOrder: OrderStatus[] = [
                              'Diseño aprobado',
                              'En cuadro',
                              'En montaje',
                              'En impresión',
                            ];
                            const currentSubIndex = subStatusOrder.indexOf(
                              currentOrderStatus as OrderStatus
                            );
                            const subIndex = subStatusOrder.indexOf(sub);
                            const subCompleted = subIndex >= 0 && currentSubIndex > subIndex;
                            const subCurrent = isInDesignSubPhase && currentOrderStatus === sub;
                            const subLabel =
                              sub === 'Diseño aprobado'
                                ? 'Diseño Aprobado'
                                : sub === 'En cuadro'
                                ? 'En Cuadro'
                                : sub === 'En montaje'
                                ? 'En Montaje'
                                : 'En Impresión';
                            return (
                              <div key={sub} className="flex items-center gap-1.5">
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all',
                                    subCompleted || currentStepIndex > i
                                      ? 'bg-accent text-white'
                                      : subCurrent
                                      ? 'bg-accent/30 border-2 border-accent'
                                      : 'bg-surface-hover border border-border-custom'
                                  )}
                                >
                                  {(subCompleted || currentStepIndex > i) && (
                                    <CheckCircle2 size={10} />
                                  )}
                                  {subCurrent && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'text-[8px] font-black uppercase tracking-wider',
                                    subCompleted || currentStepIndex > i
                                      ? 'text-accent'
                                      : subCurrent
                                      ? 'text-foreground-main'
                                      : 'text-foreground-muted/30'
                                  )}
                                >
                                  {subLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sub-pasos Sublimación */}
                    {step === 'En sublimación' && !isPublic && (
                      <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 mt-2 w-32">
                        <div className="w-[1px] h-3 bg-border-custom mx-auto" />
                        <div className="bg-surface border border-border-custom rounded-2xl p-2 space-y-1.5 w-full shadow-lg">
                          {(['En sublimación', 'En corte'] as OrderStatus[]).map(sub => {
                            const subCompleted =
                              currentStepIndex > i ||
                              (sub === 'En sublimación' &&
                                ['En corte', 'En confección', 'En empaque', 'En despacho', 'Entregado'].includes(
                                  foundOrder?.status || ''
                                ));
                            const subCurrent = foundOrder?.status === sub;
                            return (
                              <div key={sub} className="flex items-center gap-1.5">
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all',
                                    subCompleted || currentStepIndex > i
                                      ? 'bg-accent text-white'
                                      : subCurrent
                                      ? 'bg-accent/30 border-2 border-accent'
                                      : 'bg-surface-hover border border-border-custom'
                                  )}
                                >
                                  {(subCompleted || currentStepIndex > i) && (
                                    <CheckCircle2 size={10} />
                                  )}
                                  {subCurrent && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'text-[8px] font-black uppercase tracking-wider',
                                    subCompleted || currentStepIndex > i
                                      ? 'text-accent'
                                      : subCurrent
                                      ? 'text-foreground-main'
                                      : 'text-foreground-muted/30'
                                  )}
                                >
                                  {sub === 'En sublimación' ? 'En Sublimación' : 'En Corte'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Barra progreso producción pública */}
                    {isPublic && step === ('En producción' as any) && isCurrent && (
                      <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 mt-2 w-36">
                        <div className="w-[1px] h-3 bg-border-custom mx-auto" />
                        <div className="bg-surface border border-border-custom rounded-2xl p-3 w-full shadow-lg space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black uppercase tracking-wider text-foreground-muted">
                              Avance
                            </span>
                            <span className="text-[10px] font-black text-accent">
                              {productionPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-700"
                              style={{ width: `${productionPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-pasos Confección */}
                    {step === 'En confección' && !isPublic && (
                      <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 mt-2 w-32">
                        <div className="w-[1px] h-3 bg-border-custom mx-auto" />
                        <div className="bg-surface border border-border-custom rounded-2xl p-2 space-y-1.5 w-full shadow-lg">
                          {(['En confección', 'En empaque'] as OrderStatus[]).map(sub => {
                            const subCompleted =
                              currentStepIndex > i ||
                              (sub === 'En confección' &&
                                ['En empaque', 'En despacho', 'Entregado'].includes(
                                  foundOrder?.status || ''
                                ));
                            const subCurrent = foundOrder?.status === sub;
                            return (
                              <div key={sub} className="flex items-center gap-1.5">
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all',
                                    subCompleted || currentStepIndex > i
                                      ? 'bg-accent text-white'
                                      : subCurrent
                                      ? 'bg-accent/30 border-2 border-accent'
                                      : 'bg-surface-hover border border-border-custom'
                                  )}
                                >
                                  {(subCompleted || currentStepIndex > i) && (
                                    <CheckCircle2 size={10} />
                                  )}
                                  {subCurrent && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'text-[8px] font-black uppercase tracking-wider',
                                    subCompleted || currentStepIndex > i
                                      ? 'text-accent'
                                      : subCurrent
                                      ? 'text-foreground-main'
                                      : 'text-foreground-muted/30'
                                  )}
                                >
                                  {sub === 'En confección' ? 'En Confección' : 'En Empaque'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-1 mt-0">
                      <span
                        className={cn(
                          'text-[9px] font-black uppercase tracking-widest text-center max-w-[90px] leading-tight',
                          isCompleted ? 'text-foreground-main' : 'text-foreground-muted/50'
                        )}
                      >
                        {step}
                      </span>
                      {(isCompleted || isCurrent) && getStepTime(step, i) && (
                        <span className="text-[8px] font-bold text-foreground-muted bg-surface-hover px-2 py-0.5 rounded-md border border-border-custom">
                          {getStepTime(step, i)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paneles inferiores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-12 border-t border-border-custom">

            {/* Panel Diseño Actual */}
            <div className="bg-foreground-main/[0.02] p-8 rounded-[40px] border border-border-custom shadow-2xl h-fit space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                  <Palette className="text-accent" size={24} />
                </div>
                <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
                  Diseño Actual
                </h4>
              </div>
              <div className="space-y-8">
                {(() => {
                  const cats = Array.from(
                    new Set(foundOrder.items?.map(item => item.garment_type).filter(Boolean) || [])
                  ) as string[];
                  if (!cats.includes('Portero')) cats.push('Portero');
                  return cats;
                })().map(cat => {
                  const ref = [...(foundOrder.references || [])]
                    .reverse()
                    .find(r => r.comments === cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">
                        {cat}
                      </p>
                      {ref ? (
                        <div className="aspect-video rounded-3xl overflow-hidden border border-border-custom relative group shadow-lg">
                          <img
                            src={ref.file_path}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            {!isDesignPhase && (
                              <form
                                onSubmit={e => {
                                  e.preventDefault();
                                  const formData = new FormData();
                                  const input = e.currentTarget.querySelector(
                                    'input[type="file"]'
                                  ) as HTMLInputElement;
                                  if (input.files?.[0]) {
                                    formData.append('references', input.files[0]);
                                    formData.append('comments', cat);
                                    api
                                      .uploadReferences(
                                        foundOrder.id,
                                        formData,
                                        user?.name || 'Cliente'
                                      )
                                      .then(() => handleSearch());
                                  }
                                }}
                              >
                                <label className="cursor-pointer p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all">
                                  <Upload size={20} />
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={e => e.currentTarget.form?.requestSubmit()}
                                  />
                                </label>
                              </form>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a
                                href={ref.file_path}
                                download
                                onClick={e => e.stopPropagation()}
                                className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all"
                              >
                                <Download size={20} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : !isDesignPhase || cat === 'Portero' ? (
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            const formData = new FormData();
                            const input = e.currentTarget.querySelector(
                              'input[type="file"]'
                            ) as HTMLInputElement;
                            if (input.files?.[0]) {
                              formData.append('references', input.files[0]);
                              formData.append('comments', cat);
                              api
                                .uploadReferences(foundOrder.id, formData, user?.name || 'Cliente')
                                .then(() => handleSearch());
                            }
                          }}
                        >
                          <label className="aspect-video border-2 border-dashed border-border-custom rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group relative overflow-hidden">
                            <div className="w-12 h-12 bg-foreground-main/[0.02] rounded-2xl flex items-center justify-center text-foreground-muted/20 group-hover:text-accent group-hover:scale-110 transition-all">
                              <Upload size={24} />
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] font-black text-foreground-muted/50 uppercase tracking-[0.2em] group-hover:text-foreground-main transition-colors">
                                Subir Diseño
                              </p>
                              <p className="text-[8px] font-bold text-foreground-muted/30 uppercase tracking-widest mt-1">
                                Formato JPG, PNG
                              </p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              onChange={e => e.currentTarget.form?.requestSubmit()}
                            />
                          </label>
                        </form>
                      ) : (
                        <div className="aspect-video border-2 border-dashed border-border-custom rounded-[32px] flex flex-col items-center justify-center gap-4 bg-surface-hover/50">
                          <p className="text-[9px] font-black text-foreground-muted/30 uppercase tracking-[0.2em]">
                            Sin Referencia
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Propuesta del Diseñador */}
            {foundOrder.versions && foundOrder.versions.length > 0 && (
              <div className="bg-foreground-main/[0.02] p-8 rounded-[40px] border border-border-custom shadow-2xl h-fit space-y-8">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5 shrink-0">
                      <Palette className="text-accent" size={24} />
                    </div>
                    <h4 className="font-black text-foreground-main uppercase tracking-[0.3em] text-[11px] truncate">
                      Propuesta del Diseñador
                    </h4>
                  </div>
                  <p className="px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                    Versión #{foundOrder?.versions?.[0]?.version_number}
                  </p>
                </div>
                <div
                  className="relative aspect-video rounded-[32px] overflow-hidden border border-border-custom shadow-2xl group cursor-pointer"
                  onClick={() => {
                    setSelectedImageUrl(foundOrder.versions![0].file_path);
                    setShowImageModal(true);
                  }}
                >
                  <img
                    src={foundOrder.versions[0].file_path}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white">
                      <Maximize2 size={24} />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end pointer-events-none">
                    <p className="text-white font-bold text-sm mb-2">Comentarios del Diseñador:</p>
                    <p className="text-white/80 text-xs italic">
                      {foundOrder.versions[0].comments || 'Sin comentarios adicionales'}
                    </p>
                  </div>
                </div>
                {foundOrder.status === 'Versión enviada' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleApproveDesign}
                      className="bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-3"
                    >
                      <CheckCircle size={20} /> Aprobar
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="bg-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3"
                    >
                      <MessageSquare size={20} /> Cambios
                    </button>
                  </div>
                )}
                {foundOrder.status === 'Corrección solicitada' &&
                  foundOrder.versions[foundOrder.versions.length - 1].client_comments && (
                    <div className="p-6 bg-accent/5 rounded-[24px] border border-accent/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
                        <MessageSquare size={14} /> Correcciones Solicitadas
                      </p>
                      <p className="text-xs text-foreground-main italic leading-relaxed">
                        {foundOrder.versions[foundOrder.versions.length - 1].client_comments}
                      </p>
                      <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-4">
                        El diseñador está trabajando en una nueva versión.
                      </p>
                    </div>
                  )}
              </div>
            )}

            {/* Diseño de Uniformes */}
            {foundOrder && (
              <div className="col-span-full">
                <UniformDesignerSection
                  order={foundOrder}
                  user={user}
                  readOnly={!!isReadOnlyItems}
                  onSaved={handleSearch}
                />
              </div>
            )}

            {/* Detalle de Uniformes */}
            {editingItems.length > 0 && (canFillItems || isReadOnlyItems) && (
              <div className="bg-foreground-main/[0.02] p-8 rounded-[40px] border border-border-custom shadow-2xl col-span-full">
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                  <div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                        <Shirt className="text-accent" size={24} />
                      </div>
                      <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
                        Detalle de Uniformes
                        <p className="text-foreground-muted text-[10px] font-black uppercase tracking-widest">
                          Completa la información técnica de cada prenda para producción
                        </p>
                      </h4>
                    </div>
                    <br />
                    {foundOrder.team_name ? (
                      <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                        <Users size={16} className="text-accent" />
                        <span>
                          Equipo:{' '}
                          <span className="font-black text-foreground-main">{foundOrder.team_name}</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                        <Users size={16} className="text-foreground-muted/30" />
                        <span className="text-foreground-muted/30">Sin equipo asignado</span>
                      </div>
                    )}
                  </div>
                  {canFillItems && (
                    <button
                      onClick={handleSaveItems}
                      disabled={isSavingItems}
                      className="bg-accent text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20 disabled:opacity-50"
                    >
                      {isSavingItems ? (
                        <RefreshCw className="animate-spin" size={18} />
                      ) : (
                        <Save size={18} />
                      )}
                      Guardar Información Técnica
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto -mx-8 px-8">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border-custom">
                        {[
                          'Nombre en Camiseta',
                          'Número',
                          'Talla',
                          'Manga',
                          'Tipo',
                          'Horma',
                          'Observaciones',
                        ].map(h => (
                          <th
                            key={h}
                            className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {editingItems.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-foreground-main/[0.01] transition-colors">
                          {/* Nombre */}
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">
                                {item.player_name || '-'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={item.player_name || ''}
                                onChange={e => {
                                  const n = [...editingItems];
                                  n[idx].player_name = e.target.value;
                                  setEditingItems(n);
                                }}
                                className={cn(
                                  'bg-surface border rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest transition-all',
                                  !item.player_name || item.player_name.trim() === ''
                                    ? 'border-red-400/60 bg-red-500/5'
                                    : 'border-border-custom'
                                )}
                                placeholder="EJ. RODRIGUEZ"
                              />
                            )}
                          </td>
                          {/* Número */}
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">
                                {item.number || '-'}
                              </span>
                            ) : (
                              <input
                                type="number"
                                value={item.number || ''}
                                onChange={e => {
                                  const n = [...editingItems];
                                  n[idx].number = e.target.value;
                                  setEditingItems(n);
                                }}
                                className={cn(
                                  'bg-surface border rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest transition-all',
                                  !item.number || item.number.trim() === ''
                                    ? 'border-red-400/60 bg-red-500/5'
                                    : 'border-border-custom'
                                )}
                                placeholder="00"
                              />
                            )}
                          </td>
                          {/* Talla */}
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">
                                {item.size || '-'}
                              </span>
                            ) : (
                              <select
                                value={item.size || ''}
                                onChange={e => {
                                  const n = [...editingItems];
                                  n[idx] = { ...n[idx], size: e.target.value };
                                  setEditingItems(n);
                                }}
                                className={cn(
                                  'bg-surface border rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest transition-all',
                                  !item.size || item.size.trim() === ''
                                    ? 'border-red-400/60 bg-red-500/5'
                                    : 'border-border-custom'
                                )}
                              >
                                <option value="">Talla</option>
                                {SIZES.map(s => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          {/* Manga */}
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">
                                {item.sleeve || '-'}
                              </span>
                            ) : (
                              <select
                                value={item.sleeve || 'MANGA'}
                                onChange={e => {
                                  const n = [...editingItems];
                                  n[idx].sleeve = e.target.value;
                                  setEditingItems(n);
                                }}
                                className={cn(
                                  'bg-surface border rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest transition-all',
                                  !item.sleeve || item.sleeve.trim() === ''
                                    ? 'border-red-400/60 bg-red-500/5'
                                    : 'border-border-custom'
                                )}
                              >
                                <option value="">MANGA</option>
                                <option value="Corta">Corta</option>
                                <option value="Larga">Larga</option>
                              </select>
                            )}
                          </td>
                          {/* Tipo */}
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">
                                {item.design_type || '-'}
                              </span>
                            ) : (
                              <select
                                value={item.design_type || 'TIPO'}
                                onChange={e => {
                                  const n = [...editingItems];
                                  n[idx].design_type = e.target.value;
                                  setEditingItems(n);
                                }}
                                className={cn(
                                  'bg-surface border rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest transition-all',
                                  !item.design_type || item.design_type.trim() === ''
                                    ? 'border-red-400/60 bg-red-500/5'
                                    : 'border-border-custom'
                                )}
                              >
                                <option value="">TIPO</option>
                                <option value="Jugador">Jugador</option>
                                <option value="Portero">Portero</option>
                              </select>
                            )}
                          </td>
                          {/* Horma */}
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">
                                {item.fit || '-'}
                              </span>
                            ) : (
                              <select
                                value={item.fit || 'HORMA'}
                                onChange={e => {
                                  const n = [...editingItems];
                                  n[idx].fit = e.target.value;
                                  setEditingItems(n);
                                }}
                                className={cn(
                                  'bg-surface border rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest transition-all',
                                  !item.fit || item.fit.trim() === ''
                                    ? 'border-red-400/60 bg-red-500/5'
                                    : 'border-border-custom'
                                )}
                              >
                                <option value="">HORMA</option>
                                <option value="Hombre">Hombre</option>
                                <option value="Dama">Dama</option>
                              </select>
                            )}
                          </td>
                          {/* Observaciones */}
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-muted/50 italic">
                                {item.observations || '-'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={item.observations || ''}
                                onChange={e => {
                                  const n = [...editingItems];
                                  n[idx].observations = e.target.value;
                                  setEditingItems(n);
                                }}
                                className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold transition-all"
                                placeholder="Obs..."
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Historial de Diseños */}
            {foundOrder.versions && foundOrder.versions.length > 1 && (
              <div className="bg-foreground-main/[0.02] p-8 rounded-[40px] border border-border-custom shadow-2xl col-span-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                    <History className="text-accent" size={24} />
                  </div>
                  <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
                    Historial de Diseños
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {foundOrder.versions.map(v => (
                    <div
                      key={v.id}
                      className="bg-surface p-6 rounded-[32px] border border-border-custom shadow-xl group"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="px-3 py-1 bg-background rounded-full text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                          Versión #{v.version_number}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full',
                            v.status === 'Aprobado'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-accent/10 text-accent'
                          )}
                        >
                          {v.status}
                        </span>
                      </div>
                      <div
                        className="relative aspect-video rounded-2xl overflow-hidden mb-4 cursor-pointer"
                        onClick={() => {
                          setSelectedImageUrl(v.file_path);
                          setShowImageModal(true);
                        }}
                      >
                        <img
                          src={v.file_path}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize2 size={20} className="text-white" />
                        </div>
                      </div>
                      {v.client_comments && (
                        <div className="p-3 bg-accent/5 rounded-xl border border-accent/10">
                          <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 flex items-center gap-1.5">
                            <MessageSquare size={10} /> Tus Comentarios:
                          </p>
                          <p className="text-[10px] text-foreground-main italic">
                            {v.client_comments}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registro de Actividad */}
            <Card className="w-full col-span-full p-8 rounded-[2rem] border border-border-custom bg-surface shadow-xl shadow-black/5">
              <div className="space-y-8 w-full">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                      <History className="text-accent" size={24} />
                    </div>
                    <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
                      Registro de Actividad
                    </h4>
                  </div>
                  {foundOrder?.history && foundOrder.history.length > 3 && (
                    <button
                      onClick={() => setShowAllHistory(prev => !prev)}
                      className="text-accent text-[10px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                    >
                      {showAllHistory ? 'Ver menos' : 'Ver todo'}
                    </button>
                  )}
                </div>
                <div className="w-full">
                  <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom">
                    {(showAllHistory ? foundOrder?.history : foundOrder?.history?.slice(0, 3))?.map(
                      (h, i) => {
                        const isQualityReject = h.details?.includes('Rechazo de calidad');
                        return (
                          <div key={i} className="relative pl-8 group w-full">
                            <div
                              className={cn(
                                'absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 transition-colors',
                                isQualityReject
                                  ? 'bg-amber-500/20 border-amber-500'
                                  : 'bg-surface border-border-custom group-hover:border-accent'
                              )}
                            />
                            <div className="w-full">
                              <p
                                className={cn(
                                  'text-[11px] font-black tracking-tight leading-tight mb-1',
                                  isQualityReject ? 'text-amber-500' : 'text-foreground-main'
                                )}
                              >
                                {h.action}
                              </p>
                              {isQualityReject ? (
                                <div className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 mb-1">
                                    <AlertTriangle size={10} /> Rechazo de calidad
                                  </p>
                                  <p className="text-[10px] text-foreground-main leading-relaxed break-words">
                                    {h.details?.replace(
                                      '⚠ Rechazo de calidad en impresión — Motivo: ',
                                      ''
                                    )}
                                  </p>
                                </div>
                              ) : (
                                <p className="w-full text-[10px] text-foreground-muted leading-relaxed mb-2 break-words">
                                  {h.details}
                                </p>
                              )}
                              <p className="text-[9px] text-foreground-muted/50 font-black uppercase tracking-widest">
                                {format(new Date(h.created_at), 'dd MMM, HH:mm')}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    )}
                    {(!foundOrder?.history || foundOrder?.history?.length === 0) && (
                      <div className="text-center py-12">
                        <History size={32} className="mx-auto text-foreground-muted/10 mb-4" />
                        <p className="text-[10px] text-foreground-muted/50 font-black uppercase tracking-widest italic">
                          No hay actividad registrada aún
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

      ) : search ? (
        <div className="py-32 text-center bg-surface border border-border-custom shadow-2xl">
          <Search className="mx-auto text-foreground-muted/10 mb-6" size={64} />
          <h4 className="font-black text-2xl text-foreground-main tracking-tighter mb-2">
            Orden no encontrada
          </h4>
          <p className="text-foreground-muted/50 text-[10px] font-black tracking-widest italic">
            Verifica el número e intenta nuevamente
          </p>
        </div>
      ) : (
        <div className="py-32 text-center bg-surface border border-border-custom shadow-2xl">
          <Search className="mx-auto text-accent/30 mb-6" size={64} />
          <h4 className="font-black text-2xl text-foreground-main tracking-tighter mb-4">
            Busca tu pedido
          </h4>
          <p className="text-foreground-muted text-[11px] font-black tracking-widest uppercase mb-6">
            Ingresa tu número de orden para ver el estado en tiempo real
          </p>
          <div className="bg-accent/5 border border-accent/10 rounded-2xl px-6 py-4 inline-block">
            <p className="text-accent text-[10px] font-black tracking-widest">
              Ejemplo: ORD-ABC123
            </p>
          </div>
        </div>
      )}

      {/* Modal Gracias */}
      {showThankYouMessage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6"
        >
          <div className="w-full max-w-md bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <img src="/logo-bachestic.png" alt="Bachestic" className="mx-auto object-contain" />
            <div className="space-y-3">
              <h4 className="text-2xl font-black text-foreground-main tracking-tighter uppercase leading-tight">
                ¡Bachestic está orgulloso de ser parte de tu equipo!
              </h4>
              <p className="text-foreground-muted text-sm font-bold leading-relaxed">
                Gracias por preferirnos. Tu información fue guardada exitosamente y ya estamos
                trabajando para ti.
              </p>
            </div>
            <button
              onClick={() => setShowThankYouMessage(false)}
              className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20"
            >
              ¡Perfecto!
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {/* Modal Confirmar Listado */}
        {showSaveConfirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-foreground-main tracking-tighter uppercase">
                    ¿Confirmar Listado?
                  </h4>
                  <p className="text-foreground-muted text-[11px] font-bold uppercase tracking-widest mt-2 leading-relaxed">
                    Una vez confirmado, el listado pasará a producción y{' '}
                    <span className="text-accent">ya no podrás modificarlo</span>.
                  </p>
                </div>
                <div className="bg-surface-hover rounded-2xl border border-border-custom p-5 text-left space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted mb-3">
                    Resumen del listado
                  </p>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-foreground-muted">Total uniformes:</span>
                    <span className="font-black text-foreground-main">{editingItems.length}</span>
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setShowSaveConfirmModal(false)}
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all"
                  >
                    Revisar de nuevo
                  </button>
                  <button
                    onClick={executeSaveItems}
                    disabled={isSavingItems}
                    className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingItems ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}{' '}
                    Sí, confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Confirmar Pedido */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl text-center space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h4 className="text-3xl font-black text-foreground-main tracking-tighter uppercase mb-3">
                  ¿Confirmar Pedido?
                </h4>
                <p className="text-foreground-muted text-[11px] font-black uppercase tracking-widest leading-relaxed">
                  Al confirmar, el pedido pasará al estado de "Abono pendiente" para iniciar el
                  proceso técnico de diseño.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground-muted hover:text-foreground-main transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmOrder}
                  className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-accent/20 hover:scale-105 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Solicitar Correcciones */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
              <div className="mb-8">
                <h4 className="text-3xl font-black text-foreground-main tracking-tighter uppercase mb-3">
                  Solicitar Correcciones
                </h4>
                <p className="text-foreground-muted text-[11px] font-black uppercase tracking-widest leading-relaxed">
                  Indica los cambios necesarios para el diseño
                </p>
              </div>
              <form onSubmit={handleRejectDesign} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-3">
                    Comentarios para el diseñador
                  </label>
                  <textarea
                    value={rejectComment}
                    onChange={e => setRejectComment(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main transition-all placeholder:text-foreground-muted/30 min-h-[150px] resize-none"
                    placeholder="Ej: Cambiar el color del logo..."
                    required
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground-muted hover:text-foreground-main transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReject || !rejectComment.trim()}
                    className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-accent/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSubmittingReject ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <MessageSquare size={16} />
                    )}
                    Enviar Comentarios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal imagen fullscreen */}
        {showImageModal && selectedImageUrl && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setShowImageModal(false)}
          >
            <button
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-3 rounded-full backdrop-blur-md"
              onClick={() => setShowImageModal(false)}
            >
              <X size={24} />
            </button>
            <img
              src={selectedImageUrl}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}