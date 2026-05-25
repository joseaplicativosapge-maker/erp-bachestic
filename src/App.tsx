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
import { api } from './api';
import { Order, OrderItem, OrderStatus, Role, User, Client, OrderHistory, Employee, EmployeeReport, ProductionAssignment, Payment, Product, Team } from './types';
import { format, differenceInBusinessDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'sonner';
import QRCode from "react-qr-code";

// Pantallas
import Login from './Login';
import Dashboard from './Dashboard';
import ClientRoadmap from './ClientRoadmap';
import { EmployeeManagement } from './EmployeeManagement';

// Componentes
import UniformDesigner from './components/UniformDesigner';
import Card from './components/Card';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import Modal from './components/Modal';
import { Input } from './components/Input';
import { Select } from './components/Select';

// Utilidades Generales
import { cn } from './lib/utils';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie,
  Cell
} from 'recharts';

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

// ─── Exportar reporte de tiempos ─────────────────────────────────────────────
async function exportTimesReport(orders: Order[]) {
  if (!orders.length) {
    toast.error('No hay órdenes para exportar');
    return;
  }

  toast.info('Generando reporte…');

  const allRows: any[] = [];

  await Promise.all(
    orders.map(async (order) => {
      try {
        const assignments: any[] = await fetch(`/api/orders/${order.id}/assignments`).then((r) => r.json());

        assignments.forEach((a) => {
          const typeMatch = (a.notes || '').match(/^\[(.+?)\]/);
          const garment_type = typeMatch ? typeMatch[1] : '—';
          const task_label = (a.notes || '')
            .replace(/^\[.+?\]\s*/, '')
            .split(' — ')[0]
            .trim() || a.department;

          const durationText =
            a.duration_minutes != null
              ? a.duration_minutes < 60
                ? `${a.duration_minutes}m`
                : `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m`
              : 'En progreso';

          allRows.push({
            order_number:     order.order_number,
            client_name:      order.client_name,
            team_name:        order.team_name || '—',
            status:           order.status,
            employee_name:    a.employee_name || `Emp #${a.employee_id}`,
            department:       a.department,
            garment_type,
            task_label,
            garment_count:    a.garment_count ?? 0,
            started_at:       a.created_at ? new Date(a.created_at).toLocaleString('es-CO') : '—',
            completed_at:     a.completed_at ? new Date(a.completed_at).toLocaleString('es-CO') : '—',
            duration_minutes: a.duration_minutes ?? null,
            duration_text:    durationText,
          });
        });
      } catch (_) {}
    })
  );

  if (!allRows.length) {
    toast.error('Las órdenes seleccionadas no tienen asignaciones registradas');
    return;
  }

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

  const slowStyle = { ...cellStyle, fill: { fgColor: { rgb: 'FEE2E2' } }, font: { color: { rgb: 'B91C1C' }, sz: 10 } };
  const okStyle   = { ...cellStyle, fill: { fgColor: { rgb: 'D1FAE5' } }, font: { color: { rgb: '065F46' }, sz: 10 } };

  const headers = [
    'Orden', 'Cliente', 'Equipo', 'Estado Orden',
    'Responsable', 'Departamento', 'Tipo Prenda', 'Tarea',
    'Cantidad', 'Inicio', 'Fin', 'Duración (min)', 'Duración',
  ];

  const ws: any = {};
  const range = { s: { r: 0, c: 0 }, e: { r: allRows.length, c: headers.length - 1 } };

  headers.forEach((h, ci) => {
    ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = { v: h, t: 's', s: headerStyle };
  });

  allRows.forEach((row, ri) => {
    const values = [
      row.order_number, row.client_name, row.team_name, row.status,
      row.employee_name, row.department, row.garment_type, row.task_label,
      row.garment_count,
      row.started_at, row.completed_at, row.duration_minutes ?? '', row.duration_text,
    ];
    values.forEach((v, ci) => {
      let s = cellStyle;
      if (ci === 11 && row.duration_minutes != null)
        s = row.duration_minutes > 480 ? slowStyle : row.duration_minutes < 240 ? okStyle : cellStyle;
      ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })] = { v, t: typeof v === 'number' ? 'n' : 's', s };
    });
  });

  ws['!ref']  = XLSX.utils.encode_range(range);
  ws['!cols'] = [
    { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 18 },
    { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 22 },
    { wch: 10 },
    { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
  ];
  ws['!rows'] = [{ hpt: 32 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tiempos por Actividad');

  const byEmp: Record<string, { name: string; tasks: number; qty: number; durations: number[] }> = {};
  allRows.forEach((r) => {
    const k = r.employee_name;
    if (!byEmp[k]) byEmp[k] = { name: k, tasks: 0, qty: 0, durations: [] };
    byEmp[k].tasks += 1;
    byEmp[k].qty   += r.garment_count;
    if (r.duration_minutes != null) byEmp[k].durations.push(r.duration_minutes);
  });

  const summaryData = [
    ['Responsable', 'Tareas', 'Prendas', 'Prom. Duración (min)', 'Máx. Duración (min)'],
    ...Object.values(byEmp).map((e) => {
      const avg = e.durations.length
        ? Math.round(e.durations.reduce((a, b) => a + b, 0) / e.durations.length)
        : '';
      const max = e.durations.length ? Math.max(...e.durations) : '';
      return [e.name, e.tasks, e.qty, avg, max];
    }),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 22 }];
  ['A1','B1','C1','D1','E1'].forEach((cell) => {
    if (ws2[cell]) ws2[cell].s = headerStyle;
  });

  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen por Responsable');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Reporte_Tiempos_${dateStr}.xlsx`);
  toast.success('Reporte descargado');
}

// --- Orders List Component ---
function OrdersList({
  orders,
  user,
  onOrderClick,
  onCreateClick,
  canCreate,
  includeInactive,
  onToggleInactive,
  onUpdate,
  onShowRoadmap,
}: {
  orders: Order[];
  user: User;
  onOrderClick: (id: number) => void;
  onCreateClick: () => void;
  canCreate: boolean;
  includeInactive: boolean;
  onToggleInactive: () => void;
  onUpdate: () => void;
  onShowRoadmap: (orderNum: string) => void;
  key?: string;
}) {
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [orderToToggle, setOrderToToggle] = useState<Order | null>(null);
  const [isExportingTimes, setIsExportingTimes] = useState(false);

  const [teamFilter, setTeamFilter] = useState<string>('Todos');
  const [dateField, setDateField] = useState<'created_at' | 'delivery_date'>('delivery_date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 9;

  const availableTeams = [
    'Todos',
    ...Array.from(new Set(orders.filter(o => o.team_name).map(o => o.team_name as string))),
  ];

  const filteredOrders = orders
    .filter(o => {
      const matchesActive = includeInactive ? !o.active : o.active;
      const matchesTeam = teamFilter === 'Todos' || o.team_name === teamFilter;
      const matchesStatus = statusFilter === 'Todos' || o.status === statusFilter;

      const matchesSearch =
        !searchTerm.trim() ||
        o.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesDate = true;

      if (dateFrom || dateTo) {
        const raw = o[dateField];
        if (!raw) {
          matchesDate = false;
        } else {
          const orderDate = new Date(raw).toISOString().split('T')[0];
          if (dateFrom && orderDate < dateFrom) matchesDate = false;
          if (dateTo && orderDate > dateTo) matchesDate = false;
        }
      }

      return matchesActive && matchesTeam && matchesDate && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (a.is_priority && !b.is_priority) return -1;
      if (!a.is_priority && b.is_priority) return 1;
      if (a.is_reposition && !b.is_reposition) return -1;
      if (!a.is_reposition && b.is_reposition) return 1;
      if (a.status === 'Entregado' && b.status !== 'Entregado') return 1;
      if (a.status !== 'Entregado' && b.status === 'Entregado') return -1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [includeInactive, teamFilter, dateField, dateFrom, dateTo, statusFilter, searchTerm]);

  const copyPublicLink = (e: React.MouseEvent, orderNumber: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?order=${orderNumber}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleToggleActive = async () => {
    if (!orderToToggle) return;
    try {
      await api.updateOrder(orderToToggle.id, {
        active: !orderToToggle.active,
        user_name: user.name,
      });
      toast.success(`Pedido ${orderToToggle.active ? 'desactivado' : 'activado'} correctamente`);
      setShowConfirmToggle(false);
      setOrderToToggle(null);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado del pedido');
    }
  };

  const confirmToggleActive = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setOrderToToggle(order);
    setShowConfirmToggle(true);
  };

  const handleExportTimes = async () => {
    setIsExportingTimes(true);
    try {
      await exportTimesReport(filteredOrders);
    } finally {
      setIsExportingTimes(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-black tracking-tighter text-foreground-main">
            Órdenes
          </h3>

          <div className="flex items-center gap-3">
            {user?.role?.trim() === 'Admin' && (
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

          {/* TOGGLE */}
          <div className="flex items-center bg-surface-hover/80 p-1.5 rounded-2xl border border-border-custom shadow-sm">
            <button
              onClick={() => includeInactive && onToggleInactive()}
              className={cn(
                'px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300',
                !includeInactive
                  ? 'bg-accent text-white shadow-xl shadow-accent/20 scale-[1.02]'
                  : 'text-foreground-muted hover:text-foreground-main hover:bg-surface'
              )}
            >
              Activos
            </button>
            <button
              onClick={() => !includeInactive && onToggleInactive()}
              className={cn(
                'px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300',
                includeInactive
                  ? 'bg-accent text-white shadow-xl shadow-accent/20 scale-[1.02]'
                  : 'text-foreground-muted hover:text-foreground-main hover:bg-surface'
              )}
            >
              Desactivados
            </button>
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
                onClick={() => setSearchTerm('')}
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
              {[
                'Todos',
                'Abono confirmado',
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
                'En despacho',
                'Entregado',
              ].map(s => (
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
              onChange={e => setDateField(e.target.value as any)}
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
            {filteredOrders.length}{' '}
            {filteredOrders.length === 1 ? 'orden' : 'órdenes'}
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedOrders.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState
              icon={ShoppingCart}
              title={includeInactive ? 'No hay órdenes inactivas' : 'No hay órdenes activas'}
              message={
                includeInactive
                  ? 'No se han encontrado pedidos en el archivo.'
                  : 'Aún no se han registrado pedidos.'
              }
              actionLabel={!includeInactive && canCreate ? 'Crear Nueva Orden' : undefined}
              onAction={onCreateClick}
            />
          </div>
        ) : (
          paginatedOrders.map(order => (
            <Card
              key={order.id}
              onClick={() => onOrderClick(order.id)}
              noPadding
              className={cn(
                'p-8 transition-all cursor-pointer group relative overflow-hidden',
                !order.active && 'border-accent/20 opacity-40 grayscale-[0.8]'
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
                <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  <Clock size={16} className="text-accent" />
                  <span>
                    Entrega:{' '}
                    <span className="text-foreground-main">
                      {order.delivery_date
                        ? format(new Date(order.delivery_date), 'dd/MM/yyyy')
                        : 'N/A'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  <LayoutDashboard size={16} className="text-accent" />
                  <span>
                    Estado:{' '}
                    <span className="font-black text-foreground-main">{order.status}</span>
                  </span>
                </div>

                {order.team_name && (
                  <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                    <span>
                      Equipo:{' '}
                      <span className="font-black text-foreground-main">{order.team_name}</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  <DollarSign size={16} className="text-accent" />
                  <span>
                    Costura:{' '}
                    <span className="font-black text-foreground-main">
                      {order.total_amount && order.total_amount > 0
                        ? `$${Number(order.total_amount).toLocaleString('es-CO')}`
                        : 'N/A'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-border-custom flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={e => confirmToggleActive(e, order)}
                    className={cn(
                      'p-3 rounded-xl transition-all',
                      order.active
                        ? 'bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent'
                        : 'bg-accent text-white'
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

                  {user.role === 'Admin' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        try {
                          await api.updateOrder(order.id, {
                            is_priority: !order.is_priority,
                            user_name: user.name,
                          });
                          toast.success(
                            order.is_priority ? 'Prioridad eliminada' : 'Orden marcada como prioridad'
                          );
                          onUpdate();
                        } catch (error) {
                          console.error(error);
                          toast.error('Error al cambiar prioridad');
                        }
                      }}
                      className={cn(
                        'p-3 rounded-xl transition-all',
                        order.is_priority
                          ? 'bg-yellow-500 text-white'
                          : 'bg-surface-hover hover:bg-yellow-500/20 text-foreground-muted hover:text-yellow-500'
                      )}
                      title={order.is_priority ? 'Quitar prioridad' : 'Marcar como prioridad'}
                    >
                      <Star size={18} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-5 py-3 rounded-2xl bg-surface border border-border-custom text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Anterior
          </button>

          {Array.from({ length: totalPages }).map((_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-12 h-12 rounded-2xl text-[10px] font-black transition-all',
                  currentPage === page
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-surface border border-border-custom text-foreground-muted hover:text-foreground-main'
                )}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-5 py-3 rounded-2xl bg-surface border border-border-custom text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* MODAL */}
      <Modal
        isOpen={showConfirmToggle}
        onClose={() => setShowConfirmToggle(false)}
        title={orderToToggle?.active ? 'Desactivar Pedido' : 'Activar Pedido'}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <p className="text-sm font-bold text-foreground-muted">
            ¿Estás seguro de que deseas{' '}
            {orderToToggle?.active ? 'desactivar' : 'activar'} el pedido de{' '}
            <span className="font-black text-foreground-main">
              {orderToToggle?.client_name}
            </span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmToggle(false)}
              className="px-6 py-3 rounded-2xl border border-border-custom text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleToggleActive}
              className="px-6 py-3 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-105 transition-all"
            >
              {orderToToggle?.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

// --- Create Order Component ---
function NewTeamInline({ 
  clientId, 
  onSelected 
}: { 
  clientId?: number;           // undefined = cliente nuevo
  onSelected: (team: { id?: number; name: string }) => void;
}) {
  const [mode, setMode] = useState<'idle' | 'selecting' | 'creating'>('idle');
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  // Si hay clientId, cargar sus equipos al abrir
  const handleOpen = async () => {
    if (clientId) {
      setLoading(true);
      try {
        const teams = await api.getClientTeams(clientId);
        const active = teams.filter((t: Team) => t.active);
        setExistingTeams(active);
        setMode(active.length > 0 ? 'selecting' : 'creating');
      } catch {
        setMode('creating');
      } finally {
        setLoading(false);
      }
    } else {
      setMode('creating');
    }
  };

  if (mode === 'idle') {
    return (
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-6 h-[52px] rounded-[20px] border-2 border-dashed border-accent/30 text-accent hover:bg-accent/5 transition-all disabled:opacity-50"
      >
        {loading ? <Clock size={14} className="animate-spin" /> : <Plus size={14} />}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {clientId ? 'Seleccionar o crear equipo' : 'Crear equipo para este cliente'}
        </span>
      </button>
    );
  }

  if (mode === 'selecting' && existingTeams.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
          Equipos existentes del cliente
        </p>
        <div className="bg-surface-hover rounded-[20px] border border-border-custom overflow-hidden divide-y divide-border-custom">
          {existingTeams.map(team => (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelected({ id: team.id, name: team.name })}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                  <Users size={13} />
                </div>
                <span className="font-black text-sm text-foreground-main uppercase tracking-wide group-hover:text-accent transition-colors">
                  {team.name}
                </span>
              </div>
              <ChevronRight size={14} className="text-foreground-muted group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMode('creating')}
          className="w-full flex items-center justify-center gap-2 px-5 h-[44px] rounded-[18px] border border-dashed border-accent/30 text-accent hover:bg-accent/5 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Plus size={12} /> Crear nuevo equipo
        </button>
        <button
          type="button"
          onClick={() => setMode('idle')}
          className="w-full text-[9px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-colors py-1"
        >
          Cancelar
        </button>
      </div>
    );
  }

  // mode === 'creating'
  return (
    <div className="space-y-3">
      {existingTeams.length > 0 && (
        <button
          type="button"
          onClick={() => setMode('selecting')}
          className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent/70 transition-colors flex items-center gap-1"
        >
          ← Ver equipos existentes
        </button>
      )}
      <div className="flex items-center gap-3">
        <input
          type="text"
          autoFocus
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (teamName.trim()) {
                onSelected({ name: teamName.trim() });
                setMode('idle');
                setTeamName('');
              }
            }
          }}
          placeholder="Nombre del equipo..."
          className="flex-1 px-5 py-3 rounded-2xl bg-surface border border-accent/40 focus:border-accent outline-none text-foreground-main font-bold text-sm transition-all"
        />
        <button
          type="button"
          disabled={!teamName.trim()}
          onClick={() => {
            if (teamName.trim()) {
              onSelected({ name: teamName.trim() });
              setMode('idle');
              setTeamName('');
            }
          }}
          className="px-5 py-3 rounded-2xl bg-accent text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:scale-105 transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
        >
          <CheckCircle2 size={14} /> Agregar
        </button>
        <button
          type="button"
          onClick={() => { setMode('idle'); setTeamName(''); }}
          className="px-4 py-3 rounded-2xl border border-border-custom text-foreground-muted hover:bg-surface-hover text-[10px] font-black uppercase tracking-widest transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CreateOrder({ onCancel, onSuccess, user }: { onCancel: () => void, onSuccess: () => void, user: User, key?: string }) {
  const getBusinessDaysFromNow = (days: number) => {
    let date = new Date();
    let count = 0;
    while (count < days) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) count++;
    }
    return date.toISOString().split('T')[0];
  };

  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTeams, setClientTeams] = useState<Team[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<{ id?: number; name: string } | null>(null);
  const [newTeamName, setNewTeamName] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // ── Filtro y paginación de productos ──
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 6;

  const [formData, setFormData] = useState({
    client_id: undefined as number | undefined,
    team_id: undefined as number | undefined,
    client_name: '',
    client_doc: '',
    client_doc_type: 'CC',
    client_phone: '',
    client_address: '',
    client_city: '',
    contact_method: 'WhatsApp',
    delivery_date: getBusinessDaysFromNow(15),
    total_amount: 0,
  });

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api.getProducts();
        setProducts(data);
        const initialQuants: Record<string, number> = {};
        data.forEach(p => { initialQuants[p.name] = 0; });
        setQuantities(initialQuants);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  const [items, setItems] = useState<Partial<OrderItem>[]>([]);
  const [advancePercent, setAdvancePercent] = useState(50);

  const groupedItems = items.reduce((acc, item) => {
    const key = item.garment_type || 'Camiseta';
    if (!acc[key]) acc[key] = { garment_type: key, quantity: 0, sale_price: item.sale_price || 0 };
    acc[key].quantity += 1;
    return acc;
  }, {} as Record<string, { garment_type: string; quantity: number; sale_price: number }>);

  const groupedList = Object.values(groupedItems);

  useEffect(() => {
    if (step === 2) {
      const total = Object.entries(quantities).reduce((sum, [name, qty]) => {
        const product = products.find(p => p.name === name);
        return sum + ((qty as number) * (product?.sale_price || 0));
      }, 0);
      setFormData(prev => ({ ...prev, total_amount: total }));
    }
  }, [quantities, products, step]);

  useEffect(() => {
      const camisetaKeys = ['price_filetes', 'price_despuntes', 'price_collarin', 'price_dobladillo_remate'];
      const pantalonetaKeys = ['price_filete_p', 'price_despuntes_p', 'price_caucho', 'price_sentar_caucho', 'price_collarin_p', 'price_remate'];
      const allKeys = [...camisetaKeys, ...pantalonetaKeys];

      let total = 0;

      Object.entries(quantities).forEach(([name, qty]) => {
        if (!(qty as number)) return;
        const product = products.find(p => p.name === name) as any;
        if (!product) return;

        const costoConfeccion = allKeys.reduce((s, key) => s + (product[key] || 0), 0);

        if (costoConfeccion > 0) {
          // Tiene precios de confección configurados → usar esos
          total += costoConfeccion * (qty as number);
        } else {
          // Fallback: usar sale_price si existe
          total += (product.sale_price || 0) * (qty as number);
        }
      });

      setFormData(prev => ({ ...prev, total_amount: total }));
    }, [quantities, products]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (clientSearch.length > 2) {
        try {
          const results = await api.searchClients(clientSearch);
          setSearchResults(results);
        } catch (error) { console.error(error); }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [clientSearch]);

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    try {
      const teams = await api.getClientTeams(client.id);
      setClientTeams(teams.filter(t => t.active));
    } catch (error) { console.error('Error fetching client teams:', error); }
    setFormData({
      ...formData,
      client_id: client.id,
      team_id: undefined,
      client_name: client.name,
      client_doc: client.doc,
      client_doc_type: client.doc_type || 'CC',
      client_phone: client.phone,
      client_address: client.address,
      client_city: client.city
    });
    setClientSearch('');
    setSearchResults([]);
    setIsCreatingClient(false);
    setNewTeamName(null);
  };

  const generateItems = () => {
    const newItems: Partial<OrderItem>[] = [];
    Object.entries(quantities).forEach(([name, qty]) => {
      const product = products.find(p => p.name === name);
      for (let i = 0; i < (qty as number); i++) {
        newItems.push({
          garment_type: name, item_name: '', player_name: '', number: '',
          size: '', sleeve: '', design_type: '', fit: '', observations: '',
          sewing_price: product?.sewing_cost || 0, sale_price: product?.sale_price || 0
        });
      }
    });
    setItems(newItems);
    setStep(2);
  };

  const [showReceipt, setShowReceipt] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);

  const handleSubmit = async () => {
    try {
      let finalClientId = formData.client_id;
      let finalTeamId = formData.team_id;

      // ── CALCULAR total_amount en el momento del submit ──
      const camisetaKeys = ['price_filetes', 'price_despuntes', 'price_collarin', 'price_dobladillo_remate'];
      const pantalonetaKeys = ['price_filete_p', 'price_despuntes_p', 'price_caucho', 'price_sentar_caucho', 'price_collarin_p', 'price_remate'];
      const allKeys = [...camisetaKeys, ...pantalonetaKeys];

      let computedTotal = 0;
      Object.entries(quantities).forEach(([name, qty]) => {
        if (!(qty as number)) return;
        const product = products.find(p => p.name === name) as any;
        if (!product) return;
        const costoConfeccion = allKeys.reduce((s, key) => s + (product[key] || 0), 0);
        if (costoConfeccion > 0) {
          computedTotal += costoConfeccion * (qty as number);
        } else {
          computedTotal += (product.sale_price || 0) * (qty as number);
        }
      });

      if (isCreatingClient) {
        const newClient = await api.createClient({
          name: formData.client_name,
          doc: formData.client_doc,
          doc_type: formData.client_doc_type,
          phone: formData.client_phone,
          address: formData.client_address,
          city: formData.client_city
        });
        finalClientId = newClient.id;

        if (selectedTeam && finalClientId) {
          try {
            const newTeam = await api.createClientTeam(finalClientId, { name: selectedTeam.name });
            finalTeamId = newTeam.id;
          } catch (err) {
            console.error('Error creando equipo:', err);
          }
        }
      } else {
        if (selectedTeam) {
          if (selectedTeam.id) {
            finalTeamId = selectedTeam.id;
          } else if (finalClientId) {
            try {
              const newTeam = await api.createClientTeam(finalClientId, { name: selectedTeam.name });
              finalTeamId = newTeam.id;
            } catch (err) {
              console.error('Error creando equipo:', err);
            }
          }
        }
      }
      const { id } = await api.createOrder({
        ...formData,
        total_amount: computedTotal,
        status: 'Abono confirmado',
        client_id: finalClientId,
        team_id: finalTeamId,
        user_name: user.name
      });

      await api.addItems(id, items);
      toast.success('Orden creada correctamente');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear la orden');
    }
  };

  if (showReceipt && createdOrder && createdPayment) {
    return (
      <ReceiptModal
        order={createdOrder}
        payment={createdPayment}
        onClose={() => { setShowReceipt(false); onSuccess(); }}
      />
    );
  }

  const teamsToShow = clientTeams;

  // ── Productos filtrados y paginados ──
  const filteredProductKeys = Object.keys(quantities).filter(name => {
    const product = products.find(p => p.name === name);
    const code = (product as any)?.code || '';
    return (
      name.toLowerCase().includes(productSearch.toLowerCase()) ||
      code.toLowerCase().includes(productSearch.toLowerCase())
    );
  });
  const totalProductPages = Math.ceil(filteredProductKeys.length / PRODUCTS_PER_PAGE);
  const paginatedProductKeys = filteredProductKeys.slice(
    (productPage - 1) * PRODUCTS_PER_PAGE,
    productPage * PRODUCTS_PER_PAGE
  );

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Nueva Orden de Producción"
      subtitle={`Paso ${step} de 2: ${step === 1 ? 'Información y Cantidades' : 'Detalle y Pago'}`}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-8">
        {step === 1 ? (
          <div className="space-y-8">
            {!selectedClient && !isCreatingClient ? (
              <div className="space-y-6">
                <div className="relative">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-3 block">
                    Buscar Cliente Existente
                  </label>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-foreground-muted" size={20} />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 rounded-[24px] bg-surface border border-border-custom focus:border-accent/50 focus:ring-4 focus:ring-accent/10 outline-none text-foreground-main transition-all placeholder:text-foreground-muted/30"
                      placeholder="Nombre o Documento del cliente..."
                    />
                    {clientSearch && (
                      <button onClick={() => setClientSearch('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-accent transition-colors">
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    {!clientSearch.trim() && (
                      <div className="w-full flex items-center gap-4 px-6 h-[60px] bg-surface-hover rounded-[24px] border border-border-custom">
                        <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                          <Search size={16} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                          Escribe el <span className="text-foreground-main">nombre o documento</span> del cliente para buscar
                        </p>
                      </div>
                    )}

                    {clientSearch.trim() && clientSearch.length <= 2 && (
                      <div className="w-full flex items-center gap-4 px-6 h-[60px] bg-surface-hover rounded-[24px] border border-border-custom">
                        <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0">
                          <Search size={16} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                          Escribe al menos <span className="text-foreground-main">3 caracteres</span> para buscar...
                        </p>
                      </div>
                    )}

                    {clientSearch.length > 2 && searchResults.length > 0 && (
                      <div className="w-full bg-surface-hover border border-border-custom rounded-[24px] overflow-hidden">
                        <div className="px-6 h-[40px] flex items-center border-b border-border-custom">
                          <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-border-custom">
                          {searchResults.map(client => (
                            <button
                              key={client.id}
                              onClick={() => handleSelectClient(client)}
                              className="w-full px-6 h-[60px] text-left hover:bg-accent/10 flex items-center justify-between transition-colors group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition-all">
                                  <Contact size={16} />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-foreground-main group-hover:text-accent transition-colors leading-tight">{client.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded uppercase tracking-widest">{client.doc_type || 'CC'}</span>
                                    <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest">{client.doc} • {client.phone}</p>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight size={14} className="text-foreground-muted group-hover:text-accent transition-colors shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {clientSearch.length > 2 && searchResults.length === 0 && (
                      <div className="w-full space-y-3">
                        <div className="w-full flex items-center gap-4 px-6 h-[60px] bg-surface-hover rounded-[24px] border border-border-custom">
                          <div className="w-8 h-8 bg-foreground-muted/10 rounded-xl flex items-center justify-center text-foreground-muted shrink-0">
                            <Search size={16} />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                            Sin resultados para "<span className="text-accent">{clientSearch}</span>"
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsCreatingClient(true);
                            const isDoc = /^[\d\-]+$/.test(clientSearch.trim());
                            setFormData({
                              ...formData,
                              client_name: isDoc ? '' : clientSearch,
                              client_doc: isDoc ? clientSearch : '',
                            });
                          }}
                          className="w-full flex items-center justify-center gap-3 px-6 h-[60px] rounded-[24px] border-2 border-dashed border-accent/40 text-accent hover:bg-accent/5 transition-all"
                        >
                          <Plus size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Crear nuevo cliente "{clientSearch}"
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* HEADER CLIENTE */}
                <div className="flex justify-between items-center bg-accent/5 p-6 rounded-[24px] border border-accent/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                      <Contact size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">
                        {isCreatingClient ? 'Nuevo Cliente' : 'Cliente Seleccionado'}
                      </p>
                      <p className="font-black text-lg text-foreground-main tracking-tight">
                        {formData.client_name || 'Completar datos abajo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {!isCreatingClient && (
                      teamsToShow.length > 0 ? (
                        <div className="w-48">
                          <Select
                            label="Equipo"
                            value={formData.team_id?.toString() || ''}
                            onChange={e => setFormData({...formData, team_id: e.target.value ? Number(e.target.value) : undefined})}
                            options={[
                              { value: '', label: 'Sin Equipo' },
                              ...teamsToShow.map(t => ({ value: t.id.toString(), label: t.name }))
                            ]}
                          />
                        </div>
                      ) : (
                        <div className="w-56">
                          {newTeamName ? (
                            <div className="flex items-center justify-between px-4 py-2 bg-accent/10 border border-accent/20 rounded-2xl">
                              <div className="flex items-center gap-2">
                                <Users size={13} className="text-accent" />
                                <p className="font-black text-sm text-foreground-main uppercase tracking-wide">{newTeamName}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setNewTeamName(null); setSelectedTeam(null); }}
                                className="text-foreground-muted hover:text-accent transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <NewTeamInline
                              clientId={formData.client_id}
                              onSelected={(team) => {
                                setSelectedTeam(team);
                                setNewTeamName(team.name);
                                if (team.id) setFormData(prev => ({ ...prev, team_id: team.id }));
                              }}
                            />
                          )}
                        </div>
                      )
                    )}
                    <button
                      onClick={() => {
                        setSelectedClient(null);
                        setClientTeams([]);
                        setIsCreatingClient(false);
                        setNewTeamName(null);
                        setFormData({
                          ...formData,
                          client_id: undefined,
                          team_id: undefined,
                          client_name: '',
                          client_doc: '',
                          client_phone: '',
                          client_address: '',
                          client_city: ''
                        });
                      }}
                      className="text-[10px] font-black text-accent uppercase tracking-widest hover:text-accent/70 transition-colors"
                    >
                      {isCreatingClient ? 'Cancelar' : 'Cambiar Cliente'}
                    </button>
                  </div>
                </div>

                {/* FORMULARIO CLIENTE NUEVO */}
                {isCreatingClient && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input
                      label="Nombre Completo"
                      value={formData.client_name}
                      onChange={e => setFormData({...formData, client_name: e.target.value})}
                      placeholder="Ej. Juan Pérez"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <Select
                          label="Tipo Doc."
                          value={formData.client_doc_type}
                          onChange={e => setFormData({...formData, client_doc_type: e.target.value})}
                          options={[
                            { value: 'CC', label: 'Cédula de Ciudadanía' },
                            { value: 'TI', label: 'Tarjeta de Identidad' },
                            { value: 'CE', label: 'Cédula de Extranjería' },
                            { value: 'NIT', label: 'NIT' },
                            { value: 'RUT', label: 'RUT' },
                            { value: 'PAS', label: 'Pasaporte' },
                            { value: 'PEP', label: 'Permiso Especial de Permanencia (PEP)' },
                            { value: 'PPT', label: 'Permiso por Protección Temporal (PPT)' },
                            { value: 'RC', label: 'Registro Civil' },
                            { value: 'NUIP', label: 'Número Único de Identificación Personal (NUIP)' },
                            { value: 'CD', label: 'Carné Diplomático' },
                            { value: 'SC', label: 'Salvoconducto' }
                          ]}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          label="Documento"
                          value={formData.client_doc}
                          onChange={e => setFormData({...formData, client_doc: e.target.value})}
                        />
                      </div>
                    </div>
                    <Input
                      label="Teléfono"
                      value={formData.client_phone}
                      onChange={e => setFormData({...formData, client_phone: e.target.value})}
                    />
                    <Input
                      label="Ciudad"
                      value={formData.client_city}
                      onChange={e => setFormData({...formData, client_city: e.target.value})}
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Dirección de Envío"
                        value={formData.client_address}
                        onChange={e => setFormData({...formData, client_address: e.target.value})}
                      />
                    </div>

                    {/* EQUIPO OPCIONAL */}
                    <div className="md:col-span-2 pt-4 border-t border-border-custom space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted flex items-center gap-2">
                        <Users size={13} className="text-accent" /> Equipo (opcional)
                      </p>
                      {newTeamName ? (
                        <div className="flex items-center justify-between px-5 py-3 bg-accent/10 border border-accent/20 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-accent/20 rounded-xl flex items-center justify-center">
                              <Users size={14} className="text-accent" />
                            </div>
                            <p className="font-black text-sm text-foreground-main uppercase tracking-wide">{newTeamName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setNewTeamName(null); setSelectedTeam(null); }}
                            className="text-foreground-muted hover:text-accent transition-colors p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <NewTeamInline
                          onSelected={(team) => {
                            setSelectedTeam(team);
                            setNewTeamName(team.name);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* CANTIDADES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border-custom">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-2">Cantidades por Prenda</h4>

                    {/* Buscador de productos */}
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); setProductPage(1); }}
                        placeholder="Filtrar por nombre o código..."
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main text-sm placeholder:text-foreground-muted/30 transition-all"
                      />
                      {productSearch && (
                        <button
                          onClick={() => { setProductSearch(''); setProductPage(1); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-accent transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Grid de productos paginados */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {paginatedProductKeys.map(type => {
                        const product = products.find(p => p.name === type) as any;
                        const code = product?.code || '';
                        return (
                          <div
                            key={type}
                            className={cn(
                              "bg-surface-hover p-4 rounded-2xl border transition-all space-y-3",
                              quantities[type] > 0
                                ? "border-accent/30 bg-accent/5"
                                : "border-border-custom"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-foreground-main leading-tight">{type}</p>
                                {code && (
                                  <p className="text-[9px] font-black uppercase tracking-widest text-accent mt-0.5">{code}</p>
                                )}
                              </div>
                              {quantities[type] > 0 && (
                                <span className="shrink-0 text-[9px] font-black bg-accent text-white px-2 py-0.5 rounded-full">
                                  {quantities[type]}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 justify-end">
                              <button
                                onClick={() => setQuantities(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }))}
                                className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-foreground-muted hover:text-accent transition-colors border border-border-custom font-black"
                              >−</button>
                              <span className="w-8 text-center font-black text-foreground-main">{quantities[type]}</span>
                              <button
                                onClick={() => setQuantities(prev => ({ ...prev, [type]: prev[type] + 1 }))}
                                className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-foreground-muted hover:text-accent transition-colors border border-border-custom font-black"
                              >+</button>
                            </div>
                          </div>
                        );
                      })}

                      {paginatedProductKeys.length === 0 && (
                        <div className="col-span-2 text-center py-10 bg-surface-hover rounded-2xl border border-dashed border-border-custom">
                          <Search size={28} className="mx-auto text-foreground-muted/20 mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted/50">
                            Sin resultados para "{productSearch}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Paginación */}
                    {totalProductPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => setProductPage(p => Math.max(1, p - 1))}
                          disabled={productPage === 1}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border-custom text-foreground-muted hover:text-foreground-main hover:border-accent/40 disabled:opacity-30 transition-all"
                        >
                          ← Ant.
                        </button>
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                          Pág. {productPage} / {totalProductPages}
                          <span className="text-foreground-muted/50 ml-2">({filteredProductKeys.length} productos)</span>
                        </span>
                        <button
                          onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
                          disabled={productPage === totalProductPages}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border-custom text-foreground-muted hover:text-foreground-main hover:border-accent/40 disabled:opacity-30 transition-all"
                        >
                          Sig. →
                        </button>
                      </div>
                    )}

                    {/* Resumen de seleccionados */}
                    {Object.values(quantities).some(q => (q as number) > 0) && (
                      <div className="pt-4 border-t border-border-custom space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Seleccionados</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(quantities)
                            .filter(([_, qty]) => (qty as number) > 0)
                            .map(([name, qty]) => {
                              const product = products.find(p => p.name === name) as any;
                              return (
                                <div key={name} className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
                                  <span className="text-[10px] font-black text-foreground-main">{name}</span>
                                  {product?.code && (
                                    <span className="text-[9px] font-black text-accent">{product.code}</span>
                                  )}
                                  <span className="text-[10px] font-black text-white bg-accent rounded-full w-5 h-5 flex items-center justify-center">{qty}</span>
                                </div>
                              );
                            })
                          }
                        </div>
                      </div>
                    )}

                    {/* COSTOS EN TIEMPO REAL */}
                    {Object.values(quantities).some(q => (q as number) > 0) && (() => {
                      const camisetaTasks = [
                        { label: 'Filetes', key: 'price_filetes' },
                        { label: 'Despuntes', key: 'price_despuntes' },
                        { label: 'Collarín', key: 'price_collarin' },
                        { label: 'Dobladillo y Remate', key: 'price_dobladillo_remate' },
                      ];
                      const pantalonetaTasks = [
                        { label: 'Filete', key: 'price_filete_p' },
                        { label: 'Despuntes', key: 'price_despuntes_p' },
                        { label: 'Caucho', key: 'price_caucho' },
                        { label: 'Sentar Caucho', key: 'price_sentar_caucho' },
                        { label: 'Collarín', key: 'price_collarin_p' },
                        { label: 'Remate', key: 'price_remate' },
                      ];

                      const bloques = Object.entries(quantities)
                        .filter(([_, qty]) => (qty as number) > 0)
                        .map(([productName, qty]) => {
                          const product = products.find(p => p.name === productName) as any;
                          if (!product) return null;
                          const camActivas = camisetaTasks.filter(t => (product[t.key] || 0) > 0);
                          const pantActivas = pantalonetaTasks.filter(t => (product[t.key] || 0) > 0);
                          if (camActivas.length === 0 && pantActivas.length === 0) return null;
                          return {
                            label: productName, qty: qty as number, product, camActivas, pantActivas,
                            totalCam: camActivas.reduce((s, t) => s + (product[t.key] || 0) * (qty as number), 0),
                            totalPant: pantActivas.reduce((s, t) => s + (product[t.key] || 0) * (qty as number), 0),
                          };
                        }).filter(Boolean) as any[];

                      if (bloques.length === 0) return null;
                      const grandTotal = bloques.reduce((t, b) => t + b.totalCam + b.totalPant, 0);

                      return (
                        <div className="mt-2 border border-border-custom rounded-[24px] overflow-hidden">
                          <div className="px-6 py-4 bg-surface-hover border-b border-border-custom flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted flex items-center gap-2">
                              <Calculator size={13} className="text-accent" /> Costos de Confección
                            </p>
                            <p className="text-[10px] font-black text-accent">Total: ${grandTotal.toLocaleString()}</p>
                          </div>
                          {bloques.map((bloque: any) => (
                            <div key={bloque.label} className="border-b border-border-custom last:border-0">
                              <div className="px-6 py-3 bg-foreground-main/[0.03] flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-main flex items-center gap-2">
                                  <Shirt size={12} className="text-accent" />
                                  {bloque.label} — {bloque.qty} uds
                                </p>
                                <p className="text-[10px] font-black text-foreground-muted">${(bloque.totalCam + bloque.totalPant).toLocaleString()}</p>
                              </div>
                              {bloque.camActivas.length > 0 && (
                                <>
                                  <div className="px-6 py-2 bg-blue-500/5 border-t border-border-custom/60 flex items-center gap-2">
                                    <Shirt size={10} className="text-blue-400" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Camiseta — ${bloque.totalCam.toLocaleString()}</p>
                                  </div>
                                  {bloque.camActivas.map(({ label, key }: any) => {
                                    const unitPrice = bloque.product[key] || 0;
                                    return (
                                      <div key={key} className="flex items-center justify-between px-6 py-2 border-t border-border-custom/30 hover:bg-surface-hover/50 transition-colors">
                                        <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest pl-4">{label}</span>
                                        <div className="flex items-center gap-6 text-[10px]">
                                          <span className="text-foreground-muted/60">${unitPrice.toLocaleString()} × {bloque.qty}</span>
                                          <span className="font-black w-20 text-right text-foreground-main">${(unitPrice * bloque.qty).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                              {bloque.pantActivas.length > 0 && (
                                <>
                                  <div className="px-6 py-2 bg-purple-500/5 border-t border-border-custom/60 flex items-center gap-2">
                                    <Shirt size={10} className="text-purple-400" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-400">Pantaloneta — ${bloque.totalPant.toLocaleString()}</p>
                                  </div>
                                  {bloque.pantActivas.map(({ label, key }: any) => {
                                    const unitPrice = bloque.product[key] || 0;
                                    return (
                                      <div key={key} className="flex items-center justify-between px-6 py-2 border-t border-border-custom/30 hover:bg-surface-hover/50 transition-colors">
                                        <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest pl-4">{label}</span>
                                        <div className="flex items-center gap-6 text-[10px]">
                                          <span className="text-foreground-muted/60">${unitPrice.toLocaleString()} × {bloque.qty}</span>
                                          <span className="font-black w-20 text-right text-foreground-main">${(unitPrice * bloque.qty).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Input
                        label="Fecha Estimada Entrega"
                        type="date"
                        value={formData.delivery_date}
                        onChange={e => setFormData({...formData, delivery_date: e.target.value})}
                        className="[color-scheme:dark]"
                      />
                      <div className="flex items-end gap-4">
                        <div className="flex-1">
                          <Input
                            label="Costo de Confección"
                            type="number"
                            value={formData.total_amount}
                            onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})}
                            className="font-black text-xl tracking-tighter"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-accent/5 p-6 rounded-[24px] border border-accent/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                  <Contact size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Cliente</p>
                  <p className="font-black text-lg text-foreground-main tracking-tight">{formData.client_name}</p>
                  {(formData.team_id || newTeamName) && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-accent mt-0.5 flex items-center gap-1">
                      <Users size={10} />
                      {newTeamName || teamsToShow.find(t => t.id === formData.team_id)?.name}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedClient(null);
                  setIsCreatingClient(false);
                  setNewTeamName(null);
                  setFormData({...formData, client_id: undefined, client_name: '', client_doc: '', client_phone: '', client_address: '', client_city: ''});
                }}
                className="text-[10px] font-black text-accent uppercase tracking-widest hover:text-accent/70 transition-colors"
              >
                Cambiar Cliente
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-6">
                <h4 className="font-black text-xl tracking-tight text-foreground-main uppercase">Listado de Uniformes</h4>
                <div className="overflow-x-auto border border-border-custom rounded-[32px] bg-surface-hover">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-hover text-[9px] uppercase font-black tracking-[0.2em] text-foreground-muted">
                        <th className="py-5 px-6">Prenda</th>
                        <th className="py-5 px-6">Código</th>
                        <th className="py-5 px-6 text-center">Cant.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {groupedList.map((group, idx) => {
                        const product = products.find(p => p.name === group.garment_type) as any;
                        return (
                          <tr key={idx} className="hover:bg-surface-hover transition-colors">
                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className="text-foreground-muted font-bold text-[10px] uppercase">{group.garment_type}</span>
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className="text-accent font-black text-[10px] uppercase tracking-widest">{product?.code || '—'}</span>
                            </td>
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <span className="font-black text-foreground-main text-[10px]">{group.quantity}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-border-custom">
          <button
            onClick={step === 1 ? onCancel : () => setStep(step - 1)}
            className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-colors"
          >
            {step === 1 ? 'Cancelar' : 'Volver'}
          </button>
          <button
            onClick={step === 1 ? generateItems : handleSubmit}
            disabled={
              step === 1 && (
                (!selectedClient && !isCreatingClient) ||
                Object.values(quantities).every(q => (q as number) === 0)
              )
            }
            className="bg-accent text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
          >
            {step === 2 ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Edit Order Modal Component ---
function EditOrderModal({ order, items: initialItems, onCancel, onSuccess, user }: { order: Order, items: OrderItem[], onCancel: () => void, onSuccess: () => void, user: User }) {
  const [formData, setFormData] = useState({
    client_name: order.client_name,
    client_doc: order.client_doc,
    client_doc_type: order.client_doc_type || 'CC',
    client_phone: order.client_phone,
    client_address: order.client_address,
    client_city: order.client_city,
    delivery_date: order.delivery_date,
    total_amount: order.total_amount,
    status: order.status
  });
  const [items, setItems] = useState<Partial<OrderItem>[]>(initialItems);

  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.sale_price || 0), 0);
    setFormData(prev => ({ ...prev, total_amount: total }));
  }, [items]);

  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const SIZES = ['2','4','6','8','10','12','14','16','S','M','L','XL','XXL'];

  const handleSubmit = async () => {
    try {
      await api.updateOrder(order.id, { ...formData, user_name: user.name });
      await api.addItems(order.id, items);
      
      if (referenceFiles.length > 0) {
        const refsFormData = new FormData();
        referenceFiles.forEach(file => refsFormData.append('references', file));
        await api.uploadReferences(order.id, refsFormData, user.name);
      }
      
      toast.success('Orden actualizada correctamente');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar la orden');
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onCancel} 
      title={`Editar Orden #${order.id}`}
      subtitle="Modifica los detalles de la orden"
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Input 
            label="Nombre Cliente"
            value={formData.client_name}
            onChange={e => setFormData({...formData, client_name: e.target.value})}
          />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Select
                label="Tipo"
                value={formData.client_doc_type}
                onChange={e => setFormData({...formData, client_doc_type: e.target.value})}
                options={[
                  { value: 'CC', label: 'CC' },
                  { value: 'NIT', label: 'NIT' },
                  { value: 'CE', label: 'CE' },
                  { value: 'TI', label: 'TI' },
                  { value: 'Pasaporte', label: 'Pasaporte' }
                ]}
              />
            </div>
            <div className="col-span-2">
              <Input label="Documento"
                value={formData.client_doc}
                onChange={e => setFormData({...formData, client_doc: e.target.value})}
              />
            </div>
          </div>
          <Input 
            label="Teléfono"
            value={formData.client_phone}
            onChange={e => setFormData({...formData, client_phone: e.target.value})}
          />
          <Input 
            label="Ciudad"
            value={formData.client_city}
            onChange={e => setFormData({...formData, client_city: e.target.value})}
          />
          <div className="md:col-span-2">
            <Input 
              label="Dirección"
              value={formData.client_address}
              onChange={e => setFormData({...formData, client_address: e.target.value})}
            />
          </div>
          <Input 
            label="Fecha Entrega"
            type="date"
            value={formData.delivery_date}
            onChange={e => setFormData({...formData, delivery_date: e.target.value})}
            className="[color-scheme:dark]"
          />
          <Input 
            label="Total"
            type="number"
            value={formData.total_amount}
            onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})}
            readOnly
          />
          <div className="md:col-span-2">
            <Select 
              label="Estado"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as OrderStatus})}
              options={[
                { value: 'Abono confirmado', label: 'Abono confirmado' },
                { value: 'En diseño', label: 'En diseño' },
                { value: 'Versión enviada', label: 'Versión enviada' },
                { value: 'Corrección solicitada', label: 'Corrección solicitada' },
                { value: 'Diseño aprobado', label: 'Diseño aprobado' },
                { value: 'En cuadro', label: 'En cuadro' },
                { value: 'En montaje', label: 'En montaje' },
                { value: 'En impresión', label: 'En impresión' },
                { value: 'En sublimación', label: 'En sublimación' },
                { value: 'En corte', label: 'En corte' },
                { value: 'En confección', label: 'En confección' },
                { value: 'En empaque', label: 'En empaque' },
                { value: 'En despacho', label: 'En despacho' },
                { value: 'Entregado', label: 'Entregado' },
              ]}
            />
          </div>
        </div>

        <div className="space-y-6">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            <div>
              <h4 className="font-black text-2xl tracking-tight text-foreground-main">
                Uniformes
              </h4>
            </div>

            <button
              onClick={() =>
                setItems([
                  ...items,
                  {
                    item_name: '',
                    player_name: '',
                    number: '',
                    size: '',
                    sleeve: '',
                    design_type: '',
                    fit: '',
                    garment_type: 'Camiseta',
                    observations: '',
                    sewing_price: 0,
                    sale_price: 0
                  }
                ])
              }
              className="h-12 px-6 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-[0.25em] hover:scale-[1.03] transition-all shadow-xl shadow-accent/20"
            >
              + Agregar
            </button>
          </div>

          {/* TABLE CARD */}
          <div className="overflow-hidden rounded-[32px] border border-border-custom bg-surface shadow-2xl shadow-black/5">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px]">

                {/* HEAD */}
                <thead className="bg-surface-hover border-b border-border-custom">

                  <tr className="text-[9px] uppercase font-black tracking-[0.25em] text-foreground-muted">

                    <th className="py-5 px-5 text-left">
                      Jugador
                    </th>

                    <th className="py-5 px-4 text-center">
                      Número
                    </th>

                    <th className="py-5 px-4 text-center">
                      Talla
                    </th>

                    <th className="py-5 px-4 text-center">
                      Manga
                    </th>

                    <th className="py-5 px-4 text-center">
                      Tipo
                    </th>

                    <th className="py-5 px-4 text-center">
                      Horma
                    </th>

                    <th className="py-5 px-5 text-left">
                      Observaciones
                    </th>

                    <th className="py-5 px-5 text-right">
                      Acción
                    </th>
                  </tr>
                </thead>

                {/* BODY */}
                <tbody className="divide-y divide-border-custom">

                  {items.map((item, idx) => (

                    <tr
                      key={idx}
                      className="group hover:bg-surface-hover/60 transition-all"
                    >

                      {/* NOMBRE */}
                      <td className="py-4 px-5">

                        <input
                          type="text"
                          value={item.player_name || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].player_name = e.target.value;
                            setItems(newItems);
                          }}
                          className="w-full h-11 rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background px-4 outline-none font-bold text-sm text-foreground-main transition-all"
                          placeholder="Nombre del jugador"
                        />
                      </td>

                      {/* NUMERO */}
                      <td className="py-4 px-4">

                        <input
                          type="text"
                          value={item.number || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].number = e.target.value;
                            setItems(newItems);
                          }}
                          className="w-16 h-11 mx-auto rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none text-center font-black text-foreground-main transition-all"
                          placeholder="00"
                        />
                      </td>

                      {/* TALLA */}
                      <td className="py-4 px-4">

                        <select
                          value={item.size || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx] = {
                              ...newItems[idx],
                              size: e.target.value
                            };
                            setItems(newItems);
                          }}
                          className="h-11 min-w-[90px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all"
                        >
                          <option value="">Talla</option>

                          {SIZES.map(size => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* MANGA */}
                      <td className="py-4 px-4">

                        <select
                          value={item.sleeve || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].sleeve = e.target.value;
                            setItems(newItems);
                          }}
                          className="h-11 min-w-[110px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all"
                        >
                          <option value="">Manga</option>
                          <option value="Corta">Corta</option>
                          <option value="Larga">Larga</option>
                        </select>
                      </td>

                      {/* TIPO */}
                      <td className="py-4 px-4">

                        <select
                          value={item.design_type || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].design_type = e.target.value;
                            setItems(newItems);
                          }}
                          className="h-11 min-w-[120px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all"
                        >
                          <option value="">Tipo</option>
                          <option value="Jugador">Jugador</option>
                          <option value="Portero">Portero</option>
                        </select>
                      </td>

                      {/* HORMA */}
                      <td className="py-4 px-4">

                        <select
                          value={item.fit || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].fit = e.target.value;
                            setItems(newItems);
                          }}
                          className="h-11 min-w-[120px] rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background outline-none px-3 text-center text-[11px] font-black uppercase text-foreground-main transition-all"
                        >
                          <option value="">Horma</option>
                          <option value="Hombre">Hombre</option>
                          <option value="Dama">Dama</option>
                        </select>
                      </td>

                      {/* OBS */}
                      <td className="py-4 px-5">

                        <input
                          type="text"
                          value={item.observations || ''}
                          onChange={e => {
                            const newItems = [...items];
                            newItems[idx].observations = e.target.value;
                            setItems(newItems);
                          }}
                          className="w-full h-11 rounded-xl bg-surface border border-transparent focus:border-accent/30 focus:bg-background px-4 outline-none text-sm text-foreground-muted transition-all"
                          placeholder="Observaciones..."
                        />
                      </td>

                      {/* DELETE */}
                      <td className="py-4 px-5 text-right">

                        <button
                          onClick={() =>
                            setItems(
                              items.filter((_, i) => i !== idx)
                            )
                          }
                          className="w-11 h-11 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center ml-auto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* EMPTY */}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-20 text-center"
                      >
                        <div className="space-y-4">
                          <Shirt
                            size={42}
                            className="mx-auto text-foreground-muted/20"
                          />

                          <div>
                            <p className="text-sm font-black text-foreground-main">
                              No hay uniformes agregados
                            </p>

                            <p className="text-[10px] uppercase tracking-[0.25em] font-black text-foreground-muted mt-2">
                              Agrega el primer uniforme
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-border-custom">
          <div className="flex gap-12">
            <div className="text-left">
              <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted/20 mb-1">Total Costura</p>
              <p className="text-xl font-black text-accent tracking-tighter">
                ${ items.reduce((sum, item) => sum + (item.sewing_price || 0), 0).toLocaleString() }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-colors">Cancelar</button>
            <button onClick={handleSubmit} className="bg-accent text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20">Guardar Cambios</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function OrderDetails({ orderId, onBack, onUpdate, user, canEdit }: { orderId: number, onBack: () => void, onUpdate: () => void, user: User, canEdit: boolean, key?: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Order>>({});
  const [editItems, setEditItems] = useState<Partial<OrderItem>[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isChangingClient, setIsChangingClient] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [newReferences, setNewReferences] = useState<File[]>([]);
  const [newReferencePreviews, setNewReferencePreviews] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showQualityRejectModal, setShowQualityRejectModal] = useState(false);
  const [qualityRejectComment, setQualityRejectComment] = useState('');
  const [isSubmittingQualityReject, setIsSubmittingQualityReject] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [pendingStatusLabel, setPendingStatusLabel] = useState('');
  const [showRepositionModal, setShowRepositionModal] = useState(false);
  const [repositionReason, setRepositionReason] = useState('');
  const [isSubmittingReposition, setIsSubmittingReposition] = useState(false);
  const [assignments, setAssignments] = useState<ProductionAssignment[]>([]);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [payments, setPayments] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    employee_id: '',
    garment_type: 'Camiseta',
    tasks: {
      filetes: { enabled: false, quantity: 0, price: 0 },
      despuntes: { enabled: false, quantity: 0, price: 0 },
      collarin: { enabled: false, quantity: 0, price: 0 },
      dobladillo_remate: { enabled: false, quantity: 0, price: 0 },
      filete_p: { enabled: false, quantity: 0, price: 0 },
      despuntes_p: { enabled: false, quantity: 0, price: 0 },
      caucho: { enabled: false, quantity: 0, price: 0 },
      sentar_caucho: { enabled: false, quantity: 0, price: 0 },
      collarin_p: { enabled: false, quantity: 0, price: 0 },
      remate: { enabled: false, quantity: 0, price: 0 },
    },
    notes: ''
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showProductionAssignModal, setShowProductionAssignModal] = useState(false);
  const [productionAssignments, setProductionAssignments] = useState<any[]>([]);
  const [productionAssignForm, setProductionAssignForm] = useState({
    employee_id: '',
    notes: ''
  });

  const role = user.role;

  useEffect(() => {
    const search = async () => {
      if (clientSearch.length > 2) {
        try {
          const results = await api.searchClients(clientSearch);
          setSearchResults(results);
        } catch (err) {
          console.error('Search error:', err);
        }
      } else {
        setSearchResults([]);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (order?.status === 'En confección' || assignments.length > 0) {
      api.getEmployees().then(setEmployees).catch(console.error);
    }
  }, [order?.status]);

  useEffect(() => {
    if (showAssignmentModal) {
      api.getProducts().then(prods => {
        const camiseta = (prods.find(p =>
          p.category?.toLowerCase().includes('camiseta') ||
          p.name.toLowerCase().includes('camiseta')
        ) || prods[0]) as any;

        const pantaloneta = (prods.find(p =>
          p.category?.toLowerCase().includes('pantaloneta') ||
          p.name.toLowerCase().includes('pantaloneta')
        ) || prods[0]) as any;

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
    }
  }, [showAssignmentModal]);

  useEffect(() => {
    const productionStatuses = ['En cuadro', 'En montaje', 'En impresión', 'En sublimación', 'En corte', 'En empaque', 'En confección'];
    if (productionStatuses.includes(order?.status || '') || assignments.length > 0) {
      api.getEmployees().then(setEmployees).catch(console.error);
    }
  }, [order?.status]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderData, historyData, assignmentsData] = await Promise.all([
        api.getOrder(orderId),
        api.getOrderHistory(orderId),
        api.getOrderAssignments(orderId)
      ]);
      setOrder(orderData);
      setHistory(historyData);
      setAssignments(assignmentsData);
      
      const prodAssignments = assignmentsData.filter((a: any) => a.department !== 'Confección');
      console.log('productionAssignments:', prodAssignments);
      console.log('order.status:', orderData.status);
      setProductionAssignments(prodAssignments);

      setEditData(orderData);
      setEditItems(orderData.items || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la orden');
    } finally {
      setLoading(false);
    }
  };

  const [productPrices, setProductPrices] = useState<Record<string, number>>({});

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      await api.updateOrder(orderId, { ...editData, items: editItems, user_name: user.name });
      await loadOrder();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  // DESPUÉS
  const handleCreateProductionAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productionAssignForm.employee_id) {
      toast.error('Selecciona un empleado');
      return;
    }
    try {
      // Eliminar asignación previa del mismo estado si existe
      const existing = productionAssignments.filter(
        a => a.department === order!.status
      );
      for (const prev of existing) {
        await api.deleteAssignment(prev.id);
      }

      await api.createAssignment({
        order_id: orderId,
        employee_id: parseInt(productionAssignForm.employee_id),
        department: order!.status,
        garment_count: order?.items?.length || 0,
        price_per_unit: 0,
        notes: productionAssignForm.notes || ''
      });

      toast.success(
        existing.length > 0
          ? 'Responsable actualizado correctamente'
          : 'Empleado asignado correctamente'
      );
      setShowProductionAssignModal(false);
      setProductionAssignForm({ employee_id: '', notes: '' });
      await loadOrder();
      onUpdate();
    } catch (error) {
      toast.error('Error al asignar empleado');
    }
  };

  const handleQualityReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualityRejectComment.trim()) {
      toast.error('Debes ingresar el motivo del rechazo');
      return;
    }
    setIsSubmittingQualityReject(true);
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'En cuadro',
          user_name: user.name,
          details_override: `⚠ Rechazo de calidad en impresión — Motivo: ${qualityRejectComment}`
        })
      });
      toast.success('Rechazo registrado — orden devuelta a En cuadro');
      setShowQualityRejectModal(false);
      setQualityRejectComment('');
      await loadOrder();
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar el rechazo');
    } finally {
      setIsSubmittingQualityReject(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!pendingStatus) {
      setPendingStatus(newStatus);
      setPendingStatusLabel(newStatus);
      setShowStatusConfirm(true);
      return;
    }

    try {
      setError(null);
      if (newStatus === 'En cuadro') {
        const deliveryDate = addBusinessDays(new Date(), 15);
        await api.updateOrder(orderId, {
          delivery_date: deliveryDate,
          user_name: user.name
        });
      }
      await api.updateStatus(orderId, newStatus, user.name);

      if (order?.is_reposition && order?.reposition_from_status) {
        const statusOrder: OrderStatus[] = [
          'En sublimación', 'En corte', 'En confección',
          'En empaque', 'En despacho', 'Entregado'
        ];
        const fromIndex = statusOrder.indexOf(order.reposition_from_status as OrderStatus);
        const newIndex = statusOrder.indexOf(newStatus);

        if (fromIndex !== -1 && newIndex !== -1 && newIndex >= fromIndex) {
          await api.updateOrder(orderId, {
            is_reposition: false,
            reposition_reason: null,
            reposition_from_status: null,
            user_name: user.name
          });
        }
      }

      await loadOrder();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el estado');
    } finally {
      setShowStatusConfirm(false);
      setPendingStatus(null);
      setPendingStatusLabel('');
    }
  };

  const handleApproveDesign = async () => {
    if (!order || !order.versions || order.versions.length === 0) return;
    try {
      const latestVersion = order.versions[order.versions.length - 1];
      await api.updateDesignVersionStatus(latestVersion.id, order.id, 'Diseño aprobado', '', user?.name || 'Cliente');
      toast.success('Diseño aprobado correctamente');
      await loadOrder();
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Error al aprobar el diseño');
    }
  };

  const handleRejectDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !order.versions || order.versions.length === 0) return;

    if (!rejectComment.trim()) {
      toast.error('Debes ingresar un comentario');
      return;
    }

    setIsSubmittingReject(true);
    try {
      const latestVersion = order.versions[order.versions.length - 1];
      await api.updateDesignVersionStatus(latestVersion.id, order.id, 'Corrección solicitada', rejectComment, user?.name || 'Cliente');
      toast.success('Correcciones solicitadas correctamente');
      setShowRejectModal(false);
      setRejectComment('');
      await loadOrder();
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Error al solicitar correcciones');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleDesignUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setError(null);
      setIsUploading(true);
      const formData = new FormData(e.currentTarget);
      formData.append('version_number', ((order?.versions?.length || 0) + 1).toString());
      formData.append('status', 'Versión enviada');

      await api.uploadDesign(orderId, formData, user.name);
      setSelectedFilePreview(null);
      await loadOrder();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al subir el diseño');
      console.error('Error uploading design:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMarkReposition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReposition(true);
    try {
      await api.updateOrder(orderId, {
        is_reposition: true,
        reposition_reason: repositionReason,
        reposition_from_status: order?.status,
        user_name: user.name
      });

      await api.updateStatus(orderId, 'En cuadro' as OrderStatus, user.name);

      await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'En cuadro',
          user_name: user.name,
          details_override: `⚡ REPOSICIÓN — Motivo: ${repositionReason}`
        })
      });

      toast.success('Orden marcada como reposición — devuelta a En cuadro con prioridad máxima');
      setShowRepositionModal(false);
      setRepositionReason('');
      await loadOrder();
      onUpdate();
    } catch (error) {
      toast.error('Error al marcar la reposición');
    } finally {
      setIsSubmittingReposition(false);
    }
  };

  const handleAddReferences = async () => {
    if (newReferences.length === 0) return;
    setIsUploading(true);
    try {
      const refsFormData = new FormData();
      newReferences.forEach(file => refsFormData.append('references', file));
      await api.uploadReferences(orderId, refsFormData);
      setNewReferences([]);
      setNewReferencePreviews([]);
      await loadOrder();
      onUpdate();
    } catch (err) {
      console.error('Error uploading references:', err);
      setError('Error al subir las referencias');
    } finally {
      setIsUploading(false);
    }
  };

  const SIZES = ['2','4','6','8','10','12','14','16','S','M','L','XL','XXL'];
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  const exportToExcel = () => {
    if (!order) return;

    const orderInfo = [
      ["ORDEN", order.order_number],
      ["CLIENTE", order.client_name || "-"],
      ["DOCUMENTO", `${order.client_doc_type || ""} ${order.client_doc || ""}`.trim() || "-"],
      ["ESTADO", order.status || "-"],
      ["FECHA", order.created_at || "-"],
      ["FECHA DE ENTREGA",
        order.delivery_date
          ? new Date(new Date(order.delivery_date).setDate(new Date(order.delivery_date).getDate() - 1))
              .toISOString().split("T")[0]
          : "-"
      ],
      [],
      ["DETALLE DE UNIFORMES"],
    ];

    const headers = [["Nombre / Jugador", "Número", "Talla", "Manga", "Tipo", "Horma", "Observaciones"]];

    const itemsData = order.items?.map(item => ([
      item.player_name || "-",
      item.number || "-",
      item.size || "-",
      item.sleeve || "-",
      item.design_type || "-",
      item.fit || "-",
      item.observations || "-"
    ])) || [];

    const finalData = [...orderInfo, ...headers, ...itemsData];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    const headerStyle = {
      fill: { fgColor: { rgb: "D9EAF7" } },
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const labelStyle = {
      fill: { fgColor: { rgb: "D9EAF7" } },
      font: { bold: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const valueStyle = {
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const cellBorder = {
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const headerRowIndex = orderInfo.length;

    headers[0].forEach((_, colIndex) => {
      const cell = XLSX.utils.encode_cell({ r: headerRowIndex, c: colIndex });
      if (worksheet[cell]) worksheet[cell].s = headerStyle;
    });

    itemsData.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        const cell = XLSX.utils.encode_cell({ r: headerRowIndex + 1 + rowIndex, c: colIndex });
        if (worksheet[cell]) worksheet[cell].s = cellBorder;
      });
    });

    for (let i = 0; i <= 5; i++) {
      const labelCell = XLSX.utils.encode_cell({ r: i, c: 0 });
      if (worksheet[labelCell]) worksheet[labelCell].s = labelStyle;
      const valueCell = XLSX.utils.encode_cell({ r: i, c: 1 });
      if (worksheet[valueCell]) worksheet[valueCell].s = valueStyle;
    }

    const detalleRowIndex = 7;
    worksheet["!merges"] = [{ s: { r: detalleRowIndex, c: 0 }, e: { r: detalleRowIndex, c: 6 } }];

    const detalleCell = XLSX.utils.encode_cell({ r: detalleRowIndex, c: 0 });
    if (worksheet[detalleCell]) {
      worksheet[detalleCell].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center" },
        fill: { fgColor: { rgb: "F2F2F2" } }
      };
    }

    const colWidths = [];
    for (let col = 0; col < finalData[0].length; col++) {
      let maxLength = 8;
      finalData.forEach(row => {
        const value = row[col];
        if (value) {
          const length = value.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      colWidths.push({ wch: Math.min(Math.max(maxLength + 2, 10), 40) });
    }

    worksheet["!cols"] = colWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedido");
    XLSX.writeFile(workbook, `Pedido_${order.order_number}.xlsx`);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.employee_id) {
      toast.error('Selecciona un empleado');
      return;
    }

    const taskLabels: Record<string, string> = {
      filetes: 'Filetes', despuntes: 'Despuntes', collarin: 'Collarín',
      dobladillo_remate: 'Dobladillo y Remate',
      filete_p: 'Filete', despuntes_p: 'Despuntes', caucho: 'Caucho',
      sentar_caucho: 'Sentar Caucho', collarin_p: 'Collarín', remate: 'Remate'
    };

    const activeTasks = Object.entries(assignmentForm.tasks)
      .filter(([_, t]) => t.enabled && t.quantity > 0);

    if (activeTasks.length === 0) {
      toast.error('Selecciona al menos una tarea con cantidad mayor a 0');
      return;
    }

    try {
      for (const [key, task] of activeTasks) {
        const priceKeyMap: Record<string, string> = {
          filetes: 'filetes', despuntes: 'despuntes', collarin: 'collarin',
          dobladillo_remate: 'dobladillo_remate', filete_p: 'filete_p',
          despuntes_p: 'despuntes_p', caucho: 'caucho', sentar_caucho: 'sentar_caucho',
          collarin_p: 'collarin_p', remate: 'remate'
        };
        const unitPrice = productPrices[priceKeyMap[key]] || 0;

        await api.createAssignment({
          order_id: orderId,
          employee_id: parseInt(assignmentForm.employee_id),
          department: 'Confección',
          garment_count: task.quantity,
          price_per_unit: unitPrice,
          notes: `[${assignmentForm.garment_type}] ${taskLabels[key]}${assignmentForm.notes ? ' — ' + assignmentForm.notes : ''}`
        });
      }

      toast.success('Asignación registrada correctamente');
      setShowAssignmentModal(false);
      setAssignmentForm({
        employee_id: '',
        garment_type: 'Camiseta',
        tasks: {
          filetes: { enabled: false, quantity: 0, price: 0 },
          despuntes: { enabled: false, quantity: 0, price: 0 },
          collarin: { enabled: false, quantity: 0, price: 0 },
          dobladillo_remate: { enabled: false, quantity: 0, price: 0 },
          filete_p: { enabled: false, quantity: 0, price: 0 },
          despuntes_p: { enabled: false, quantity: 0, price: 0 },
          caucho: { enabled: false, quantity: 0, price: 0 },
          sentar_caucho: { enabled: false, quantity: 0, price: 0 },
          collarin_p: { enabled: false, quantity: 0, price: 0 },
          remate: { enabled: false, quantity: 0, price: 0 },
        },
        notes: ''
      });
      loadOrder();
    } catch (error) {
      toast.error('Error al registrar la asignación');
    }
  };

  if (loading) return <LoadingState message="Cargando Orden" />;

  if (error && !order) return (
    <div className="text-center py-24 bg-surface rounded-[48px] border border-border-custom shadow-2xl max-w-2xl mx-auto">
      <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
        <AlertCircle className="text-accent" size={40} />
      </div>
      <h4 className="font-black text-3xl tracking-tighter text-foreground-main uppercase mb-4">Error de Conexión</h4>
      <p className="text-foreground-muted mb-10 font-bold uppercase tracking-widest text-xs px-12 leading-relaxed">{error}</p>
      <button
        onClick={loadOrder}
        className="bg-foreground-main text-background px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all active:scale-95 shadow-xl shadow-foreground-main/10"
      >
        Reintentar Sincronización
      </button>
    </div>
  );

  if (!order) return null;

  function addBusinessDays(startDate: Date, days: number): string {
    let date = new Date(startDate);
    let count = 0;
    while (count < days) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) count++;
    }
    return date.toISOString().split('T')[0];
  }

  const preProductionStatuses = [
    'Abono pendiente', 'Abono confirmado', 'En diseño',
    'Versión enviada', 'Corrección solicitada', 'Diseño aprobado'
  ];
  const isPreProduction = preProductionStatuses.includes(order.status);
  const displayDeliveryDate = isPreProduction
    ? addBusinessDays(new Date(), 15)
    : order.delivery_date;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">
      {isEditModalOpen && (
        <EditOrderModal
          order={order}
          items={order.items || []}
          onCancel={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            loadOrder();
            onUpdate();
          }}
          user={user}
        />
      )}

      {/* ── ENCABEZADO ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button onClick={onBack} className="flex items-center gap-3 hover:text-foreground-main font-black uppercase tracking-widest text-[10px] transition-colors">
          <ArrowLeft size={20} className="text-accent" />
          Volver a Órdenes
        </button>

        <div className="flex items-center gap-4 flex-wrap">
          {error && (
            <div className="bg-accent/10 text-accent px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-accent/20">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {!!order.is_priority && (
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
              <Star size={14} className="fill-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Orden Prioritaria</span>
            </div>
          )}

          {canEdit && user.role === 'Admin' && (
            <button
              onClick={async () => {
                try {
                  await api.updateOrder(orderId, { is_priority: !order.is_priority, user_name: user.name });
                  toast.success(order.is_priority ? 'Prioridad eliminada' : 'Orden marcada como prioritaria');
                  await loadOrder();
                  onUpdate();
                } catch (err) {
                  toast.error('Error al cambiar prioridad');
                }
              }}
              className={cn(
                'px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2',
                order.is_priority
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400'
                  : 'bg-surface-hover text-foreground-muted border-border-custom hover:border-yellow-500/40 hover:text-yellow-500'
              )}
            >
              <Star size={14} />
              {order.is_priority ? 'Quitar Prioridad' : 'Marcar Prioridad'}
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-surface-hover text-foreground-main px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover/80 transition-all border border-border-custom"
            >
              Editar Orden
            </button>
          )}

          <span className={cn(
            "px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500",
            order.status === 'Entregado' ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]" :
            order.status === 'Abono confirmado' ? "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" :
            "bg-accent text-white border-accent shadow-xl shadow-accent/20"
          )}>
            {order.status}
          </span>

          {['En cuadro', 'En montaje', 'En impresión', 'En sublimación', 'En corte',
            'En confección', 'En empaque', 'En despacho', 'Entregado'].includes(order.status) && (
            <button
              onClick={exportToExcel}
              className="bg-surface-hover text-foreground-main px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover/80 transition-all border border-border-custom flex items-center gap-2"
            >
              <Download size={14} /> Exportar Excel
            </button>
          )}
        </div>
      </div>

      {showReceiptModal && lastPayment && (
        <ReceiptModal order={order} payment={lastPayment} onClose={() => setShowReceiptModal(false)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-surface p-12 rounded-[48px] border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32"></div>
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div className="flex-1">
                <div className="group">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-accent text-[11px] font-black uppercase tracking-[0.5em] bg-accent/10 px-4 py-1.5 rounded-xl border border-accent/20 shadow-[0_0_20px_rgba(225,29,72,0.1)]">
                      {order.order_number}
                    </span>
                    <div className="h-[1px] w-8 bg-border-custom"></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.5em]">{order.client_city}</span>
                  </div>
                  <h3 className="text-5xl font-black tracking-tighter text-foreground-main uppercase leading-none drop-shadow-2xl group-hover:text-accent transition-colors duration-700">
                    {order.client_name}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* ── INFO CLIENTE ── */}
          <div className="flex flex-wrap gap-10 py-12 border-y border-border-custom relative z-10">
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Documento</p>
              <p className="font-black text-foreground-main tracking-tight">
                {order.client_doc_type} - {order.client_doc}
              </p>
            </div>
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Teléfono</p>
              <p className="font-black text-foreground-main tracking-tight">
                {order.client_phone}
              </p>
            </div>
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Entrega</p>
              <p className="font-black text-foreground-main tracking-tight">
                {displayDeliveryDate ? format(new Date(displayDeliveryDate), 'dd/MM/yyyy') : 'N/A'}
                {isPreProduction && (
                  <span className="text-foreground-muted text-[9px] font-bold uppercase tracking-widest ml-2">
                    (estimado)
                  </span>
                )}
              </p>
            </div>
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Equipo</p>
              {order.team_name ? (
                <p className="font-black text-accent tracking-tight flex items-center gap-2">
                  <Users size={16} />
                  {order.team_name}
                </p>
              ) : (
                <p className="font-black text-foreground-muted/30 tracking-tight flex items-center gap-2">
                  <Users size={16} />
                  Sin equipo
                </p>
              )}
            </div>
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Costo Costura</p>
              <p className="font-black text-accent tracking-tight flex items-center gap-2">
                <DollarSign size={16} />
                {order.total_amount && order.total_amount > 0
                  ? `${Number(order.total_amount).toLocaleString('es-CO')}`
                  : 'N/A'}
              </p>
            </div>
          </div>

          <UniformDesignerSection
            order={order}
            user={user}
            readOnly={
              ['En cuadro','En montaje','En impresión','En sublimación',
              'En corte','En confección','En empaque','En despacho','Entregado']
                .includes(order.status)
            }
            onSaved={() => { loadOrder(); onUpdate(); }}
          />

          <div className="bg-surface rounded-[48px] border border-border-custom shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32"></div>
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
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] bg-surface-hover px-5 py-2.5 rounded-2xl border border-border-custom shadow-inner">
                  {order.items?.length || 0} Unidades
                </span>
              </div>
            </div>
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-foreground-main/[0.02]">
                    <th className="py-10 px-10 border-b border-border-custom">Nombre / Jugador</th>
                    <th className="py-10 px-6 border-b border-border-custom text-center">N°</th>
                    <th className="py-10 px-6 border-b border-border-custom text-center">Talla</th>
                    <th className="py-10 px-6 border-b border-border-custom text-center">Manga</th>
                    <th className="py-10 px-6 border-b border-border-custom text-center">Tipo</th>
                    <th className="py-10 px-6 border-b border-border-custom text-center">Horma</th>
                    <th className="py-10 px-10 border-b border-border-custom">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {order.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gradient-to-r hover:from-accent/[0.03] hover:to-transparent transition-all duration-700 group border-b border-border-custom/50 last:border-0">
                      <td className="py-12 px-10">
                        <div className="flex flex-col group/name">
                          <span className="font-black text-foreground-main tracking-tighter group-hover:text-accent transition-all duration-500 uppercase drop-shadow-lg">{item.player_name || '-'}</span>
                          <div className="h-[1px] w-0 group-hover:w-12 bg-accent/50 transition-all duration-700 mt-1"></div>
                        </div>
                      </td>
                      <td className="py-12 px-6 text-center">
                        <span className="font-black text-foreground-main tracking-tighter">{item.number || '-'}</span>
                      </td>
                      <td className="py-12 px-6 text-center">
                        <span className="font-black text-foreground-main tracking-tighter group-hover:text-accent transition-all duration-500">{item.size || '-'}</span>
                      </td>
                      <td className="py-12 px-6 text-center">
                        <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.sleeve || '-'}</span>
                      </td>
                      <td className="py-12 px-6 text-center">
                        <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.design_type || '-'}</span>
                      </td>
                      <td className="py-12 px-6 text-center">
                        <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.fit || '-'}</span>
                      </td>
                      <td className="py-10 px-10">
                        <span className="text-foreground-main italic text-[11px] font-bold leading-relaxed">{item.observations || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                <FileText className="text-accent" size={24} />
              </div>
              <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
                Recibo de Orden
              </h4>
            </div>

            <div className="bg-background rounded-[28px] border border-border-custom p-6 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground-muted mb-4">
                Resumen de Uniformes
              </p>
              {(() => {
                const camisetas = order.items?.filter(i => i.garment_type?.toLowerCase().includes('camiseta')).length || 0;
                const pantalonetas = order.items?.filter(i => i.garment_type?.toLowerCase().includes('pantaloneta')).length || 0;
                const otros = (order.items?.length || 0) - camisetas - pantalonetas;
                return (
                  <div className="space-y-3">
                    {camisetas > 0 && (
                      <div className="flex items-center justify-between py-3 border-b border-border-custom last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center">
                            <Shirt className="text-accent" size={14} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-foreground-main">Camisetas</span>
                        </div>
                        <span className="font-black text-xl text-foreground-main tracking-tighter">{camisetas}</span>
                      </div>
                    )}
                    {pantalonetas > 0 && (
                      <div className="flex items-center justify-between py-3 border-b border-border-custom last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center">
                            <Shirt className="text-accent" size={14} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-foreground-main">Pantalonetas</span>
                        </div>
                        <span className="font-black text-xl text-foreground-main tracking-tighter">{pantalonetas}</span>
                      </div>
                    )}
                    {otros > 0 && (
                      <div className="flex items-center justify-between py-3 border-b border-border-custom last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center">
                            <Shirt className="text-accent" size={14} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-foreground-main">Uniformes</span>
                        </div>
                        <span className="font-black text-xl text-foreground-main tracking-tighter">{otros}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent">Total Uniformes</span>
                      <span className="font-black text-2xl text-foreground-main tracking-tighter">{order.items?.length || 0}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col items-center gap-4 pt-2">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground-muted">Escanea para seguimiento</p>
              <div className="p-4 bg-white rounded-[24px] shadow-xl shadow-black/20 border border-border-custom">
                <QRCode
                  value={`${window.location.origin}/seguimiento/${order.order_number}`}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#0f0f0f"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black text-foreground-main uppercase tracking-widest">{order.order_number}</p>
                <p className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest">{order.client_name}</p>
              </div>
            </div>

            <button
              onClick={() => {
                const camisetas = order.items?.filter(i => i.garment_type?.toLowerCase().includes('camiseta')).length || 0;
                const pantalonetas = order.items?.filter(i => i.garment_type?.toLowerCase().includes('pantaloneta')).length || 0;
                const otros = (order.items?.length || 0) - camisetas - pantalonetas;
                const qrUrl = `${window.location.origin}/seguimiento/${order.order_number}`;
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrUrl)}`;
                const printWindow = window.open('', '_blank', 'width=400,height=600');
                if (!printWindow) return;
                printWindow.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Recibo ${order.order_number}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Arial',sans-serif;background:#fff;color:#111;padding:32px 24px;max-width:360px;margin:0 auto;}.header{text-align:center;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:20px;}.brand{font-size:22px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;}.brand span{color:#e11d48;}.order-number{display:inline-block;margin-top:8px;font-size:11px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;background:#fef2f2;color:#e11d48;padding:4px 12px;border-radius:20px;border:1px solid #fecdd3;}.client-name{font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;margin-top:12px;}.client-info{font-size:11px;color:#555;margin-top:4px;font-weight:600;}.item-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0;}.item-label{font-size:13px;font-weight:800;text-transform:uppercase;}.item-qty{font-size:22px;font-weight:900;}.total-row{display:flex;justify-content:space-between;align-items:center;background:#111;color:#fff;padding:12px 16px;border-radius:12px;margin-bottom:24px;}.total-label{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;}.total-qty{font-size:26px;font-weight:900;}.qr-section{text-align:center;padding-top:16px;border-top:1px dashed #ddd;}.qr-section img{width:160px;height:160px;border-radius:12px;border:1px solid #eee;}.qr-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.3em;color:#999;margin-top:10px;}.delivery{display:flex;justify-content:space-between;font-size:11px;margin-bottom:20px;padding:10px 14px;background:#f9f9f9;border-radius:10px;border:1px solid #eee;}.delivery-label{color:#999;font-weight:700;text-transform:uppercase;}.delivery-value{font-weight:900;text-transform:uppercase;}.footer{text-align:center;font-size:9px;color:#bbb;margin-top:20px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;}.section-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;color:#999;margin-bottom:12px;}</style></head><body><div class="header"><div class="brand">Bachestic <span>Sport</span></div><div class="order-number">${order.order_number}</div><div class="client-name">${order.client_name}</div><div class="client-info">${order.client_doc_type||''} ${order.client_doc||''} · ${order.client_phone||''}</div></div><div class="delivery"><span class="delivery-label">Entrega estimada</span><span class="delivery-value">${order.delivery_date?new Date(new Date(order.delivery_date).setDate(new Date(order.delivery_date).getDate()-1)).toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}):'Por confirmar'}</span></div><div class="items-section"><div class="section-title">Resumen de Uniformes</div>${camisetas>0?`<div class="item-row"><span class="item-label">Camisetas</span><span class="item-qty">${camisetas}</span></div>`:''}${pantalonetas>0?`<div class="item-row"><span class="item-label">Pantalonetas</span><span class="item-qty">${pantalonetas}</span></div>`:''}${otros>0?`<div class="item-row"><span class="item-label">Uniformes</span><span class="item-qty">${otros}</span></div>`:''}</div><div class="total-row"><span class="total-label">Total Uniformes</span><span class="total-qty">${order.items?.length||0}</span></div><div class="qr-section"><img src="${qrImageUrl}" alt="QR"/><div class="qr-label">Escanea para seguimiento en línea</div></div><div class="footer">Bachestic Sport · ${new Date().toLocaleDateString('es-CO')}</div><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();};</script></body></html>`);
                printWindow.document.close();
              }}
              className="w-full bg-surface-hover text-foreground-main py-4 rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-foreground-main hover:text-background transition-all border border-border-custom"
            >
              <Download size={14} /> Imprimir Recibo
            </button>
          </div>

          {(role === 'Admin' || role === 'Diseño') && (
            <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                  <Palette className="text-accent" size={24} />
                </div>
                <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
                  Diseño del Cliente
                </h4>
              </div>
              <p className="text-foreground-muted text-[9px] font-black uppercase tracking-widest leading-relaxed">
                Carga el diseño para cada producto o uniforme. Estos se visualizarán en el seguimiento del cliente.
              </p>
              <div className="grid grid-cols-1 gap-8">
                {((() => {
                  const cats = Array.from(new Set(order.items?.map(item => item.garment_type).filter(Boolean) || [])) as string[];
                  if (!cats.includes('Portero')) cats.push('Portero');
                  return cats;
                })()).map((cat) => {
                  const design = [...(order.references || [])].reverse().find(r => r.comments === cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">{cat}</p>
                      {design ? (
                        <div
                          className="aspect-video rounded-3xl overflow-hidden border border-border-custom relative group shadow-lg cursor-pointer"
                          onClick={() => { setSelectedImageUrl(design.file_path); setShowImageModal(true); }}
                        >
                          <img src={design.file_path} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={design.file_path} download onClick={(e) => e.stopPropagation()} className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all" target="_blank" rel="noreferrer">
                              <Download size={20} />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData();
                          const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
                          if (input.files?.[0]) {
                            formData.append('references', input.files[0]);
                            formData.append('comments', cat as string);
                            api.uploadReferences(orderId, formData, user.name).then(() => loadOrder());
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

          {/* ── ACCIONES DE FLUJO ── */}
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                <CheckCircle2 className="text-accent" size={24} />
              </div>
              <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
                Acciones de Flujo
              </h4>
            </div>

            <div className="space-y-4">
              {order.status === 'Abono confirmado' && (role === 'Admin' || role === 'Ventas') && (() => {
                const orderCategories = Array.from(new Set(order.items?.map(item => item.garment_type).filter(Boolean) || [])) as string[];
                const uploadedCategories = (order.references || []).filter(r => orderCategories.includes(r.comments || ''));
                const hasDesignReference = uploadedCategories.length > 0;
                return (
                  <div className="space-y-3">
                    <button
                      onClick={() => hasDesignReference && handleStatusUpdate('En diseño')}
                      disabled={!hasDesignReference}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all",
                        hasDesignReference
                          ? "bg-foreground-main text-background hover:bg-foreground-main/90"
                          : "bg-surface-hover text-foreground-muted/40 cursor-not-allowed border border-dashed border-border-custom"
                      )}
                    >
                      <Palette size={18} /> Avanzar a: Diseño
                    </button>
                    {!hasDesignReference && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} />
                        Sube el diseño ejemplo antes de continuar
                      </p>
                    )}
                  </div>
                );
              })()}

              {(order.status === 'En diseño' || order.status === 'Corrección solicitada') && (role === 'Admin' || role === 'Diseño') && (
                <form onSubmit={handleDesignUpload} className="space-y-6">
                  <div className="relative group">
                    <div className="border-2 border-dashed border-border-custom rounded-[32px] p-10 text-center hover:border-accent/40 transition-all cursor-pointer relative bg-background overflow-hidden">
                      <input
                        type="file"
                        name="design"
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file as File);
                            setSelectedFilePreview(url);
                          }
                        }}
                      />
                      {selectedFilePreview ? (
                        <div className="relative z-10">
                          <img src={selectedFilePreview} className="max-h-48 mx-auto rounded-2xl shadow-2xl border border-border-custom" />
                          <p className="text-[9px] font-black text-accent uppercase tracking-widest mt-4">Imagen seleccionada - Click para cambiar</p>
                        </div>
                      ) : (
                        <div className="relative z-10">
                          <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="text-accent" size={24} />
                          </div>
                          <p className="text-[10px] font-black text-foreground-main uppercase tracking-[0.2em] mb-1">Subir Versión de Diseño</p>
                          <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest">JPG, PNG o PDF (Máx. 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <textarea
                    name="comments"
                    placeholder="Añadir comentarios o especificaciones para esta versión..."
                    className="w-full p-6 rounded-[24px] bg-background border border-border-custom text-foreground-main font-bold text-xs outline-none focus:border-accent/30 transition-all resize-none leading-relaxed"
                    rows={3}
                  ></textarea>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-accent text-white py-5 rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-accent/90 transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)] active:scale-[0.98]"
                  >
                    {isUploading ? <Clock className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Enviar Versión a Revisión
                  </button>
                </form>
              )}

              {order.status === 'Versión enviada' && (role === 'Admin' || role === 'Cliente') && (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleApproveDesign} className="bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(22,163,74,0.2)]">
                    Aprobar
                  </button>
                  <button onClick={() => setShowRejectModal(true)} className="bg-accent hover:bg-accent/90 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                    Corregir
                  </button>
                </div>
              )}

              {/* ── BLOQUE 1: Diseño aprobado / En cuadro / En montaje ── */}
              {['Diseño aprobado', 'En cuadro', 'En montaje'].includes(order.status) && (role === 'Admin' || role === 'Diseño') && (() => {
                const stepMap: Partial<Record<OrderStatus, { label: string; next: OrderStatus; icon: any }>> = {
                  'Diseño aprobado': { label: 'Avanzar a: Producción', next: 'En cuadro', icon: Printer },
                  'En cuadro':       { label: 'Avanzar a: Montaje',    next: 'En montaje', icon: CheckCircle2 },
                  'En montaje':      { label: 'Avanzar a: Impresión',  next: 'En impresión', icon: Printer },
                };
                const step = stepMap[order.status as keyof typeof stepMap];
                if (!step) return null;
                const Icon = step.icon;

                const requiresAssignment = order.status === 'En cuadro' || order.status === 'En montaje';
                const hasAssignment = productionAssignments.some(
                  a => a.department?.trim().toLowerCase() === order.status?.trim().toLowerCase()
                );
                const canAdvance = !requiresAssignment || hasAssignment;

                return (
                  <div className="space-y-3">
                    <button
                      onClick={() => canAdvance && handleStatusUpdate(step.next)}
                      disabled={!canAdvance}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all",
                        canAdvance
                          ? "bg-foreground-main text-background hover:bg-foreground-main/90"
                          : "bg-surface-hover text-foreground-muted/40 cursor-not-allowed border border-dashed border-border-custom"
                      )}
                    >
                      <Icon size={18} /> {step.label}
                    </button>
                    {!canAdvance && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} />
                        Asigna un responsable antes de avanzar
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* ── BLOQUE 2: En impresión / En sublimación / En corte / En confección / En empaque / En despacho ── */}
              {(['En impresión', 'En sublimación', 'En corte', 'En confección', 'En empaque', 'En despacho'] as OrderStatus[]).includes(order.status) && (role === 'Admin' || role === 'Ventas' || role === 'Impresión' || role === 'En Sublimación' || role === 'Corte' || role === 'Confección' || role === 'Empaque') && (() => {
                const nextMap: Partial<Record<OrderStatus, OrderStatus>> = {
                  'En impresión':   'En sublimación',
                  'En sublimación': 'En corte',
                  'En corte':       'En confección',
                  'En confección':  'En empaque',
                  'En empaque':     'En despacho',
                  'En despacho':    'Entregado',
                };
                const next = nextMap[order.status];
                if (!next) return null;

                // Validación: responsable asignado
                const estadosQueRequierenAsignacion: OrderStatus[] = [
                  'En impresión', 'En sublimación', 'En corte', 'En empaque'
                ];
                const requiereAsignacion = estadosQueRequierenAsignacion.includes(order.status);
                const tieneAsignacion = productionAssignments.some(
                  a => a.department?.trim().toLowerCase() === order.status?.trim().toLowerCase()
                );

                // Validación: confección completa
                let confeccionCompleta = true;
                let confeccionMensaje = '';

                if (order.status === 'En confección') {
                  const totalCamisetas = order.items?.filter(i => i.garment_type === 'Camiseta').length || 0;
                  const totalPantalonetas = order.items?.filter(i => i.garment_type === 'Pantaloneta').length || 0;
                  const CAM_TASKS = ['filetes', 'despuntes', 'collarin', 'dobladillo_remate'];
                  const PANT_TASKS = ['filete_p', 'despuntes_p', 'caucho', 'sentar_caucho', 'collarin_p', 'remate'];
                  const taskTotals: Record<string, number> = {};

                  assignments.forEach(a => {
                    const notesRaw = a.notes || '';
                    const typeMatch = notesRaw.match(/^\[(.+?)\]/);
                    const garmentType = typeMatch ? typeMatch[1] : 'Camiseta';
                    const rest = notesRaw.replace(/^\[.+?\]\s*/, '').split(' — ')[0].trim();
                    const labelToKey: Record<string, string> = {
                      'Filetes': 'filetes', 'Despuntes': 'despuntes', 'Collarín': 'collarin',
                      'Dobladillo y Remate': 'dobladillo_remate',
                      'Filete': 'filete_p', 'Caucho': 'caucho', 'Sentar Caucho': 'sentar_caucho',
                      'Remate': 'remate',
                    };
                    let key = labelToKey[rest];
                    if (rest === 'Despuntes' && garmentType === 'Pantaloneta') key = 'despuntes_p';
                    if (rest === 'Collarín' && garmentType === 'Pantaloneta') key = 'collarin_p';
                    if (key) taskTotals[key] = (taskTotals[key] || 0) + (a.garment_count || 0);
                  });

                  if (totalCamisetas > 0) {
                    for (const tk of CAM_TASKS) {
                      if ((taskTotals[tk] || 0) < totalCamisetas) {
                        confeccionCompleta = false;
                        confeccionMensaje = `Faltan tareas de camiseta: se necesitan ${totalCamisetas} en cada tarea`;
                        break;
                      }
                    }
                  }
                  if (confeccionCompleta && totalPantalonetas > 0) {
                    for (const tk of PANT_TASKS) {
                      if ((taskTotals[tk] || 0) < totalPantalonetas) {
                        confeccionCompleta = false;
                        confeccionMensaje = `Faltan tareas de pantaloneta: se necesitan ${totalPantalonetas} en cada tarea`;
                        break;
                      }
                    }
                  }
                }

                const puedeAvanzar = confeccionCompleta && (!requiereAsignacion || tieneAsignacion);

                return (
                  <div className="space-y-3">
                    <button
                      onClick={() => puedeAvanzar && handleStatusUpdate(next)}
                      disabled={!puedeAvanzar}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all",
                        puedeAvanzar
                          ? "bg-foreground-main text-background hover:bg-foreground-main/90"
                          : "bg-surface-hover text-foreground-muted/40 cursor-not-allowed border border-dashed border-border-custom"
                      )}
                    >
                      <CheckCircle2 size={18} /> Avanzar a: {next}
                    </button>

                    {requiereAsignacion && !tieneAsignacion && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} />
                        Asigna un responsable antes de avanzar
                      </p>
                    )}

                    {order.status === 'En confección' && !confeccionCompleta && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent/70 text-center flex items-center justify-center gap-1.5">
                        <AlertCircle size={12} />
                        {confeccionMensaje}
                      </p>
                    )}

                    {order.status === 'En impresión' && (role === 'Admin' || role === 'Ventas' || role === 'Impresión') && (
                      <button
                        onClick={() => setShowQualityRejectModal(true)}
                        className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-amber-500/20 transition-all"
                      >
                        <AlertTriangle size={18} /> Rechazar calidad → En cuadro
                      </button>
                    )}
                  </div>
                );
              })()}

              {(['En sublimación', 'En corte', 'En confección', 'En empaque'] as OrderStatus[]).includes(order.status) &&
                (role === 'Admin' || role === 'Ventas') && (
                <div className="pt-4 border-t border-border-custom">
                  {!order.is_reposition ? (
                    <button
                      onClick={() => setShowRepositionModal(true)}
                      className="w-full bg-orange-500/10 border border-orange-500/30 text-orange-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-orange-500/20 transition-all"
                    >
                      <AlertTriangle size={18} /> Marcar como Reposición
                    </button>
                  ) : (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center gap-3">
                      <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">⚡ Orden en Reposición</p>
                        {order.reposition_reason && (
                          <p className="text-xs text-foreground-muted mt-1">{order.reposition_reason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {order.status === 'Entregado' && (
                <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-500">✓ Orden completada y entregada</p>
                </div>
              )}
            </div>
          </div>

          {order.status === 'En confección' &&
            (role === 'Admin' || role === 'Ventas' || role === 'Confección') && (
            <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                    <Shirt className="text-accent" size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px]">Confección</h4>
                    <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">
                      {assignments.reduce((sum, a) => sum + (a.garment_count || 0), 0)} uds registradas
                    </p>
                  </div>
                </div>
                {order.status === 'En confección' && (role === 'Admin' || role === 'Ventas') && (
                  <button
                    onClick={() => {
                      api.getEmployees().then(setEmployees).catch(console.error);
                      setShowAssignmentModal(true);
                    }}
                    className="bg-accent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 hover:scale-105 transition-all"
                  >
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
                    .filter((a: any) => a.department === 'Confección')
                    .reduce((acc, a) => {
                      const key = a.employee_id;
                      if (!acc[key]) {
                        acc[key] = { employee_name: a.employee_name || `Empleado #${a.employee_id}`, total_garments: 0, total_earned: 0, items: [] };
                      }
                      acc[key].total_garments += a.garment_count || 0;
                      acc[key].total_earned += (a.garment_count || 0) * (a.price_per_unit || 0);
                      acc[key].items.push(a);
                      return acc;
                    }, {} as Record<number, any>)
                  ).map((emp: any, i) => (
                    <div key={i} className="bg-surface-hover p-5 rounded-2xl border border-border-custom space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                          <Users size={18} />
                        </div>
                        <p className="font-black text-sm text-foreground-main">{emp.name}</p>
                      </div>
                      {emp.items.map((a: any, j: number) => (
                        <div key={j} className="flex items-center justify-between border-t border-border-custom pt-3">
                          <div>
                            <p className="font-black text-sm text-foreground-main">
                              {a.employee_name || `Empleado #${a.employee_id}`}
                            </p>
                            <p className="text-[10px] font-black text-foreground-muted uppercase tracking-widest">
                              {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}
                            </p>
                            {a.notes && (
                              <p className="text-[10px] text-foreground-muted italic mt-0.5">{a.notes}</p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">{a.department}</p>
                            <p className="text-[9px] text-foreground-muted font-bold">
                              {a.garment_count || 0} uds
                            </p>
                            {a.duration_minutes != null ? (
                              <p className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                a.duration_minutes > 480
                                  ? "bg-red-500/10 text-red-500"
                                  : a.duration_minutes > 240
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-green-500/10 text-green-500"
                              )}>
                                {a.duration_minutes < 60
                                  ? `${a.duration_minutes}m`
                                  : `${Math.floor(a.duration_minutes / 60)}h ${a.duration_minutes % 60}m`}
                              </p>
                            ) : (
                              <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted/40 px-2 py-1 rounded-lg bg-surface border border-border-custom">
                                En progreso
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-5 py-4 bg-accent/10 rounded-2xl border border-accent/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">Total Confeccionado</p>
                    <div className="text-right">
                      <p className="font-black text-foreground-main">
                        {assignments.reduce((sum, a) => sum + (a.garment_count || 0), 0)} / {order.items?.length || 0} uniformes
                      </p>
                      <p className="text-[9px] text-foreground-muted font-bold">
                        ${assignments.reduce((sum, a) => sum + (a.garment_count || 0) * (a.price_per_unit || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showAssignmentModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-y-auto max-h-[90vh]"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                    <Shirt size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground-main uppercase tracking-tight">Registrar Confección</h3>
                    <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">
                      Orden {order.order_number} · {order.items?.length || 0} uniformes totales
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateAssignment} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Empleado</label>
                    <div className="relative">
                      <select
                        value={assignmentForm.employee_id}
                        onChange={e => setAssignmentForm({...assignmentForm, employee_id: e.target.value})}
                        required
                        className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main appearance-none cursor-pointer pr-12"
                      >
                        <option value="" disabled>Seleccionar empleado...</option>
                        {employees.filter(e => e.active && (e.role === 'Confección' || e.role === 'Admin')).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted" size={18} />
                      {employees.filter(e => e.active && (e.role === 'Confección' || e.role === 'Admin')).length === 0 && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent mt-2 flex items-center gap-1.5">
                          <AlertCircle size={12} /> No hay empleados de Confección activos
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Tipo de Prenda</label>
                    <div className="flex gap-3">
                      {['Camiseta', 'Pantaloneta'].map(tipo => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setAssignmentForm({...assignmentForm, garment_type: tipo})}
                          className={cn(
                            "flex-1 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border",
                            assignmentForm.garment_type === tipo
                              ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                              : "bg-surface-hover text-foreground-muted border-border-custom hover:text-foreground-main"
                          )}
                        >
                          {tipo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">
                      Tareas realizadas — {assignmentForm.garment_type}
                    </label>
                    <div className="bg-surface-hover rounded-[24px] border border-border-custom overflow-hidden">
                      <div className="grid grid-cols-[auto_1fr_120px_100px] gap-4 px-5 py-3 border-b border-border-custom bg-surface">
                        <div className="w-5" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Tarea</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted text-center">Cantidad</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted text-right">Subtotal</p>
                      </div>
                      {(assignmentForm.garment_type === 'Camiseta'
                        ? [
                            { key: 'filetes', label: 'Filetes', priceKey: 'filetes' },
                            { key: 'despuntes', label: 'Despuntes', priceKey: 'despuntes' },
                            { key: 'collarin', label: 'Collarín', priceKey: 'collarin' },
                            { key: 'dobladillo_remate', label: 'Dobladillo y Remate', priceKey: 'dobladillo_remate' },
                          ]
                        : [
                            { key: 'filete_p', label: 'Filete', priceKey: 'filete_p' },
                            { key: 'despuntes_p', label: 'Despuntes', priceKey: 'despuntes_p' },
                            { key: 'caucho', label: 'Caucho', priceKey: 'caucho' },
                            { key: 'sentar_caucho', label: 'Sentar Caucho', priceKey: 'sentar_caucho' },
                            { key: 'collarin_p', label: 'Collarín', priceKey: 'collarin_p' },
                            { key: 'remate', label: 'Remate', priceKey: 'remate' },
                          ]
                      ).map(({ key, label, priceKey }) => {
                        const task = assignmentForm.tasks[key];
                        const unitPrice = productPrices[priceKey] || 0;
                        const subtotal = (task.quantity || 0) * unitPrice;
                        const totalThisType = order.items?.length || 0;
                        const alreadyRegistered = assignments.reduce((sum, a) => {
                          const notesRaw = a.notes || '';
                          const typeMatch = notesRaw.match(/^\[(.+?)\]/);
                          const garmentType = typeMatch ? typeMatch[1] : 'Camiseta';
                          const rest = notesRaw.replace(/^\[.+?\]\s*/, '').split(' — ')[0].trim();
                          const labelToKey: Record<string, string> = {
                            'Filetes': 'filetes', 'Despuntes': 'despuntes', 'Collarín': 'collarin',
                            'Dobladillo y Remate': 'dobladillo_remate',
                            'Filete': 'filete_p', 'Caucho': 'caucho', 'Sentar Caucho': 'sentar_caucho',
                            'Remate': 'remate',
                          };
                          let assignedKey = labelToKey[rest];
                          if (rest === 'Despuntes' && garmentType === 'Pantaloneta') assignedKey = 'despuntes_p';
                          if (rest === 'Collarín' && garmentType === 'Pantaloneta') assignedKey = 'collarin_p';
                          if (assignedKey === key && garmentType === assignmentForm.garment_type) {
                            return sum + (a.garment_count || 0);
                          }
                          return sum;
                        }, 0);
                        const maxAllowed = Math.max(0, totalThisType - alreadyRegistered);

                        return (
                          <div key={key} className={cn(
                            "grid grid-cols-[auto_1fr_120px_100px] gap-4 items-center px-5 py-3 border-b border-border-custom last:border-0 transition-all",
                            task.enabled ? "bg-accent/5" : "opacity-50"
                          )}>
                            <input type="checkbox" checked={task.enabled}
                              onChange={e => setAssignmentForm(prev => ({
                                ...prev,
                                tasks: { ...prev.tasks, [key]: { ...prev.tasks[key], enabled: e.target.checked } }
                              }))}
                              className="w-4 h-4 accent-accent cursor-pointer"
                            />
                            <div>
                              <p className={cn("text-[11px] font-black uppercase tracking-wider", task.enabled ? "text-foreground-main" : "text-foreground-muted")}>{label}</p>
                              <p className="text-[9px] text-foreground-muted font-bold">${unitPrice.toLocaleString()} c/u</p>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={maxAllowed}
                                value={task.quantity || ''}
                                disabled={!task.enabled}
                                onChange={e => {
                                  const val = Math.min(Number(e.target.value), maxAllowed);
                                  setAssignmentForm(prev => ({
                                    ...prev,
                                    tasks: { ...prev.tasks, [key]: { ...prev.tasks[key], quantity: val, price: unitPrice } }
                                  }));
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl bg-surface border border-border-custom outline-none text-foreground-main font-black text-center text-sm disabled:opacity-30 focus:border-accent/50"
                              />
                              {task.enabled && (
                                <p className="text-[8px] font-black uppercase tracking-widest text-foreground-muted">
                                  máx {maxAllowed}
                                </p>
                              )}
                            </div>
                            <p className={cn("text-right font-black text-sm", task.enabled && task.quantity > 0 ? "text-accent" : "text-foreground-muted/30")}>
                              ${subtotal.toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-5 py-4 bg-accent/10 rounded-2xl border border-accent/20">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-accent">Total a Pagar</p>
                      <p className="text-[9px] text-foreground-muted font-bold mt-0.5">Tarifas tomadas del catálogo de productos</p>
                    </div>
                    <p className="font-black text-2xl text-foreground-main tracking-tighter">
                      ${Object.entries(assignmentForm.tasks)
                        .filter(([_, t]) => t.enabled && t.quantity > 0)
                        .reduce((sum, [key, t]) => {
                          const priceKeyMap: Record<string, string> = {
                            filetes: 'filetes', despuntes: 'despuntes', collarin: 'collarin',
                            dobladillo_remate: 'dobladillo_remate', filete_p: 'filete_p',
                            despuntes_p: 'despuntes_p', caucho: 'caucho', sentar_caucho: 'sentar_caucho',
                            collarin_p: 'collarin_p', remate: 'remate'
                          };
                          return sum + t.quantity * (productPrices[priceKeyMap[key]] || 0);
                        }, 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex justify-between items-center px-5 py-4 bg-accent/10 rounded-2xl border border-accent/20">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-accent">Total Uds</p>
                      <p className="text-[9px] text-foreground-muted font-bold mt-0.5">Las tarifas se calculan desde el catálogo de productos</p>
                    </div>
                    <p className="font-black text-2xl text-foreground-main tracking-tighter">
                      {Object.values(assignmentForm.tasks).filter(t => t.enabled && t.quantity > 0).reduce((sum, t) => sum + t.quantity, 0)} uds
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Observaciones (opcional)</label>
                    <input
                      type="text"
                      value={assignmentForm.notes}
                      onChange={e => setAssignmentForm({...assignmentForm, notes: e.target.value})}
                      placeholder="Ej. Prendas con refuerzo, ajuste especial..."
                      className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main"
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button type="button" onClick={() => setShowAssignmentModal(false)} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all">
                      Cancelar
                    </button>
                    <button type="submit" className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20">
                      <CheckCircle2 size={16} className="inline mr-2" /> Registrar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          <div className="bg-surface p-10 rounded-[40px] border border-border-custom shadow-2xl space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] -mr-16 -mt-16"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                <Palette className="text-accent" size={24} />
              </div>
              <div>
                <h4 className="font-black text-foreground-main text-[11px] uppercase tracking-[0.3em]">Historial de Diseño</h4>
                <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-1">Versiones enviadas</p>
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              {order.versions?.map((v) => (
                <div key={v.id} className="flex gap-6 p-6 rounded-[32px] border border-border-custom hover:bg-background transition-all group">
                  <div
                    className="w-24 h-24 bg-background rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-border-custom group-hover:border-accent/30 transition-colors cursor-pointer relative"
                    onClick={() => { if (v.file_path) { setSelectedImageUrl(v.file_path); setShowImageModal(true); } }}
                  >
                    {v.file_path ? (
                      <>
                        <img src={v.file_path} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white">
                            <Maximize2 size={16} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <Palette size={28} className="text-foreground-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-foreground-main text-base tracking-tight group-hover:text-accent transition-colors">
                        Versión {v.version_number}
                      </p>
                      <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest bg-background px-2 py-1 rounded-lg">
                        {format(new Date(v.created_at), 'dd/MM')}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed italic mb-3">{v.comments}</p>
                    {v.client_comments && (
                      <div className="mb-3 p-3 bg-accent/5 border border-accent/10 rounded-xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 flex items-center gap-1.5">
                          <MessageSquare size={10} /> Comentarios del Cliente:
                        </p>
                        <p className="text-[11px] text-foreground-main italic">{v.client_comments}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border",
                        v.status === 'Aprobado'
                          ? "bg-green-500/10 text-green-500 border-green-500/20"
                          : "bg-accent/10 text-accent border-accent/20"
                      )}>
                        {v.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!order.versions || order.versions.length === 0) && (
                <div className="text-center py-16 bg-background rounded-[32px] border border-dashed border-border-custom">
                  <Palette className="mx-auto text-foreground-muted opacity-20 mb-4" size={48} />
                  <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest italic">No hay versiones aún</p>
                </div>
              )}
            </div>

            {order.status === 'En cuadro' && history.length > 0 && (() => {
              const lastReject = history.find(h =>
                (h.details && h.details.includes('Rechazo de calidad')) ||
                (h.details && h.details.includes('⚠')) ||
                (h.action && h.action.toLowerCase().includes('rechazo'))
              );
              if (!lastReject) return null;
              const motivo = (lastReject.details || '')
                .replace('⚠ Rechazo de calidad en impresión — Motivo: ', '')
                .replace('⚠ ', '')
                .trim();
              return (
                <div className="flex items-start gap-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-[28px] px-8 py-6 my-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2">⚠ Devuelto por rechazo de calidad en impresión</p>
                    <p className="text-sm font-bold text-foreground-main leading-relaxed mb-2">{motivo}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                      Registrado por: {lastReject.user_name} · {format(new Date(lastReject.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {(['En cuadro', 'En montaje', 'En impresión', 'En sublimación', 'En corte', 'En empaque'] as OrderStatus[]).includes(order.status) &&
            (role === 'Admin' || role === 'Ventas' || role === 'Diseño' || role === 'Impresión' || role === 'Sublimación' || role === 'Corte' || role === 'Empaque') && (
            <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                    <Users className="text-accent" size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px]">Responsable</h4>
                    <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">
                      {order.status}
                    </p>
                  </div>
                </div>
                {(role === 'Admin' || role === 'Ventas') && (
                  <button
                    onClick={() => {
                      api.getEmployees().then(setEmployees).catch(console.error);
                      setShowProductionAssignModal(true);
                    }}
                    className="bg-accent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center gap-2 hover:scale-105 transition-all"
                  >
                    <Plus size={14} />
                    {productionAssignments.some(a => a.department === order.status)
                      ? 'Cambiar'
                      : 'Asignar'}
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
                  {productionAssignments
                    .filter(a => a.department === order.status)
                    .map((a: any, i: number) => (
                      <div key={i} className="bg-surface-hover p-5 rounded-2xl border border-border-custom flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="font-black text-sm text-foreground-main">
                              {a.employee_name || `Empleado #${a.employee_id}`}
                            </p>
                            <p className="text-[9px] font-bold text-foreground-muted uppercase tracking-widest">
                              {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}
                            </p>
                            {a.notes && (
                              <p className="text-[10px] text-foreground-muted italic mt-0.5">{a.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-accent uppercase tracking-widest">{a.department}</p>
                          <p className="text-[9px] text-foreground-muted font-bold mt-1">
                            {order.items?.length || 0} uniformes
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
              <History className="text-accent" size={24} />
            </div>
            <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px] whitespace-nowrap">
              Historial de Cambios
            </h4>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent/90 transition-colors">
            {showHistory ? 'Ocultar' : 'Ver Todo'}
          </button>
        </div>
        <div className={cn("space-y-6 transition-all overflow-hidden relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom", showHistory ? "max-h-[500px] overflow-y-auto pr-2" : "max-h-[200px]")}>
          {history.map((h) => {
            const isQualityReject = h.details?.includes('Rechazo de calidad');
            return (
              <div key={h.id} className="relative pl-8 group">
                <div className={cn(
                  "absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 transition-colors",
                  isQualityReject ? "bg-amber-500/20 border-amber-500" : "bg-surface border-border-custom group-hover:border-accent"
                )} />
                <div className="flex justify-between items-start mb-1">
                  <p className={cn("text-[11px] font-black tracking-tight leading-tight", isQualityReject ? "text-amber-500" : "text-foreground-main")}>
                    {h.action}
                  </p>
                  <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest">
                    {format(new Date(h.created_at), 'dd/MM HH:mm')}
                  </span>
                </div>
                {isQualityReject ? (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={10} /> Motivo del rechazo:
                    </p>
                    <p className="text-[10px] text-foreground-main leading-relaxed">
                      {h.details?.replace('⚠ Rechazo de calidad en impresión — Motivo: ', '')}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-foreground-muted leading-relaxed mb-1">{h.details}</p>
                )}
                <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Por: {h.user_name}</p>
              </div>
            );
          })}
          {history.length === 0 && (
            <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest italic text-center py-8">Sin historial registrado</p>
          )}
        </div>
      </div>

      {showStatusConfirm && pendingStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="w-full max-w-md bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">¿Confirmar cambio de estado?</h4>
                <p className="text-foreground-muted text-sm mt-2">Pasará a: <span className="font-black text-foreground-main uppercase">{pendingStatusLabel}</span></p>
                <p className="text-foreground-muted text-xs mt-1">Esta acción quedará registrada en el historial.</p>
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => { setShowStatusConfirm(false); setPendingStatus(null); setPendingStatusLabel(''); }}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const statusToExecute = pendingStatus!;
                    setShowStatusConfirm(false);
                    setPendingStatus(null);
                    setPendingStatusLabel('');
                    handleStatusUpdate(statusToExecute);
                  }}
                  className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showReceiptModal && lastPayment && order && (
        <ReceiptModal payment={lastPayment} order={order} onClose={() => setShowReceiptModal(false)} />
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-[40px] p-10 border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] -mr-16 -mt-16"></div>
            <h3 className="text-2xl font-black text-foreground-main tracking-tighter mb-2 relative z-10">Solicitar Correcciones</h3>
            <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-8 relative z-10">Detalla los cambios necesarios para el diseñador</p>
            <form onSubmit={handleRejectDesign} className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-3">Comentarios y Correcciones</label>
                <textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-6 text-foreground-main text-sm font-bold outline-none focus:border-accent/50 transition-all resize-none min-h-[120px]" placeholder="Ej. Cambiar el color del logo..." required />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowRejectModal(false); setRejectComment(''); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground-main hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmittingReject || !rejectComment.trim()} className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-accent/90 transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmittingReject ? <Clock className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Enviar Correcciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQualityRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-[40px] p-10 border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] -mr-16 -mt-16"></div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <AlertTriangle size={24} />
              </div>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                  <AlertTriangle size={12} /> Este motivo quedará registrado en el historial.
                </p>
              </div>
              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => { setShowQualityRejectModal(false); setQualityRejectComment(''); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground-main hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmittingQualityReject || !qualityRejectComment.trim()} className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-500/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20">
                  {isSubmittingQualityReject ? <Clock className="animate-spin" size={16} /> : <AlertTriangle size={16} />}
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRepositionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-[40px] p-10 border border-orange-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                <AlertTriangle size={24} />
              </div>
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
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                  <AlertTriangle size={12} /> Esta orden aparecerá primero en el KDS de producción.
                </p>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowRepositionModal(false)} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmittingReposition || !repositionReason.trim()} className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-500/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20">
                  {isSubmittingReposition ? <Clock className="animate-spin" size={16} /> : <AlertTriangle size={16} />}
                  Confirmar Reposición
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 sm:p-8" onClick={() => setShowImageModal(false)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-3 rounded-full backdrop-blur-md" onClick={() => setShowImageModal(false)}>
            <X size={24} />
          </button>
          <img src={selectedImageUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} referrerPolicy="no-referrer" />
        </div>
      )}

      {showProductionAssignModal && order && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-md bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground-main uppercase tracking-tight">Asignar Empleado</h3>
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mt-0.5">
                  {order.status} · {order.order_number}
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateProductionAssignment} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Empleado</label>
                <div className="relative">
                  <select
                    value={productionAssignForm.employee_id}
                    onChange={e => setProductionAssignForm({ ...productionAssignForm, employee_id: e.target.value })}
                    required
                    className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main appearance-none cursor-pointer pr-12"
                  >
                    <option value="" disabled>Seleccionar empleado...</option>
                    {employees.filter(e => e.active).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted" size={18} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Observaciones (opcional)</label>
                <input
                  type="text"
                  value={productionAssignForm.notes}
                  onChange={e => setProductionAssignForm({ ...productionAssignForm, notes: e.target.value })}
                  placeholder="Ej. Turno mañana, instrucciones especiales..."
                  className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowProductionAssignModal(false); setProductionAssignForm({ employee_id: '', notes: '' }); }}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-accent/20"
                >
                  <CheckCircle2 size={16} className="inline mr-2" /> Asignar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
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

// --- Receipt Component ---
function Receipt({ order, payment }: { order: Order; payment: Payment }) {
  const orderUrl = `http://localhost:3000/?order=${order.order_number}`;

  // 🔹 AGRUPAR POR garment_type + sale_price
  const groupedItems =
    order.items && order.items.length > 0
      ? Object.values(
          order.items.reduce((acc, item) => {
            const quantity = item.quantity || 1;
            const unitPrice = item.sale_price || 0;

            const key = `${item.garment_type}-${unitPrice}`;

            if (!acc[key]) {
              acc[key] = {
                garment_type: item.garment_type,
                quantity: 0,
                unitPrice: unitPrice,
                total: 0,
              };
            }

            acc[key].quantity += quantity;
            acc[key].total += quantity * unitPrice;

            return acc;
          }, {} as Record<string, any>)
        )
      : [];

  return (
    <div
      id="receipt-content"
      className="bg-white text-black p-8 font-mono text-[11px] w-[320px] mx-auto border border-black"
    >
      {/* HEADER */}
      <div className="text-center border-b border-dashed border-black pb-4 mb-4">
        <img
          src="/logo-bachestic.png"
          alt="Logo"
          className="mx-auto h-28 object-contain mb-2"
        />
        <p className="text-[10px] mt-2">NIT: 123.456.789-0</p>
        <p className="text-[10px]">Calle 123 #45-67</p>
        <p className="text-[10px]">Tel: +57 300 123 4567</p>
      </div>

      {/* INFO */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="font-bold">RECIBO:</span>
          <span className="font-black">RC-{payment.id}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-bold">FECHA:</span>
          <span>
            {format(
              new Date(payment.created_at || new Date()),
              "dd/MM/yyyy HH:mm"
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-bold">ORDEN:</span>
          <span>{order.order_number}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-bold">DOCUMENTO:</span>
          <span className="uppercase">
            {order.client_doc_type} - {order.client_doc}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="font-bold">CLIENTE:</span>
          <span className="uppercase">{order.client_name}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* DETALLE AGRUPADO */}
      {groupedItems.length > 0 && (
        <div className="mb-4 text-[10px]">
          <p className="font-bold text-center">DETALLE</p>
          <div className="border-t border-dashed border-black my-2"></div>

          <div className="space-y-2">
            {groupedItems.map((item, index) => (
              <div
                key={index}
                className="border-b border-dashed border-black pb-2"
              >
                <div className="font-bold uppercase">
                  {item.garment_type} x <span>
                    {item.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OBS */}
      {payment.notes && (
        <div className="mb-4">
          <p className="text-[10px] font-bold">OBS:</p>
          <p className="text-[10px] italic">{payment.notes}</p>
        </div>
      )}

      {/* QR */}
      <div className="text-center mt-6">
        <p className="text-[10px] uppercase mb-2">
          Escanear para consultar pedido
        </p>

        <div className="bg-white p-2 inline-block border border-black">
          <QRCode value={orderUrl} size={90} />
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center mt-3 text-[10px]">
        <p className="font-bold">¡Gracias por su compra!</p>
        <p className="opacity-60">No es factura legal</p>
      </div>
    </div>
  );
}

// --- Receipt Modal Component ---
function ReceiptModal({ order, payment, onClose }: { order: Order, payment: Payment, onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Recibo de Pago" maxWidth="max-w-5xl">
      <div className="space-y-8">
        <div className="max-h-[70vh] overflow-y-auto bg-gray-100 p-8 border border-border-custom">
          <Receipt order={order} payment={payment} />
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => window.print()}
            className="flex-1 bg-surface-hover text-foreground-main py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-surface-hover/80 transition-all border border-border-custom"
          >
            <Printer size={20} /> Imprimir Recibo
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-accent/20"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- Employee Management Component ---
function ProductManagement({}: { key?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [productToToggle, setProductToToggle] = useState<Product | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 9;

  const [errors, setErrors] = useState({
    code: '',
    name: '',
    confeccion: '',
  });

  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    category: 'Camiseta',
    sale_price: 0,
    sewing_cost: 0,
    active: true,
    price_filetes: 0,
    price_despuntes: 0,
    price_collarin: 0,
    price_dobladillo_remate: 0,
    price_filete_p: 0,
    price_despuntes_p: 0,
    price_caucho: 0,
    price_sentar_caucho: 0,
    price_collarin_p: 0,
    price_remate: 0,
  });

  useEffect(() => {
    loadProducts(includeInactive);
  }, [includeInactive]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, includeInactive]);

  useEffect(() => {
    const camisetaTotal =
      Number(newProduct.price_filetes || 0) +
      Number(newProduct.price_despuntes || 0) +
      Number(newProduct.price_collarin || 0) +
      Number(newProduct.price_dobladillo_remate || 0);

    const pantalonetaTotal =
      Number(newProduct.price_filete_p || 0) +
      Number(newProduct.price_despuntes_p || 0) +
      Number(newProduct.price_caucho || 0) +
      Number(newProduct.price_sentar_caucho || 0) +
      Number(newProduct.price_collarin_p || 0) +
      Number(newProduct.price_remate || 0);

    const totalGeneral = camisetaTotal + pantalonetaTotal;

    if (newProduct.sewing_cost !== totalGeneral) {
      setNewProduct((prev) => ({ ...prev, sewing_cost: totalGeneral }));
    }
  }, [
    newProduct.price_filetes,
    newProduct.price_despuntes,
    newProduct.price_collarin,
    newProduct.price_dobladillo_remate,
    newProduct.price_filete_p,
    newProduct.price_despuntes_p,
    newProduct.price_caucho,
    newProduct.price_sentar_caucho,
    newProduct.price_collarin_p,
    newProduct.price_remate,
  ]);

  const loadProducts = async (inactive: boolean = false) => {
    try {
      setLoading(true);
      const data = await api.getProducts(inactive);
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
        {message}
      </p>
    </div>
  );

  const resetForm = () => {
    setNewProduct({
      code: '',
      name: '',
      category: 'Camiseta',
      sale_price: 0,
      sewing_cost: 0,
      active: true,
      price_filetes: 0,
      price_despuntes: 0,
      price_collarin: 0,
      price_dobladillo_remate: 0,
      price_filete_p: 0,
      price_despuntes_p: 0,
      price_caucho: 0,
      price_sentar_caucho: 0,
      price_collarin_p: 0,
      price_remate: 0,
    });
    setErrors({ code: '', name: '', confeccion: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = { code: '', name: '', confeccion: '' };

    if (!newProduct.code.trim()) newErrors.code = 'Campo obligatorio';
    if (!newProduct.name.trim()) newErrors.name = 'Campo obligatorio';

    const codeExists = products.some(
      (p) =>
        (p as any).code?.toLowerCase().trim() === newProduct.code.toLowerCase().trim() &&
        p.id !== editingProduct?.id
    );
    if (codeExists) newErrors.code = 'Código ya registrado';

    const nameExists = products.some(
      (p) =>
        p.name?.toLowerCase().trim() === newProduct.name.toLowerCase().trim() &&
        p.id !== editingProduct?.id
    );
    if (nameExists) newErrors.name = 'Producto ya existe';

    const confeccionFields = [
      newProduct.price_filetes,
      newProduct.price_despuntes,
      newProduct.price_collarin,
      newProduct.price_dobladillo_remate,
      newProduct.price_filete_p,
      newProduct.price_despuntes_p,
      newProduct.price_caucho,
      newProduct.price_sentar_caucho,
      newProduct.price_collarin_p,
      newProduct.price_remate,
    ];
    if (confeccionFields.some((v) => Number(v) <= 0)) {
      newErrors.confeccion = 'Todos los costos de confección deben ser mayores a 0';
    }

    setErrors(newErrors);
    if (newErrors.code || newErrors.name || newErrors.confeccion) return;

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, newProduct);
        toast.success('Producto actualizado correctamente');
      } else {
        await api.createProduct(newProduct);
        toast.success('Producto creado correctamente');
      }
      setShowAdd(false);
      setEditingProduct(null);
      resetForm();
      loadProducts(includeInactive);
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar producto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      code: (product as any).code || '',
      name: product.name,
      category: product.category,
      sale_price: product.sale_price,
      sewing_cost: product.sewing_cost,
      active: product.active,
      price_filetes: (product as any).price_filetes || 0,
      price_despuntes: (product as any).price_despuntes || 0,
      price_collarin: (product as any).price_collarin || 0,
      price_dobladillo_remate: (product as any).price_dobladillo_remate || 0,
      price_filete_p: (product as any).price_filete_p || 0,
      price_despuntes_p: (product as any).price_despuntes_p || 0,
      price_caucho: (product as any).price_caucho || 0,
      price_sentar_caucho: (product as any).price_sentar_caucho || 0,
      price_collarin_p: (product as any).price_collarin_p || 0,
      price_remate: (product as any).price_remate || 0,
    });
    setErrors({ code: '', name: '', confeccion: '' });
    setShowAdd(true);
  };

  const confirmToggleActive = (product: Product) => {
    setProductToToggle(product);
    setShowConfirmToggle(true);
  };

  const handleToggleActive = async () => {
    if (!productToToggle) return;
    try {
      const newStatus = !productToToggle.active;
      await api.updateProduct(productToToggle.id, {
        ...productToToggle,
        active: newStatus,
      });
      toast.success(
        `Producto ${productToToggle.active ? 'desactivado' : 'activado'} correctamente`
      );
      setShowConfirmToggle(false);
      setProductToToggle(null);
      setCurrentPage(1);
      setIncludeInactive(!newStatus ? true : false);
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar estado');
    }
  };

  if (loading) return <LoadingState message="Cargando Productos" />;

  const filteredProducts = products.filter((p) => {
    const matchesActive = includeInactive ? !p.active : p.active;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      ((p as any).code || '').toLowerCase().includes(term);
    return matchesActive && matchesSearch;
  });

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  const camisetaTotal =
    Number(newProduct.price_filetes || 0) +
    Number(newProduct.price_despuntes || 0) +
    Number(newProduct.price_collarin || 0) +
    Number(newProduct.price_dobladillo_remate || 0);

  const pantalonetaTotal =
    Number(newProduct.price_filete_p || 0) +
    Number(newProduct.price_despuntes_p || 0) +
    Number(newProduct.price_caucho || 0) +
    Number(newProduct.price_sentar_caucho || 0) +
    Number(newProduct.price_collarin_p || 0) +
    Number(newProduct.price_remate || 0);

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <h3 className="text-3xl font-black text-foreground-main tracking-tighter">
            Productos
          </h3>

          <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom">
            <button
              onClick={() => { setIncludeInactive(false); setCurrentPage(1); }}
              className={cn(
                'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                !includeInactive
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'text-foreground-muted hover:text-foreground-main'
              )}
            >
              Activos
            </button>
            <button
              onClick={() => { setIncludeInactive(true); setCurrentPage(1); }}
              className={cn(
                'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                includeInactive
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'text-foreground-muted hover:text-foreground-main'
              )}
            >
              Desactivados
            </button>
          </div>

          {/* BUSCADOR */}
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-accent transition-colors duration-300"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-3 rounded-2xl bg-surface border border-border-custom focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none text-foreground-main text-[10px] font-black uppercase tracking-[0.18em] placeholder:text-foreground-muted/40 transition-all duration-300 shadow-sm min-w-[260px]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-accent transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => { setEditingProduct(null); resetForm(); setShowAdd(true); }}
          className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20 whitespace-nowrap"
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedProducts.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState
              icon={Package}
              title={
                searchTerm
                  ? `Sin resultados para "${searchTerm}"`
                  : includeInactive
                    ? 'No hay productos desactivados'
                    : 'No hay productos activos'
              }
              message={
                searchTerm
                  ? 'Intenta con otro nombre o código.'
                  : includeInactive
                    ? 'No se encontraron productos en el archivo.'
                    : 'Aún no se han registrado productos.'
              }
              actionLabel={
                !searchTerm && !includeInactive ? 'Crear Nuevo Producto' : undefined
              }
              onAction={() => { setEditingProduct(null); resetForm(); setShowAdd(true); }}
            />
          </div>
        ) : (
          paginatedProducts.map((product) => (
            <Card
              key={product.id}
              className={cn(
                'group hover:border-accent/30 transition-all relative overflow-hidden',
                !product.active && 'opacity-60 grayscale-[0.5]'
              )}
            >
              {!product.active && (
                <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-widest rounded-bl-xl">
                  Inactivo
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Package size={24} />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                    title="Editar producto"
                  >
                    <Edit2 size={18} />
                  </button>

                  <button
                    onClick={() => confirmToggleActive(product)}
                    className={cn(
                      'p-3 rounded-xl transition-all',
                      product.active
                        ? 'bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent'
                        : 'bg-accent text-white'
                    )}
                    title={product.active ? 'Desactivar producto' : 'Activar producto'}
                  >
                    {product.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                    {(product as any).code}
                  </p>
                  <h4 className="text-xl font-black text-foreground-main tracking-tight uppercase">
                    {product.name}
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-custom">
                  <div>
                    <p className="text-[9px] font-black text-foreground-muted uppercase tracking-widest mb-1">
                      Costo Costura
                    </p>
                    <p className="text-lg font-black text-foreground-main">
                      ${(product.sewing_cost || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-5 py-3 rounded-2xl bg-surface border border-border-custom text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Anterior
          </button>

          {Array.from({ length: totalPages }).map((_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-12 h-12 rounded-2xl text-[10px] font-black transition-all',
                  currentPage === page
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-surface border border-border-custom text-foreground-muted hover:text-foreground-main'
                )}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-5 py-3 rounded-2xl bg-surface border border-border-custom text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN TOGGLE */}
      <Modal
        isOpen={showConfirmToggle}
        onClose={() => { setShowConfirmToggle(false); setProductToToggle(null); }}
        title={productToToggle?.active ? 'Desactivar Producto' : 'Activar Producto'}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <p className="text-sm font-bold text-foreground-muted">
            ¿Estás seguro de que deseas{' '}
            {productToToggle?.active ? 'desactivar' : 'activar'} el producto{' '}
            <span className="font-black text-foreground-main">
              {productToToggle?.name}
            </span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowConfirmToggle(false); setProductToToggle(null); }}
              className="px-6 py-3 rounded-2xl border border-border-custom text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleToggleActive}
              className="px-6 py-3 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-105 transition-all"
            >
              {productToToggle?.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL CREAR / EDITAR */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setEditingProduct(null); resetForm(); }}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* CÓDIGO */}
          <div>
            <Input
              label="Código"
              value={newProduct.code}
              onChange={(e) => {
                setNewProduct({ ...newProduct, code: e.target.value });
                setErrors(prev => ({ ...prev, code: '' }));
              }}
            />
            {errors.code && <ErrorMessage message={errors.code} />}
          </div>

          {/* NOMBRE */}
          <div>
            <Input
              label="Nombre"
              value={newProduct.name}
              onChange={(e) => {
                setNewProduct({ ...newProduct, name: e.target.value });
                setErrors(prev => ({ ...prev, name: '' }));
              }}
            />
            {errors.name && <ErrorMessage message={errors.name} />}
          </div>

          {/* CAMISETA */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase">
              Costos de Confección — Camiseta
            </p>
            {[
              { key: 'price_filetes', label: 'Filetes' },
              { key: 'price_despuntes', label: 'Despuntes' },
              { key: 'price_collarin', label: 'Collarín' },
              { key: 'price_dobladillo_remate', label: 'Dobladillo y Remate' },
            ].map(({ key, label }) => (
              <Input
                key={key}
                label={label}
                type="number"
                value={(newProduct as any)[key]}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, [key]: Number(e.target.value) })
                }
              />
            ))}
            <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                Total Costura Camiseta
              </p>
              <p className="text-2xl font-black text-foreground-main">
                ${camisetaTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {/* PANTALONETA */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase">
              Costos de Confección — Pantaloneta
            </p>
            {[
              { key: 'price_filete_p', label: 'Filete' },
              { key: 'price_despuntes_p', label: 'Despuntes' },
              { key: 'price_caucho', label: 'Caucho' },
              { key: 'price_sentar_caucho', label: 'Sentar Caucho' },
              { key: 'price_collarin_p', label: 'Collarín' },
              { key: 'price_remate', label: 'Remate' },
            ].map(({ key, label }) => (
              <Input
                key={key}
                label={label}
                type="number"
                value={(newProduct as any)[key]}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, [key]: Number(e.target.value) })
                }
              />
            ))}
            <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                Total Costura Pantaloneta
              </p>
              <p className="text-2xl font-black text-foreground-main">
                ${pantalonetaTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {/* TOTAL FINAL */}
          <div className="bg-surface-hover rounded-3xl p-6 border border-border-custom">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-2">
              Costo Total de Confección
            </p>
            <p className="text-4xl font-black text-accent">
              ${newProduct.sewing_cost.toLocaleString()}
            </p>
          </div>

          {errors.confeccion && <ErrorMessage message={errors.confeccion} />}

          <button
            type="submit"
            className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            {editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

function TeamManagement({ client, onClose }: { client: Client, onClose: () => void }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // ✅ ERRORES
  const [errors, setErrors] = useState({
    teamName: ''
  });

  useEffect(() => {
    fetchTeams();
  }, [client.id]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await api.getClientTeams(client.id);
      setTeams(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  };

  // ✅ COMPONENTE ERROR
  const ErrorMessage = ({
    message
  }: {
    message: string;
  }) => (
    <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
        {message}
      </p>
    </div>
  );

  const resetForm = () => {
    setNewTeamName('');

    setErrors({
      teamName: ''
    });
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      teamName: ''
    };

    // ✅ VALIDAR VACÍO
    if (!newTeamName.trim()) {
      newErrors.teamName =
        'El nombre del equipo es obligatorio';
    }

    // ✅ VALIDAR DUPLICADO
    const teamExists = teams.some(
      team =>
        team.name.trim().toLowerCase() ===
          newTeamName.trim().toLowerCase() &&
        team.id !== editingTeam?.id
    );

    if (teamExists) {
      newErrors.teamName =
        'Este equipo ya está registrado';
    }

    setErrors(newErrors);

    // ✅ DETENER
    if (newErrors.teamName) {
      return;
    }

    try {
      if (editingTeam) {
        await api.updateTeam(editingTeam.id, {
          name: newTeamName
        });

        toast.success('Equipo actualizado');
      } else {
        await api.createTeam(
          client.id,
          newTeamName
        );

        toast.success('Equipo creado');
      }

      resetForm();

      setIsAdding(false);
      setEditingTeam(null);

      fetchTeams();
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar equipo');
    }
  };

  const handleToggleTeam = async (team: Team) => {
    try {
      await api.updateTeam(team.id, {
        active: !team.active
      });

      toast.success(
        `Equipo ${
          team.active
            ? 'desactivado'
            : 'activado'
        }`
      );

      fetchTeams();
    } catch (error) {
      console.error(error);
      toast.error(
        'Error al cambiar estado del equipo'
      );
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">
            Equipos de {client.name}
          </h4>

          <p className="text-foreground-muted text-[10px] font-black uppercase tracking-widest mt-1">
            Gestiona los equipos asociados a este cliente
          </p>
        </div>

        {!isAdding && (
          <button
            onClick={() => {
              resetForm();
              setEditingTeam(null);
              setIsAdding(true);
            }}
            className="bg-accent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus size={16} />
            Nuevo Equipo
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddTeam}
          className="bg-surface-hover p-6 rounded-2xl border border-border-custom space-y-4"
          noValidate
        >

          {/* NOMBRE EQUIPO */}
          <div>
            <Input
              label="Nombre del Equipo"
              value={newTeamName}
              onChange={e => {
                setNewTeamName(
                  e.target.value
                );

                setErrors(prev => ({
                  ...prev,
                  teamName: ''
                }));
              }}
              placeholder="Ej. Equipo A, Sucursal Norte, etc."
            />

            {errors.teamName && (
              <ErrorMessage
                message={errors.teamName}
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingTeam(null);
                resetForm();
              }}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground-main"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="bg-accent text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              {editingTeam
                ? 'Actualizar'
                : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState message="Cargando Equipos" />
      ) : teams.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border-custom rounded-2xl bg-surface-hover">
          <Users
            size={40}
            className="mx-auto text-foreground-muted/20 mb-4"
          />

          <p className="text-foreground-muted text-sm font-bold">
            No hay equipos registrados para este cliente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {teams.map(team => (
            <div
              key={team.id}
              className={cn(
                "flex items-center justify-between p-4 bg-surface rounded-2xl border border-border-custom transition-all",
                !team.active &&
                  "opacity-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <Users size={20} />
                </div>

                <div>
                  <p className="font-bold text-foreground-main">
                    {team.name}
                  </p>

                  <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                    {team.active
                      ? 'Activo'
                      : 'Inactivo'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTeam(team);

                    setNewTeamName(
                      team.name
                    );

                    setErrors({
                      teamName: ''
                    });

                    setIsAdding(true);
                  }}
                  className="p-2 hover:bg-accent/10 rounded-lg text-foreground-muted hover:text-foreground-main transition-all"
                >
                  <Edit2 size={16} />
                </button>

                <button
                  onClick={() =>
                    handleToggleTeam(team)
                  }
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    team.active
                      ? "hover:bg-accent/20 text-foreground-muted hover:text-accent"
                      : "bg-accent text-white"
                  )}
                >
                  {team.active ? (
                    <Trash2 size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientManagement({}: { key?: string }) {
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

  // ✅ COMPONENTE ERROR
  const ErrorMessage = ({
    message
  }: {
    message: string;
  }) => (
    <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
        {message}
      </p>
    </div>
  );

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

        {/* LEFT */}
        <div className="space-y-5">
          <div>
            <h3 className="text-3xl font-black tracking-tight text-foreground-main">
              Clientes
            </h3>
          </div>

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

// ─── Sección Diseño de Uniformes ─────────────────────────────────────────────
// ─── Sección Diseño de Uniformes (wrapper compacto) ──────────────────────────
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