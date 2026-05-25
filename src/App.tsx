import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Star,
  Palette, 
  AlertTriangle,
  Printer,  
  Shirt, 
  Package, 
  Users, 
  Plus, 
  Search, 
  Clock, 
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  FileText,
  DollarSign,
  History,
  MessageSquare,
  Upload,
  Eye,
  ArrowLeft,
  Menu,
  X,
  Lock,
  LogOut,
  ExternalLink,
  Copy,
  Save,
  Trash2,
  RefreshCw,
  Archive,
  EyeOff,
  Filter,
  Image,
  Contact,
  UserPlus,
  Phone,
  Sun,
  Moon,
  Edit2,
  UserMinus,
  Quote,
  Calculator,
  Download,
  RotateCcw,
  Maximize2,
  Mail,
  LocationEditIcon,
  Locate,
  ArrowRight 
} from 'lucide-react';
import * as XLSX from "xlsx-js-style";
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { Order, OrderItem, OrderStatus, Role, User, Client, OrderHistory, Employee, EmployeeReport, ProductionAssignment, Payment, Product, Team } from './lib/types';
import { format, differenceInBusinessDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'sonner';
import QRCode from "react-qr-code";

// Pantallas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientRoadmap from './pages/ClientRoadmap';
import { EmployeeManagement } from './pages/management/EmployeeManagement';
import { ClientManagement } from './pages/management/ClientManagement';
import { ProductManagement } from './pages/management/ProductManagement';
import { OrdersList } from './pages/orders/OrdersList';
import { CreateOrder } from './pages/orders/CreateOrder';
import { OrderDetails } from './pages/orders/OrderDetails';

// Componentes
import Card from './pages/components/Card';
import LoadingState from './pages/components/LoadingState';
import EmptyState from './pages/components/EmptyState';
import Modal from './pages/components/Modal';

// Utilidades Generales
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [view, setView] = useState<'dashboard' | 'orders' | 'kds' | 'client' | 'create-order' | 'order-details' | 'employees' | 'clients' | 'products' | 'confection-report'>('dashboard');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [previousView, setPreviousView] = useState<'orders' | 'kds'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ activeOrders: 0, monthlySales: 0, delayedOrders: 0 });
  const [employeeReport, setEmployeeReport] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const REFRESH_INTERVAL = 30_000; // 30 segundos
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const handleNavigate = (event: any) => {
      if (event.detail?.tab) {
        setView(event.detail.tab);
      }
    };

    window.addEventListener('navigate', handleNavigate);

    return () => {
      window.removeEventListener('navigate', handleNavigate);
    };
  }, []);

  const queryParams = new URLSearchParams(window.location.search);
  const publicOrderNumber = queryParams.get('order');
  
  useEffect(() => {
    if (publicOrderNumber) {
    setView('client');
    // ← Agregar esto:
    const savedTheme = localStorage.getItem('bachestic_theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light');
    } else {
      // Forzar light por defecto en vista pública
      setTheme('light');
      document.documentElement.classList.add('light');
    }
    } else {
        const savedUser = localStorage.getItem('bachestic_user');
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error('Error parsing saved user:', e);
            localStorage.removeItem('bachestic_user');
          }
        }
        const savedTheme = localStorage.getItem('bachestic_theme');
        if (savedTheme === 'light') {
          setTheme('light');
          document.documentElement.classList.add('light');
        }
      }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('bachestic_theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [user, includeInactive]);

  
  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('bachestic_user', JSON.stringify(userData));
    
    const productionRoles = [
      'Diseño',
      'Impresión',
      'Sublimación',
      'Corte',
      'Confección',
      'Empaque'
    ];

    if (productionRoles.includes(userData.role)) {
      setView('kds'); // 👈 lo mandas al KDS
    } else if (userData.role === 'Admin' || userData.role === 'Ventas') {
      setView('dashboard');
    } else {
      setView('client');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('bachestic_user');
  };

  const role = user?.role || 'Cliente';

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setFetchError(null);
      const [ordersData, statsData, reportData] = await Promise.all([
        api.getOrders(includeInactive),
        api.getStats(),
        api.getEmployeeReport()
      ]);
      setOrders(ordersData);
      setStats(statsData);
      setEmployeeReport(reportData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setFetchError('Error al conectar con el servidor. Por favor, verifica tu conexión.');
    }
  };

  const navigateToOrder = (id: number, from: 'orders' | 'kds' = 'orders') => {
    setSelectedOrderId(id);
    setPreviousView(from);
    setView('order-details');
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Ventas'] },
    { id: 'orders', label: 'Órdenes', icon: ShoppingCart, roles: ['Admin', 'Ventas'] },
    { id: 'clients', label: 'Clientes', icon: Contact, roles: ['Admin', 'Ventas'] },
    { id: 'products', label: 'Productos', icon: Package, roles: ['Admin', 'Ventas'] },
    { id: 'kds', label: 'Producción', icon: Clock, roles: ['Admin', 'Diseño', 'Impresión', 'Sublimación', 'Corte', 'Confección', 'Empaque'] },
    { id: 'employees', label: 'Empleados', icon: Users, roles: ['Admin'] },
    { id: 'client', label: 'Seguimiento', icon: Eye, roles: ['Admin', 'Ventas', 'Cliente'] },
    { id: 'confection-report', label: 'Confección', icon: Shirt, roles: ['Admin', 'Ventas'] },
  ];

  const filteredSidebarItems = sidebarItems.filter(item => item.roles.includes(role));

  const isProductionRole = !['Admin', 'Ventas', 'Cliente'].includes(role);
  const canEditOrders = ['Admin', 'Ventas'].includes(role);

  if (publicOrderNumber && view === 'client') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto">
          <ClientRoadmap orders={orders} initialSearch={publicOrderNumber} role={role} isPublic={true}/>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }
  
  return (
    <div className="flex h-screen bg-background font-sans text-foreground-main">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && !isProductionRole && (
          <motion.aside 
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="w-[280px] bg-surface border-r border-border-custom flex flex-col z-50">
            <div className="flex items-center justify-between">
              
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-foreground-muted hover:text-foreground-main"
              >
                <X size={20} />
              </button>

            </div>

            <nav className="flex-1 p-6 space-y-2">
              {filteredSidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                    (view === item.id || (item.id === 'orders' && (view === 'order-details' || view === 'create-order')))
                      ? "bg-accent text-white shadow-xl shadow-accent/20" 
                      : "hover:bg-surface-hover text-foreground-muted hover:text-foreground-main"
                  )}
                >
                  <item.icon size={20} className={cn("transition-transform duration-300", view === item.id ? "scale-110" : "group-hover:scale-110")} />
                  <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto p-4 border-t border-border-custom space-y-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-muted hover:text-accent hover:bg-accent/10 transition-all duration-200"
              >
                <LogOut size={20} />
                <span className="font-medium">Cerrar Sesión</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {fetchError && (
          <div className="absolute top-6 right-6 z-[100] bg-accent text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 animate-bounce">
            <AlertCircle size={20} />
            {fetchError}
            <button onClick={() => fetchData()} className="ml-4 bg-foreground-main/20 p-2 rounded-lg hover:bg-foreground-main/30 transition-colors">
              <RefreshCw size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && !isProductionRole && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-surface-hover rounded-lg text-foreground-main">
                <Menu size={20} />
              </button>
            )}
            {view === 'dashboard' && <h2 className="text-3xl font-bold capitalize text-foreground-main tracking-tighter">{view.replace('-', ' ')}</h2>}
          </div>
          <AnimatePresence mode="wait">
            {view === 'dashboard' && <Dashboard key="dashboard" stats={stats} orders={orders} employeeReport={employeeReport} onOrderClick={navigateToOrder} />}
            {view === 'orders' && <OrdersList key="orders" orders={orders} user={user!} onOrderClick={navigateToOrder} onCreateClick={() => setShowCreateOrder(true)} canCreate={canEditOrders} includeInactive={includeInactive} onToggleInactive={() => setIncludeInactive(!includeInactive)} onUpdate={fetchData} onShowRoadmap={(orderNum) => setShowRoadmapModal(orderNum)} />}
            {showCreateOrder && canEditOrders && (
              <Modal
                isOpen={showCreateOrder}
                onClose={() => setShowCreateOrder(false)}
                title="Nueva Orden"
                maxWidth="max-w-5xl"
              >
                <CreateOrder
                  key="create"
                  onCancel={() => setShowCreateOrder(false)}
                  onSuccess={() => {
                    fetchData();
                    setShowCreateOrder(false);
                  }}
                  user={user!}
                />
              </Modal>
            )}
            {showRoadmapModal && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-5xl bg-background rounded-[40px] p-8 relative border border-border-custom shadow-2xl">
                  <button 
                    onClick={() => setShowRoadmapModal(null)}
                    className="absolute top-8 right-8 text-foreground-muted hover:text-foreground-main transition-colors"
                  >
                    <X size={32} />
                  </button>
                  <ClientRoadmap orders={orders} initialSearch={showRoadmapModal} role={role} />
                </div>
              </div>
            )}
            {view === 'order-details' && selectedOrderId && <OrderDetails key="details" orderId={selectedOrderId} onBack={() => setView(previousView)} onUpdate={fetchData} user={user!} canEdit={canEditOrders} />}
            {view === 'kds' && <KDS key="kds" orders={orders} user={user!} onOrderClick={(id) => navigateToOrder(id, 'kds')} onUpdate={fetchData} />}
            {view === 'employees' && <EmployeeManagement key="employees" />}
            {view === 'products' && <ProductManagement key="products" />}
            {view === 'clients' && <ClientManagement key="clients" />}
            {view === 'client' && <ClientRoadmap key="client" orders={orders} user={user!} role={role} />}
            {view === 'confection-report' && <ConfectionReport key="confection-report" />}
          </AnimatePresence>
        </div>

        {/* Floating Action Buttons for Production Roles */}
        {isProductionRole && (
          <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-[200]">
            <button 
              onClick={toggleTheme}
              className="w-14 h-14 bg-surface border border-border-custom rounded-full flex items-center justify-center text-foreground-muted hover:text-foreground-main shadow-2xl transition-all hover:scale-110 active:scale-95"
            >
              {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button 
              onClick={handleLogout}
              className="w-14 h-14 bg-accent text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 shadow-accent/40"
            >
              <LogOut size={24} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// --- KDS Component ---
function KDS({ orders, user, onOrderClick, onUpdate }: { orders: Order[], user: User, onOrderClick: (id: number) => void, onUpdate: () => void, key?: string }) {
  const role = user.role;
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showDelivered, setShowDelivered] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'Todos'>('Todos');
  const [showAssign, setShowAssign] = useState<Order | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignment, setAssignment] = useState({ employee_id: '', garment_count: 0, price_per_unit: 0 });
  const [teamFilter, setTeamFilter] = useState<string>('Todos');
  const [dateField, setDateField] = useState<'created_at' | 'delivery_date'>('delivery_date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ PAGINACIÓN
  const ITEMS_PER_PAGE = 100;
  const [currentPage, setCurrentPage] = useState(1);

  const availableTeams = ['Todos', ...Array.from(new Set(
    orders.filter(o => o.team_name).map(o => o.team_name as string)
  ))];

  useEffect(() => {
    if (role === 'Admin' || role === 'Confección' || role === 'Empaque') {
      api.getEmployees().then(setEmployees).catch(console.error);
    }
  }, [role]);


  // ✅ RESETEAR PAGINA CUANDO CAMBIEN FILTROS
  useEffect(() => {
    setCurrentPage(1);
  }, [
    showDelivered,
    statusFilter,
    teamFilter,
    dateField,
    dateFrom,
    dateTo,
    searchTerm
  ]);

  const departmentMap: Record<string, OrderStatus[]> = {
    'Diseño': ['En diseño', 'Versión enviada', 'Corrección solicitada'],
    'Impresión': ['En impresión'],
    'Sublimación': ['En sublimación'],
    'Corte': ['En corte'],
    'Confección': ['En confección'],
    'Empaque': ['En empaque']
  };

  const nextStatusMap: Record<OrderStatus, OrderStatus> = {
    'Cotización': 'Abono pendiente',
    'Abono pendiente': 'Abono confirmado',
    'Abono confirmado': 'En diseño',
    'En diseño': 'Versión enviada',
    'Versión enviada': 'Diseño aprobado',
    'Corrección solicitada': 'Versión enviada',
    'Diseño aprobado': 'En cuadro',
    'En cuadro': 'En montaje',
    'En montaje': 'En impresión interna',
    'Arte final cargado': 'En impresión',
    'En impresión': 'En sublimación',
    'En sublimación': 'En corte',
    'En corte': 'En confección',
    'En confección': 'En empaque',
    'Entregado': 'Entregado',
    'Devuelto': 'Devuelto',
    'En empaque': 'En despacho',
    'En despacho': 'Entregado'
  };

  const previousStatusMap: Record<OrderStatus, OrderStatus> = {
    'Abono pendiente': 'Abono pendiente',
    'Abono confirmado': 'Abono pendiente',
    'En diseño': 'Abono confirmado',
    'Versión enviada': 'En diseño',
    'Corrección solicitada': 'En diseño',
    'Diseño aprobado': 'Versión enviada',
    'En cuadro': 'Diseño aprobado',
    'En montaje': 'En cuadro',
    'Arte final cargado': 'Diseño aprobado',
    'En sublimación': 'En impresión',
    'En corte': 'En sublimación',
    'En confección': 'En corte',
    'En empaque': 'En confección',
    'En despacho': 'En empaque',
    'Devuelto': 'Devuelto',
    'Entregado': 'En despacho'
  };

  const handleAdvance = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const nextStatus = nextStatusMap[order.status];
    if (nextStatus === order.status) return;

    if (['En confección', 'En empaque'].includes(nextStatus)) {
      setShowAssign(order);
      const totalGarments = order.items?.length || 0;
      const defaultPrice = nextStatus === 'En confección' ? (order.items?.[0]?.sewing_price || 0) : 0;
      setAssignment({ employee_id: '', garment_count: totalGarments, price_per_unit: defaultPrice });
      return;
    }

    try {
      setUpdatingId(order.id);
      await api.updateStatus(order.id, nextStatus, user.name);

      if (order.is_reposition && order.reposition_from_status) {
        const statusOrder: OrderStatus[] = [
          'En sublimación', 'En corte', 'En confección',
          'En empaque', 'En despacho', 'Entregado'
        ];
        const fromIndex = statusOrder.indexOf(order.reposition_from_status as OrderStatus);
        const newIndex = statusOrder.indexOf(nextStatus);

        if (fromIndex !== -1 && newIndex !== -1 && newIndex >= fromIndex) {
          await api.updateOrder(order.id, {
            is_reposition: false,
            reposition_reason: null,
            reposition_from_status: null,
            user_name: user.name
          });
        }
      }

      onUpdate();
    } catch (error) {
      console.error('Error advancing order:', error);
      toast.error('Error al avanzar la orden');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!showAssign) return;
    const nextStatus = nextStatusMap[showAssign.status];

    try {
      setUpdatingId(showAssign.id);

      await api.createAssignment({
        order_id: showAssign.id,
        employee_id: parseInt(assignment.employee_id),
        department: nextStatus === 'En confección' ? 'Confección' : 'Empaque',
        garment_count: assignment.garment_count,
        price_per_unit: assignment.price_per_unit
      });

      await api.updateStatus(showAssign.id, nextStatus, user.name);

      setShowAssign(null);
      onUpdate();

    } catch (error) {
      console.error('Error in assignment:', error);
      toast.error('Error al asignar y avanzar la orden');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevert = async (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();

    const prevStatus = previousStatusMap[order.status];
    if (prevStatus === order.status) return;

    try {
      setUpdatingId(order.id);
      await api.updateStatus(order.id, prevStatus);
      onUpdate();
    } catch (error) {
      console.error('Error reverting order:', error);
      toast.error('Error al devolver la orden');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {

    if (showDelivered) {
      if (o.status !== 'Entregado') return false;
    } else {
      if (o.status === 'Entregado') return false;

      if (role !== 'Admin' && !departmentMap[role]?.includes(o.status)) {
        return false;
      }

      if (role === 'Admin' && statusFilter !== 'Todos' && o.status !== statusFilter) {
        return false;
      }
    }

    const matchesTeam = teamFilter === 'Todos' || o.team_name === teamFilter;
    if (!matchesTeam) return false;

    const matchesSearch =
      !searchTerm.trim() ||
      o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (dateFrom || dateTo) {
      const raw = o[dateField];
      if (!raw) return false;

      const orderDate = new Date(raw).toISOString().split('T')[0];

      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
    }

    return true;
  }).sort((a, b) => {

    // Es prioridad primero
    if (a.is_priority && !b.is_priority) return -1;
    if (!a.is_priority && b.is_priority) return 1;

    if (a.is_reposition && !b.is_reposition) return -1;
    if (!a.is_reposition && b.is_reposition) return 1;

    if (a.status === 'Entregado' && b.status !== 'Entregado') return 1;
    if (a.status !== 'Entregado' && b.status === 'Entregado') return -1;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // ✅ PAGINACIÓN
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ✅ SOLO LA PRIMERA ORDEN ACTIVA
  const globalActiveOrders = orders
    .filter(o => o.status !== 'Entregado')
    .sort((a, b) => {

      // prioridad primero
      if (a.is_priority && !b.is_priority) return -1;
      if (!a.is_priority && b.is_priority) return 1;

      // reposición primero
      if (a.is_reposition && !b.is_reposition) return -1;
      if (!a.is_reposition && b.is_reposition) return 1;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  // ✅ SOLO ESTA ORDEN SE DESBLOQUEA
  const firstActiveOrderId = globalActiveOrders[0]?.id;

  const allStatuses: OrderStatus[] = [
    'Abono pendiente',
    'Abono confirmado',
    'En diseño',
    'Versión enviada',
    'Corrección solicitada',
    'Diseño aprobado',
    'Arte final cargado',
    'En cuadro',
    'En montaje',
    'En impresión',
    'En sublimación',
    'En corte',
    'En confección',
    'En empaque',
    'En despacho'
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10"
    >
      <div className="flex flex-col gap-6">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-4xl font-black text-foreground-main tracking-tighter">
              Producción
            </h3>
          </div>

          {/* LEYENDA */}
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
              <CheckCircle2 size={14} /> Entregadas
            </button>
          </div>

          <div className="flex items-center gap-6 bg-surface px-6 py-3 rounded-2xl border border-border-custom">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                A tiempo
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                Próximo
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent-glow)]"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                Vencido
              </span>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-3xl border border-border-custom bg-surface/60 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)]">

          {/* ESTADO */}
          {role === 'Admin' && !showDelivered && (
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-accent/5 opacity-0 group-hover:opacity-100 transition-all" />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="
                  appearance-none
                  relative
                  bg-surface
                  border border-border-custom
                  hover:border-accent/40
                  focus:border-accent
                  focus:ring-4
                  focus:ring-accent/10
                  rounded-2xl
                  pl-5 pr-12 py-3
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-foreground-main
                  outline-none
                  transition-all
                  cursor-pointer
                  min-w-[220px]
                "
              >
                <option value="Todos">Todos los estados</option>

                {allStatuses.map(s => (
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

          {/* BUSCADOR */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-accent/5 opacity-0 group-focus-within:opacity-100 transition-all" />

            <Search
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                text-foreground-muted
                group-focus-within:text-accent
                transition-colors
              "
              size={16}
            />

            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="
                relative
                pl-11 pr-11 py-3
                rounded-2xl
                bg-surface
                border border-border-custom
                hover:border-accent/40
                focus:border-accent
                focus:ring-4
                focus:ring-accent/10
                outline-none
                text-foreground-main
                text-[10px]
                font-black
                uppercase
                tracking-[0.18em]
                placeholder:text-foreground-muted/40
                transition-all
                w-[260px]
              "
            />

            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  w-6 h-6 rounded-full
                  flex items-center justify-center
                  text-foreground-muted
                  hover:text-white
                  hover:bg-accent
                  transition-all
                "
              >
                <X size={12} />
              </button>
            )}
          </div>
          
          {/* FILTRO EQUIPO */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-accent/5 opacity-0 group-hover:opacity-100 transition-all" />

            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="
                appearance-none
                relative
                bg-surface
                border border-border-custom
                hover:border-accent/40
                focus:border-accent
                focus:ring-4
                focus:ring-accent/10
                rounded-2xl
                pl-5 pr-12 py-3
                text-[10px]
                font-black
                uppercase
                tracking-[0.18em]
                text-foreground-main
                outline-none
                transition-all
                cursor-pointer
                min-w-[190px]
              "
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

          {/* FECHAS */}
          <div className="
            flex items-center gap-4
            bg-surface
            border border-border-custom
            hover:border-accent/30
            rounded-2xl
            px-5 py-3
            transition-all
          ">

            <select
              value={dateField}
              onChange={e => setDateField(e.target.value as any)}
              className="
                bg-transparent
                text-[10px]
                font-black
                uppercase
                tracking-[0.18em]
                outline-none
                text-foreground-muted
                appearance-none
                cursor-pointer
              "
            >
              <option value="delivery_date">Entrega</option>
              <option value="created_at">Creación</option>
            </select>

            <div className="w-px h-5 bg-border-custom" />

            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="
                bg-transparent
                text-[10px]
                font-black
                text-foreground-main
                outline-none
                [color-scheme:light]
                cursor-pointer
              "
            />

            <span className="text-[10px] font-black text-foreground-muted">
              —
            </span>

            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="
                bg-transparent
                text-[10px]
                font-black
                text-foreground-main
                outline-none
                [color-scheme:light]
                cursor-pointer
              "
            />

            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="
                  w-7 h-7
                  rounded-full
                  flex items-center justify-center
                  text-foreground-muted
                  hover:bg-accent
                  hover:text-white
                  transition-all
                "
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* CONTADOR DE ÓRDENES */}
          <div className="
            ml-auto
            flex items-center gap-2
            px-5 py-3
            rounded-2xl
            bg-accent/10
            border border-accent/10
          ">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />

            <span className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.18em]
              text-accent
              whitespace-nowrap
            ">
              {filteredOrders.length}{' '}
              {filteredOrders.length === 1 ? 'orden' : 'órdenes'}
            </span>
          </div>

        </div>
      </div>

      {/* LISTA */}
      <div className="flex flex-col gap-4">

        {paginatedOrders.length === 0 ? (
          <div className="bg-surface border border-border-custom rounded-2xl p-8 text-center">

            <p className="text-lg font-black text-foreground-main">
              {showDelivered
                ? "No hay órdenes entregadas"
                : "No hay órdenes en producción"}
            </p>

            <p className="text-[10px] text-foreground-muted mt-3 tracking-widest">
              {showDelivered
                ? "Las entregas están completas"
                : "Todo está al día"}
            </p>

          </div>
        ) : (
          paginatedOrders.map(order => {

            // ✅ SOLO LA PRIMERA ACTIVA
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
                onClick={() => {
                  if (!isLocked) {
                    onOrderClick(order.id);
                  }
                }}
                className={cn(
                  "flex items-center justify-between bg-surface px-6 py-4 rounded-2xl border-l-4 border border-border-custom transition-all",
                  !isLocked && "cursor-pointer hover:bg-background",
                  isLocked && "opacity-50 cursor-not-allowed pointer-events-none",
                  order.is_reposition
                    ? "border-l-orange-500 bg-orange-500/5 hover:bg-orange-500/10"
                    : colorClass
                )}
              >
                {/* IZQUIERDA */}
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

                    <h4 className="font-black text-sm text-foreground-main">
                      {order.client_name}
                    </h4>

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

                  {typeof order.team_name === 'string' && order.team_name.trim() !== '' && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1">
                      <Users size={12} /> {order.team_name}
                    </p>
                  )}
                </div>

                {/* CENTRO */}
                <div className="hidden md:flex items-center gap-10">

                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-foreground-muted">
                      Uniformes
                    </p>

                    <p className="font-black text-sm">
                      {order.items?.length || 0}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase text-foreground-muted">
                      Estado
                    </p>

                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                      order.status === 'Abono confirmado'
                        ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        : order.status === 'Entregado'
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-accent/10 text-accent border-accent/20"
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* DERECHA */}
                <div className="flex items-center gap-6">

                  <div className={cn(
                    "text-[10px] font-black uppercase",
                    statusColorClass
                  )}>
                    {daysLeft < 0
                      ? `Vencido ${Math.abs(daysLeft)}d`
                      : `${daysLeft} días`}
                  </div>

                  <ExternalLink size={14} className="text-foreground-muted" />
                </div>
              </motion.div>
            );
          })
        )}

        {/* ✅ PAGINACIÓN */}
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

function ConfectionReport({ key }: { key?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [empFilter, setEmpFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [tab, setTab] = useState<'detail' | 'summary'>('detail');
  const [isExporting, setIsExporting] = useState(false);

  const CAM_TASKS = [
    { key: 'filetes',           label: 'Filetes' },
    { key: 'despuntes',         label: 'Despuntes' },
    { key: 'collarin',          label: 'Collarín' },
    { key: 'dobladillo_remate', label: 'Dobladillo y remate' },
  ];
  const PANT_TASKS = [
    { key: 'filete_p',      label: 'Filete' },
    { key: 'despuntes_p',   label: 'Despuntes' },
    { key: 'caucho',        label: 'Caucho' },
    { key: 'sentar_caucho', label: 'Sentar caucho' },
    { key: 'collarin_p',    label: 'Collarín' },
    { key: 'remate',        label: 'Remate' },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const assignments = await api.getAllAssignments();
        const confeccionOnly = assignments.filter((a: any) => a.department === 'Confección');
        const parsed = confeccionOnly.map((a: any) => {
          const notesRaw: string = a.notes || '';
          const typeMatch = notesRaw.match(/^\[(.+?)\]/);
          const garment_type = typeMatch ? typeMatch[1] : 'Camiseta';
          const rest = notesRaw.replace(/^\[.+?\]\s*/, '').split(' — ')[0].trim();
          const allTasks = [...CAM_TASKS, ...PANT_TASKS];
          const found = allTasks.find(t => t.label.toLowerCase() === rest.toLowerCase());
          return {
            ...a,
            garment_type,
            task_label: rest,
            task_key: found?.key || rest.toLowerCase().replace(/\s/g, '_'),
          };
        });
        setData(parsed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const employees = [...new Set(data.map(r => r.employee_name).filter(Boolean))].sort();

  const filtered = data.filter(r =>
    (!empFilter || r.employee_name === empFilter) &&
    (!typeFilter || r.garment_type === typeFilter) &&
    (!orderFilter || (r.order_number || '').toLowerCase().includes(orderFilter.toLowerCase()))
  );

  const totalQty  = filtered.reduce((s, r) => s + (r.garment_count || 0), 0);
  const totalCost = filtered.reduce((s, r) => s + (r.garment_count || 0) * (r.price_per_unit || 0), 0);
  const camQty    = filtered.filter(r => r.garment_type === 'Camiseta').reduce((s, r) => s + (r.garment_count || 0), 0);
  const pantQty   = filtered.filter(r => r.garment_type === 'Pantaloneta').reduce((s, r) => s + (r.garment_count || 0), 0);

  const exportToExcel = () => {
    if (!filtered.length) {
      toast.error('No hay registros para exportar');
      return;
    }
    setIsExporting(true);

    const headerStyle = {
      font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
      fill:      { fgColor: { rgb: '1A1A2E' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top:    { style: 'thin', color: { rgb: '444444' } },
        bottom: { style: 'thin', color: { rgb: '444444' } },
        left:   { style: 'thin', color: { rgb: '444444' } },
        right:  { style: 'thin', color: { rgb: '444444' } },
      },
    };

    const cellStyle = {
      font:      { sz: 10 },
      alignment: { vertical: 'center', wrapText: true },
      border: {
        top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
        right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
      },
    };

    const accentStyle = { ...cellStyle, font: { bold: true, color: { rgb: 'E11D48' }, sz: 10 } };
    const blueStyle   = { ...cellStyle, font: { bold: true, color: { rgb: '3B82F6' }, sz: 10 } };
    const purpleStyle = { ...cellStyle, font: { bold: true, color: { rgb: '9333EA' }, sz: 10 } };
    const totalStyle  = { ...cellStyle, font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: 'F1F5F9' } } };

    // ── Hoja 1: Detalle por tarea ──
    const headers1 = ['Orden', 'Responsable', 'Tipo Prenda', 'Tarea', 'Cantidad', '$ Unit.', 'Subtotal'];
    const ws1: any = {};
    const rows1 = filtered.map(r => [
      r.order_number || `#${r.order_id}`,
      r.employee_name || `Emp #${r.employee_id}`,
      r.garment_type,
      r.task_label,
      r.garment_count || 0,
      r.price_per_unit || 0,
      (r.garment_count || 0) * (r.price_per_unit || 0),
    ]);

    headers1.forEach((h, ci) => {
      ws1[XLSX.utils.encode_cell({ r: 0, c: ci })] = { v: h, t: 's', s: headerStyle };
    });

    rows1.forEach((row, ri) => {
      row.forEach((v, ci) => {
        let s = cellStyle;
        if (ci === 2) s = v === 'Camiseta' ? blueStyle : purpleStyle;
        if (ci === 6) s = accentStyle;
        ws1[XLSX.utils.encode_cell({ r: ri + 1, c: ci })] = { v, t: typeof v === 'number' ? 'n' : 's', s };
      });
    });

    // Fila total
    const totalRow = rows1.length + 1;
    ['TOTAL', '', '', '', totalQty, '', totalCost].forEach((v, ci) => {
      ws1[XLSX.utils.encode_cell({ r: totalRow, c: ci })] = { v, t: typeof v === 'number' ? 'n' : 's', s: totalStyle };
    });

    ws1['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRow, c: 6 } });
    ws1['!cols'] = [{ wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 14 }];
    ws1['!rows'] = [{ hpt: 28 }];

    // ── Hoja 2: Resumen por responsable ──
    const byEmp: Record<string, any> = {};
    filtered.forEach(r => {
      const k = r.employee_name || `Emp #${r.employee_id}`;
      if (!byEmp[k]) byEmp[k] = { name: k, total_qty: 0, total_cost: 0, cam: {} as any, pant: {} as any };
      const bucket = r.garment_type === 'Camiseta' ? byEmp[k].cam : byEmp[k].pant;
      if (!bucket[r.task_label]) bucket[r.task_label] = { qty: 0, cost: 0 };
      bucket[r.task_label].qty  += r.garment_count || 0;
      bucket[r.task_label].cost += (r.garment_count || 0) * (r.price_per_unit || 0);
      byEmp[k].total_qty  += r.garment_count || 0;
      byEmp[k].total_cost += (r.garment_count || 0) * (r.price_per_unit || 0);
    });

    const summaryRows: any[][] = [
      ['Responsable', 'Tipo', 'Tarea', 'Cantidad', 'Costo'],
    ];
    Object.values(byEmp).sort((a: any, b: any) => b.total_cost - a.total_cost).forEach((emp: any) => {
      Object.entries(emp.cam).forEach(([label, v]: any) => {
        summaryRows.push([emp.name, 'Camiseta', label, v.qty, v.cost]);
      });
      Object.entries(emp.pant).forEach(([label, v]: any) => {
        summaryRows.push([emp.name, 'Pantaloneta', label, v.qty, v.cost]);
      });
      summaryRows.push(['SUBTOTAL ' + emp.name, '', '', emp.total_qty, emp.total_cost]);
    });

    const ws2: any = {};
    summaryRows.forEach((row, ri) => {
      const isHeader  = ri === 0;
      const isSubtotal = typeof row[0] === 'string' && row[0].startsWith('SUBTOTAL');
      row.forEach((v, ci) => {
        let s = isHeader ? headerStyle : isSubtotal ? totalStyle : cellStyle;
        if (!isHeader && !isSubtotal && ci === 1) s = v === 'Camiseta' ? blueStyle : purpleStyle;
        if (!isHeader && !isSubtotal && ci === 4) s = accentStyle;
        ws2[XLSX.utils.encode_cell({ r: ri, c: ci })] = { v, t: typeof v === 'number' ? 'n' : 's', s };
      });
    });
    ws2['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: summaryRows.length - 1, c: 4 } });
    ws2['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 14 }];
    ws2['!rows'] = [{ hpt: 28 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Detalle por Tarea');
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por Responsable');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Reporte_Confeccion_${dateStr}.xlsx`);
    toast.success('Reporte exportado');
    setIsExporting(false);
  };

  if (loading) return <LoadingState message="Cargando reporte de confección" />;

  // ---- Render tabla detalle ----
  const renderDetail = (rows: any[], tipo: string) => {
    if (!rows.length) return null;
    const totQty  = rows.reduce((s, r) => s + (r.garment_count || 0), 0);
    const totCost = rows.reduce((s, r) => s + (r.garment_count || 0) * (r.price_per_unit || 0), 0);
    return (
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-4 flex items-center gap-2">
          <Shirt size={14} className={tipo === 'Camiseta' ? 'text-blue-400' : 'text-purple-400'} />
          {tipo}
        </p>
        <div className="overflow-x-auto rounded-[24px] border border-border-custom">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-hover text-[9px] uppercase font-black tracking-[0.2em] text-foreground-muted">
                <th className="py-4 px-5">Orden</th>
                <th className="py-4 px-5">Responsable</th>
                <th className="py-4 px-5">Tarea</th>
                <th className="py-4 px-5 text-right">Cant.</th>
                <th className="py-4 px-5 text-right">$ Unit.</th>
                <th className="py-4 px-5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-5 text-[11px] text-foreground-muted">{r.order_number || `#${r.order_id}`}</td>
                  <td className="py-3 px-5 font-bold text-foreground-main text-[11px]">{r.employee_name || `Emp #${r.employee_id}`}</td>
                  <td className="py-3 px-5 text-[11px]">{r.task_label}</td>
                  <td className="py-3 px-5 text-right font-black text-foreground-main">{(r.garment_count || 0).toLocaleString()}</td>
                  <td className="py-3 px-5 text-right text-foreground-muted text-[11px]">${(r.price_per_unit || 0).toLocaleString()}</td>
                  <td className="py-3 px-5 text-right font-black text-foreground-main">${((r.garment_count || 0) * (r.price_per_unit || 0)).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-surface-hover font-black">
                <td colSpan={3} className="py-3 px-5 text-[10px] uppercase tracking-widest">Total {tipo}</td>
                <td className="py-3 px-5 text-right">{totQty.toLocaleString()}</td>
                <td />
                <td className="py-3 px-5 text-right text-accent">${totCost.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ---- Render resumen por empleado ----
  const renderSummary = () => {
    const byEmp: Record<string, any> = {};
    filtered.forEach(r => {
      const k = r.employee_name || `Emp #${r.employee_id}`;
      if (!byEmp[k]) byEmp[k] = { name: k, cam: {} as any, pant: {} as any, total_cost: 0, total_qty: 0 };
      const bucket = r.garment_type === 'Camiseta' ? byEmp[k].cam : byEmp[k].pant;
      if (!bucket[r.task_label]) bucket[r.task_label] = { qty: 0, cost: 0 };
      bucket[r.task_label].qty  += r.garment_count || 0;
      bucket[r.task_label].cost += (r.garment_count || 0) * (r.price_per_unit || 0);
      byEmp[k].total_cost += (r.garment_count || 0) * (r.price_per_unit || 0);
      byEmp[k].total_qty  += r.garment_count || 0;
    });

    return Object.values(byEmp).sort((a: any, b: any) => b.total_cost - a.total_cost).map((emp: any, i) => (
      <Card key={i} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
              <Users size={24} />
            </div>
            <div>
              <p className="font-black text-lg text-foreground-main tracking-tight">{emp.name}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Confección</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl text-accent tracking-tighter">${emp.total_cost.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-foreground-muted">{emp.total_qty} prendas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-custom">
          {Object.keys(emp.cam).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-1.5">
                <Shirt size={12} /> Camiseta
              </p>
              <div className="space-y-2">
                {Object.entries(emp.cam).map(([label, v]: any) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border-custom last:border-0">
                    <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">{label}</span>
                    <div className="text-right">
                      <span className="font-black text-foreground-main text-sm">{v.qty}</span>
                      <span className="text-[10px] text-foreground-muted ml-3">${v.cost.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(emp.pant).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-1.5">
                <Shirt size={12} /> Pantaloneta
              </p>
              <div className="space-y-2">
                {Object.entries(emp.pant).map(([label, v]: any) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border-custom last:border-0">
                    <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">{label}</span>
                    <div className="text-right">
                      <span className="font-black text-foreground-main text-sm">{v.qty}</span>
                      <span className="text-[10px] text-foreground-muted ml-3">${v.cost.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    ));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-black tracking-tighter text-foreground-main">Reporte de Confección</h3>
        <button
          onClick={exportToExcel}
          disabled={isExporting || filtered.length === 0}
          className="bg-surface-hover text-foreground-main border border-border-custom px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:border-accent/40 hover:text-accent transition-all disabled:opacity-40"
        >
          {isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
          Exportar Excel
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total prendas', value: totalQty.toLocaleString() },
          { label: 'Camisetas',     value: camQty.toLocaleString() },
          { label: 'Pantalonetas',  value: pantQty.toLocaleString() },
          { label: 'Costo total',   value: '$' + totalCost.toLocaleString() },
        ].map((m, i) => (
          <div key={i} className="bg-surface-hover rounded-[24px] border border-border-custom p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-2">{m.label}</p>
            <p className="text-2xl font-black text-foreground-main tracking-tighter">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-[28px] border border-border-custom bg-surface/80 backdrop-blur-xl">
        <div className="relative">
          <select
            value={empFilter}
            onChange={e => setEmpFilter(e.target.value)}
            className="appearance-none bg-surface border border-border-custom rounded-2xl pl-5 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-foreground-main outline-none cursor-pointer min-w-[180px]"
          >
            <option value="">Todos los responsables</option>
            {employees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="appearance-none bg-surface border border-border-custom rounded-2xl pl-5 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-foreground-main outline-none cursor-pointer min-w-[160px]"
          >
            <option value="">Ambas prendas</option>
            <option value="Camiseta">Camiseta</option>
            <option value="Pantaloneta">Pantaloneta</option>
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
        </div>

        <div className="relative group flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} />
          <input
            type="text"
            placeholder="Buscar orden..."
            value={orderFilter}
            onChange={e => setOrderFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main text-[10px] font-black uppercase tracking-widest"
          />
        </div>

        <div className="ml-auto px-5 py-3 rounded-2xl bg-accent/10 border border-accent/10 text-accent text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
          {filtered.length} registros
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        {(['detail', 'summary'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border',
              tab === t
                ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                : 'bg-surface-hover text-foreground-muted border-border-custom hover:text-foreground-main'
            )}
          >
            {t === 'detail' ? 'Detalle por tarea' : 'Resumen por responsable'}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'detail' ? (
        <div>
          {renderDetail(filtered.filter(r => r.garment_type === 'Camiseta'), 'Camiseta')}
          {renderDetail(filtered.filter(r => r.garment_type === 'Pantaloneta'), 'Pantaloneta')}
          {filtered.length === 0 && (
            <EmptyState icon={Shirt} title="Sin registros" message="No hay asignaciones de confección para los filtros seleccionados." />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {renderSummary()}
          {filtered.length === 0 && (
            <EmptyState icon={Shirt} title="Sin registros" message="No hay asignaciones de confección para los filtros seleccionados." />
          )}
        </div>
      )}
    </motion.div>
  );
}