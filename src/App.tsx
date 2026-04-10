import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Palette, 
  Printer, 
  Scissors, 
  Shirt, 
  Package, 
  Truck, 
  Users, 
  Plus, 
  Search, 
  Clock, 
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
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
  Maximize2
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Common Components ---
function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-accent/10 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground-muted/40 animate-pulse">{message}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: { icon: any, title: string, message: string, actionLabel?: string, onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-surface-hover rounded-[40px] border-2 border-dashed border-border-custom">
      <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-8 animate-pulse">
        <Icon size={48} />
      </div>
      <h3 className="text-2xl font-black text-foreground-main tracking-tight mb-3">{title}</h3>
      <p className="text-foreground-muted text-sm font-medium max-w-md mx-auto mb-10 leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="bg-accent text-white px-10 py-4 rounded-2xl font-black text-xs tracking-widest hover:scale-105 transition-all uppercase shadow-2xl shadow-accent/40 active:scale-95 flex items-center gap-3"
        >
          <Plus size={18} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function Card({ children, className, onClick, noPadding = false }: { children: React.ReactNode, className?: string, onClick?: () => void, noPadding?: boolean, key?: any }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-surface rounded-[32px] border border-border-custom shadow-2xl transition-all duration-300",
        onClick && "cursor-pointer hover:border-accent/30",
        !noPadding && "p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

function Modal({ children, title, subtitle, onClose, isOpen, maxWidth = "max-w-4xl" }: { children: React.ReactNode, title: string, subtitle?: string, onClose: () => void, isOpen: boolean, maxWidth?: string }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={cn("w-full bg-background rounded-[40px] shadow-2xl overflow-hidden flex flex-col my-auto border border-border-custom", maxWidth)}
          >
            <div className="p-8 border-b border-border-custom flex items-center justify-between bg-surface shrink-0">
              <div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-foreground-main">{title}</h3>
                {subtitle && <p className="text-foreground-muted text-[10px] font-bold uppercase tracking-widest mt-1">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="p-3 hover:bg-surface-hover rounded-2xl transition-all text-foreground-muted hover:text-foreground-main">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar max-h-[70vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">{label}</label>
      <input 
        {...props}
        className={cn(
          "w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main transition-all placeholder:text-foreground-muted/30",
          props.className
        )} 
      />
    </div>
  );
}

function Select({ label, options, ...props }: { label: string, options: { value: string, label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-3 relative">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">{label}</label>
      <div className="relative">
        <select 
          {...props}
          className={cn(
            "w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main transition-all cursor-pointer appearance-none pr-12",
            props.className
          )}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-surface text-foreground-main">{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted">
          <ChevronDown size={18} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [view, setView] = useState<'dashboard' | 'orders' | 'kds' | 'client' | 'create-order' | 'order-details' | 'employees' | 'clients' | 'products'>('dashboard');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [previousView, setPreviousView] = useState<'orders' | 'kds'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ activeOrders: 0, monthlySales: 0, delayedOrders: 0 });
  const [employeeReport, setEmployeeReport] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  
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
    if (user) {
      fetchData();
    }
  }, [user, includeInactive]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('bachestic_user', JSON.stringify(userData));
    // 👇 lógica clave
    const productionRoles = [
      'Diseño',
      'Impresión',
      'Sublimación',
      'Corte',
      'Confección',
      'Empaque',
      'Transporte'
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
    { id: 'kds', label: 'KDS Producción', icon: Clock, roles: ['Admin', 'Diseño', 'Impresión', 'Sublimación', 'Corte', 'Confección', 'Empaque', 'Transporte'] },
    { id: 'employees', label: 'Empleados', icon: Users, roles: ['Admin'] },
    { id: 'client', label: 'Seguimiento Cliente', icon: Eye, roles: ['Admin', 'Ventas', 'Cliente'] },
  ];

  const filteredSidebarItems = sidebarItems.filter(item => item.roles.includes(role));

  const isProductionRole = !['Admin', 'Ventas', 'Cliente'].includes(role);
  const canEditOrders = ['Admin', 'Ventas'].includes(role);

  if (publicOrderNumber && view === 'client') {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto">
          <ClientRoadmap orders={orders} initialSearch={publicOrderNumber} role={role} />
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
            className="w-[280px] bg-surface border-r border-border-custom flex flex-col z-50"
          >
            <div className="p-3 border-b border-border-custom flex items-center justify-between">
  
              <div className="flex items-center gap-4">
                <img
                  src="/logo-bachestic.png"
                  alt="Bachestic Logo"
                  className="h-30 object-contain"
                />
              </div>

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
                    view === item.id 
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
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-foreground-muted hover:text-foreground-main hover:bg-surface-hover transition-all duration-200"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                <span className="font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </button>
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
            {showCreateOrder && canEditOrders && <CreateOrder key="create" onCancel={() => setShowCreateOrder(false)} onSuccess={() => { fetchData(); setShowCreateOrder(false); }} user={user!} />}
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

// --- Dashboard Component ---
function Dashboard({ stats, orders, employeeReport, onOrderClick }: { stats: any, orders: Order[], employeeReport: any[], onOrderClick: (id: number) => void, key?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 mt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Órdenes Activas', value: stats.activeOrders, icon: ShoppingCart, color: 'text-accent', trend: '+12%' },
          { label: 'Órdenes Retrasadas', value: stats.delayedOrders, icon: AlertCircle, color: 'text-accent', trend: '-2%' },
        ].map((stat, i) => (
          <Card key={i} className="flex items-center justify-between group">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground-muted mb-3">{stat.label}</p>
              <h3 className="text-3xl font-black tracking-tighter text-foreground-main">{stat.value}</h3>
              <p className={cn("text-[10px] font-bold mt-3 flex items-center gap-1.5", stat.trend.startsWith('+') ? "text-green-500" : "text-red-500")}>
                <span className="px-1.5 py-0.5 rounded-md bg-current/10">{stat.trend}</span>
                <span className="text-foreground-muted font-medium uppercase tracking-wider">vs mes anterior</span>
              </p>
            </div>
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center bg-surface-hover group-hover:bg-accent/10 transition-colors", stat.color)}>
              <stat.icon size={28} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg tracking-tight text-foreground-main">Ventas Semanales</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Ingresos</span>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Lun', sales: 4000 },
                { name: 'Mar', sales: 3000 },
                { name: 'Mie', sales: 2000 },
                { name: 'Jue', sales: 2780 },
                { name: 'Vie', sales: 1890 },
                { name: 'Sab', sales: 2390 },
                { name: 'Dom', sales: 3490 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'var(--surface-hover)', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', color: 'var(--text-main)' }}
                  itemStyle={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="sales" fill="var(--accent)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg tracking-tight text-foreground-main">Distribución de Estados</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">Órdenes</span>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto pr-2">
            {[
              { name: 'Cotización', color: 'var(--accent)' },
              { name: 'Abono pendiente', color: '#F59E0B' },
              { name: 'Diseño', color: '#6366F1' },
              { name: 'Impresión', color: '#8B5CF6' },
              { name: 'Sublimación', color: '#EC4899' },
              { name: 'Corte', color: '#10B981' },
              { name: 'Confección', color: '#3B82F6' },
              { name: 'Empaque', color: '#06B6D4' },
              { name: 'Transporte', color: '#14B8A6' },
              { name: 'Entregado', color: '#22C55E' },
            ].map((status, i) => {
              const count = orders.filter(o => o.status === status.name).length;
              const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
              return (
                <div key={i} className="space-y-2 group">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted group-hover:text-foreground-main transition-colors">{status.name}</p>
                    <p className="text-sm font-black text-foreground-main tracking-tighter">{count}</p>
                  </div>
                  <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && (
              <div className="text-center py-12 opacity-20">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Sin datos disponibles</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-10">
        <Card className="overflow-hidden" noPadding>
          <div className="p-8 border-b border-border-custom flex items-center justify-between">
            <h3 className="font-bold text-lg tracking-tight text-foreground-main">Órdenes Recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-hover text-[9px] uppercase tracking-[0.2em] font-bold text-foreground-muted">
                  <th className="px-8 py-5">Orden</th>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Estado</th>
                  <th className="px-8 py-5">Entrega</th>
                  <th className="px-8 py-5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {orders.filter(o => o.active).slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-surface-hover transition-colors cursor-pointer group" onClick={() => onOrderClick(order.id)}>
                    <td className="px-8 py-6 font-bold text-foreground-main tracking-tight">{order.order_number}</td>
                    <td className="px-8 py-6 text-foreground-muted font-medium">{order.client_name}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                        order.status === 'Entregado' ? "bg-green-500/10 text-green-500" : "bg-accent/10 text-accent"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                      {order.delivery_date ? format(new Date(order.delivery_date), 'dd MMM, yyyy') : 'N/A'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2.5 bg-surface-hover hover:bg-accent rounded-xl transition-all text-foreground-muted group-hover:text-foreground-main">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

// --- Orders List Component ---
function OrdersList({ orders, user, onOrderClick, onCreateClick, canCreate, includeInactive, onToggleInactive, onUpdate, onShowRoadmap }: { orders: Order[], user: User, onOrderClick: (id: number) => void, onCreateClick: () => void, canCreate: boolean, includeInactive: boolean, onToggleInactive: () => void, onUpdate: () => void, onShowRoadmap: (orderNum: string) => void, key?: string }) {
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [orderToToggle, setOrderToToggle] = useState<Order | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('Todos');
  const [dateField, setDateField] = useState<'created_at' | 'delivery_date'>('delivery_date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const availableTeams = ['Todos', ...Array.from(new Set(
    orders.filter(o => o.team_name).map(o => o.team_name as string)
  ))];

  const filteredOrders = orders.filter(o => {
    const matchesActive = includeInactive ? !o.active : o.active;
    const matchesTeam = teamFilter === 'Todos' || o.team_name === teamFilter;

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

    return matchesActive && matchesTeam && matchesDate;
  });

  const copyPublicLink = (e: React.MouseEvent, orderNumber: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?order=${orderNumber}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleToggleActive = async () => {
    if (!orderToToggle) return;
    try {
      await api.updateOrder(orderToToggle.id, { active: !orderToToggle.active, user_name: user.name });
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-black tracking-tighter text-foreground-main">Gestión de Pedidos</h3>
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

        {/* BARRA DE FILTROS */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Toggle Activos/Desactivados */}
          <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom">
            <button
              onClick={() => includeInactive && onToggleInactive()}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !includeInactive ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Activos
            </button>
            <button
              onClick={() => !includeInactive && onToggleInactive()}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                includeInactive ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Desactivados
            </button>
          </div>

          {/* Filtro por Equipo */}
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="bg-surface border border-border-custom rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20 text-foreground-main transition-all appearance-none cursor-pointer"
          >
            {availableTeams.map(team => (
              <option key={team} value={team} className="bg-surface">{team}</option>
            ))}
          </select>

          {/* Filtro por Fechas */}
          <div className="flex items-center gap-3 bg-surface border border-border-custom rounded-2xl px-5 py-2.5">
            <select
              value={dateField}
              onChange={e => setDateField(e.target.value as any)}
              className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-foreground-muted cursor-pointer appearance-none"
            >
              <option value="delivery_date">Entrega</option>
              <option value="created_at">Creación</option>
            </select>
            <div className="w-[1px] h-4 bg-border-custom" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none cursor-pointer [color-scheme:dark] w-32"
            />
            <span className="text-[10px] font-black text-foreground-muted">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none cursor-pointer [color-scheme:dark] w-32"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-foreground-muted hover:text-accent transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Contador de resultados */}
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'orden' : 'órdenes'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredOrders.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3">
            <EmptyState
              icon={ShoppingCart}
              title={includeInactive ? "No hay órdenes inactivas" : "No hay órdenes activas"}
              message={includeInactive ? "No se han encontrado pedidos en el archivo." : "Aún no se han registrado pedidos. Comienza creando uno nuevo para iniciar el proceso de producción."}
              actionLabel={!includeInactive && canCreate ? "Crear Nueva Orden" : undefined}
              onAction={onCreateClick}
            />
          </div>
        ) : (
          filteredOrders.map(order => (
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
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-foreground-muted mb-1">{order.order_number}</p>
                  <h4 className="font-black text-xl text-foreground-main tracking-tight group-hover:text-accent transition-colors">{order.client_name}</h4>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  <Clock size={16} className="text-accent" />
                  <span>Entrega: <span className="text-foreground-main">{order.delivery_date ? format(new Date(order.delivery_date), 'dd/MM/yyyy') : 'N/A'}</span></span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                  <LayoutDashboard size={16} className="text-accent" />
                  <span>Estado: <span className="font-black text-foreground-main">{order.status}</span></span>
                </div>
                {order.team_name ? (
                  <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                    <Users size={16} className="text-accent" />
                    <span>Equipo: <span className="font-black text-foreground-main">{order.team_name}</span></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                    <Users size={16} className="text-foreground-muted/30" />
                    <span className="text-foreground-muted/30">Sin equipo asignado</span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-border-custom flex justify-between items-center">
                <p className="font-black text-2xl text-foreground-main tracking-tighter"></p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => confirmToggleActive(e, order)}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      order.active ? "bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent" : "bg-accent text-white"
                    )}
                    title={order.active ? "Desactivar orden" : "Activar orden"}
                  >
                    {order.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                  </button>
                  <button
                    onClick={(e) => copyPublicLink(e, order.order_number)}
                    className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                    title="Copiar enlace público"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={showConfirmToggle}
        onClose={() => setShowConfirmToggle(false)}
        title="Confirmar Cambio de Estado"
        maxWidth="max-w-md"
      >
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
            {orderToToggle?.active ? <Archive size={40} /> : <RotateCcw size={40} />}
          </div>
          <div>
            <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">
              ¿Estás seguro de {orderToToggle?.active ? 'desactivar' : 'activar'} este pedido?
            </h4>
            <p className="text-foreground-muted text-sm mt-2">
              {orderToToggle?.active
                ? 'El pedido se moverá a la pestaña de inactivos y no será visible en la lista principal.'
                : 'El pedido volverá a la lista principal de pedidos activos.'}
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button
              onClick={() => setShowConfirmToggle(false)}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleToggleActive}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-accent text-white hover:scale-105 transition-all shadow-xl shadow-accent/20"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

// --- Create Order Component ---
function CreateOrder({ onCancel, onSuccess, user }: { onCancel: () => void, onSuccess: () => void, user: User, key?: string }) {
  const getBusinessDaysFromNow = (days: number) => {
    let date = new Date();
    let count = 0;
    while (count < days) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        count++;
      }
    }
    return date.toISOString().split('T')[0];
  };

  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientTeams, setClientTeams] = useState<Team[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  
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
    payment_method: 'Transferencia',
    payment_reference: '',
    payment_notes: '',
    cash_received: 0,
    payment_document: null as File | null
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await api.getProducts();
        setProducts(data);
        const initialQuants: Record<string, number> = {};
        data.forEach(p => {
          initialQuants[p.name] = 0;
        });
        setQuantities(initialQuants);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  const calculateTotalFromQuantities = () => {
    const total = Object.entries(quantities).reduce((sum, [name, qty]) => {
      const product = products.find(p => p.name === name);
      return sum + ((qty as number) * (product?.sale_price || 0));
    }, 0);
    setFormData(prev => ({ ...prev, total_amount: total }));
  };
  const [items, setItems] = useState<Partial<OrderItem>[]>([]);
  const [advancePercent, setAdvancePercent] = useState(50);

  const groupedItems = items.reduce((acc, item) => {
    const key = item.garment_type || 'Camiseta';
    if (!acc[key]) {
      acc[key] = { garment_type: key, quantity: 0, sale_price: item.sale_price || 0 };
    }
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
    if (step === 2) {
      const total = groupedList.reduce((sum, g) => sum + g.quantity * g.sale_price, 0);
      setFormData(prev => ({ ...prev, total_amount: total }));
    } else {
      const total = Object.entries(quantities).reduce((sum, [name, qty]) => {
          const product = products.find(p => p.name === name);
          return sum + ((qty as number) * (product?.sale_price || 0));
        }, 0);
        setFormData(prev => ({ ...prev, total_amount: total }));
    }
  }, [items, quantities, products, step]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (clientSearch.length > 2) {
        try {
          const results = await api.searchClients(clientSearch);
          setSearchResults(results);
        } catch (error) {
          console.error(error);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearch]);

  const handleSelectClient = async (client: Client) => { // equipo aca
    setSelectedClient(client);
    try {
      const teams = await api.getClientTeams(client.id);
      setClientTeams(teams.filter(t => t.active));
    } catch (error) {
      console.error('Error fetching client teams:', error);
    }
    setFormData({
      ...formData,
      client_id: client.id,
      team_id: undefined, // equipo aca
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
  };

  const generateItems = () => {
    const newItems: Partial<OrderItem>[] = [];
    Object.entries(quantities).forEach(([name, qty]) => {
      const product = products.find(p => p.name === name);
      for (let i = 0; i < (qty as number); i++) {
        newItems.push({
          garment_type: name,
          item_name: '',
          player_name: '',
          number: '',
          size: '',
          sleeve: 'Corta',
          collar_type: 'Cuello V',
          design_type: 'Jugador',
          fit: 'Horma Normal',
          observations: '',
          sewing_price: product?.sewing_cost || 0,
          sale_price: product?.sale_price || 0
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
      }

      const finalTotalAmount = items.reduce((sum, item) => sum + (item.sale_price || 0), 0);

      const { id } = await api.createOrder({
        ...formData,
        status: 'Abono confirmado',
        total_amount: finalTotalAmount,
        client_id: finalClientId,
        user_name: user.name
      });

      // Add items
      await api.addItems(id, items);
      
      // Record the initial 50% payment
      const advanceAmount = Math.round(finalTotalAmount * (advancePercent / 100));
      const paymentFormData = new FormData();
      paymentFormData.append('amount', advanceAmount.toString());
      paymentFormData.append('payment_method', formData.payment_method);
      paymentFormData.append('reference', formData.payment_reference);
      
      let notes = formData.payment_notes || 'Abono inicial del 50% al crear la orden';
      if (formData.payment_method === 'Efectivo') {
        const change = Math.max(0, formData.cash_received - advanceAmount);
        notes += ` (Efectivo Recibido: $${formData.cash_received.toLocaleString()}, Cambio: $${change.toLocaleString()})`;
      }
      paymentFormData.append('notes', notes);
      paymentFormData.append('user_name', user.name);
      if (formData.payment_document) {
        paymentFormData.append('document', formData.payment_document);
      }
      
      await api.addPayment(id, paymentFormData);
      
      // Fetch the created order and payment for the receipt
      const [orderData] = await Promise.all([
        api.getOrder(id)
      ]);
      
      setCreatedOrder(orderData);
      toast.success('Orden creada correctamente');
      setShowReceipt(true);
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
        onClose={() => {
          setShowReceipt(false);
          onSuccess();
        }} 
      />
    );
  }

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
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-3 block">Buscar Cliente Existente</label>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-foreground-muted" size={20} />
                    <input 
                      type="text" 
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 rounded-[24px] bg-surface border border-border-custom focus:border-accent/50 focus:ring-4 focus:ring-accent/10 outline-none text-foreground-main transition-all placeholder:text-foreground-muted/30" 
                      placeholder="Nombre o Documento del cliente..."
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-3 bg-background border border-border-custom rounded-[24px] shadow-2xl overflow-hidden max-h-60 overflow-y-auto backdrop-blur-xl">
                      {searchResults.map(client => (
                        <button
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          className="w-full p-5 text-left hover:bg-accent/10 flex items-center justify-between border-b border-border-custom last:border-0 transition-colors group"
                        >
                          <div>
                            <p className="font-bold text-foreground-main group-hover:text-accent transition-colors">{client.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded-md uppercase tracking-widest">{client.doc_type || 'CC'}</span>
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">{client.doc} • {client.phone}</p>
                    </div>
                          </div>
                          <ChevronRight size={16} className="text-foreground-muted group-hover:text-accent transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-accent/5 p-6 rounded-[24px] border border-accent/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-foreground-main shadow-lg shadow-accent/20">
                      <Contact size={24} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Cliente Seleccionado</p>
                      <p className="font-black text-lg text-foreground-main tracking-tight">{formData.client_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {clientTeams.length > 0 && (
                      <div className="w-48">
                        <Select 
                          label="Equipo"
                          value={formData.team_id?.toString() || ''}
                          onChange={e => setFormData({...formData, team_id: e.target.value ? Number(e.target.value) : undefined})}
                          options={[
                            { value: '', label: 'Sin Equipo' },
                            ...clientTeams.map(t => ({ value: t.id.toString(), label: t.name }))
                          ]}
                        />
                      </div>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedClient(null);
                        setClientTeams([]);
                        setIsCreatingClient(false);
                        setFormData({...formData, client_id: undefined, team_id: undefined, client_name: '', client_doc: '', client_phone: '', client_address: '', client_city: ''});
                      }}
                      className="text-[10px] font-black text-accent uppercase tracking-widest hover:text-accent transition-colors"
                    >
                      Cambiar Cliente
                    </button>
                  </div>
                </div>

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
                            { value: 'CC', label: 'CC' },
                            { value: 'NIT', label: 'NIT' },
                            { value: 'CE', label: 'CE' },
                            { value: 'TI', label: 'TI' },
                            { value: 'Pasaporte', label: 'Pasaporte' }
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
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border-custom">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-4">Cantidades por Prenda</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Object.keys(quantities).map(type => (
                        <div key={type} className="bg-surface-hover p-4 rounded-2xl border border-border-custom flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground-main">{type}</span>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setQuantities(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }))}
                              className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-foreground-muted hover:text-accent transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-black text-foreground-main">{quantities[type]}</span>
                            <button 
                              onClick={() => setQuantities(prev => ({ ...prev, [type]: prev[type] + 1 }))}
                              className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-foreground-muted hover:text-accent transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-4">Presupuesto y Entrega</h4>
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
                            label="Valor Total Pedido"
                            type="number"
                            value={formData.total_amount}
                            onChange={e => setFormData({...formData, total_amount: Number(e.target.value)})}
                            className="font-black text-xl tracking-tighter"
                            readOnly
                          />
                        </div>
                      </div>
                      
                      <div className="bg-accent/10 p-6 rounded-[24px] border border-accent/20 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent">Abono Requerido</p>
                          <p className="font-black text-xl text-foreground-main tracking-tighter">
                            ${Math.round(formData.total_amount * (advancePercent / 100)).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={advancePercent}
                            onChange={e => setAdvancePercent(Number(e.target.value))}
                            className="flex-1 accent-accent cursor-pointer"
                          />
                          <div className="flex items-center gap-1 bg-background border border-border-custom rounded-xl px-3 py-2 w-20">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={advancePercent}
                              onChange={e => setAdvancePercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                              className="w-full bg-transparent outline-none text-foreground-main font-black text-sm text-right"
                            />
                            <span className="text-foreground-muted font-black text-sm">%</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest italic">
                          El pedido iniciará producción una vez confirmado el abono.
                        </p>
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
                <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-foreground-main shadow-lg shadow-accent/20 text-white">
                  <Contact size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Cliente Seleccionado</p>
                  <p className="font-black text-lg text-foreground-main tracking-tight">{formData.client_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {clientTeams.length > 0 && (
                  <div className="w-48">
                    <Select 
                      label="Equipo"
                      value={formData.team_id?.toString() || ''}
                      onChange={e => setFormData({...formData, team_id: e.target.value ? Number(e.target.value) : undefined})}
                      options={[
                        { value: '', label: 'Sin Equipo' },
                        ...clientTeams.map(t => ({ value: t.id.toString(), label: t.name }))
                      ]}
                    />
                  </div>
                )}
                <button 
                  onClick={() => {
                    setStep(1);
                    setSelectedClient(null);
                    setIsCreatingClient(false);
                    setFormData({...formData, client_id: undefined, client_name: '', client_doc: '', client_phone: '', client_address: '', client_city: ''});
                  }}
                  className="text-[10px] font-black text-accent uppercase tracking-widest hover:text-accent transition-colors"
                >
                  Cambiar Cliente
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xl tracking-tight text-foreground-main uppercase">Listado de Prendas</h4>
                </div>
                <div className="overflow-x-auto border border-border-custom rounded-[32px] bg-surface-hover">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-surface-hover text-[9px] uppercase font-black tracking-[0.2em] text-foreground-muted">
                        <th className="py-5 px-6">Prenda</th>
                        <th className="py-5 px-6 text-center">Cant.</th>
                        <th className="py-5 px-6 text-right">P. Unitario</th>
                        <th className="py-5 px-6 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {groupedList.map((group, idx) => (
                        <tr key={idx} className="hover:bg-surface-hover transition-colors group">
                          <td className="py-4 px-6">
                            <span className="text-foreground-muted font-bold text-[10px] uppercase">{group.garment_type}</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="font-black text-foreground-main text-[10px]">{group.quantity}</span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <input 
                              type="number" 
                              value={group.sale_price}
                              onChange={e => {
                                const newPrice = Number(e.target.value);
                                setItems(prev => prev.map(item =>
                                  item.garment_type === group.garment_type
                                    ? { ...item, sale_price: newPrice }
                                    : item
                                ));
                              }}
                              className="w-24 bg-transparent outline-none text-foreground-muted font-black text-right text-[10px]"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-black text-accent text-[10px]">
                              ${(group.quantity * group.sale_price).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-surface-hover p-8 rounded-[32px] border border-border-custom space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Resumen de Pago</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground-muted">Valor Total:</span>
                      <span className="text-xl font-black text-foreground-main tracking-tighter">${formData.total_amount.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-accent/10 rounded-2xl border border-accent/20">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-accent uppercase tracking-widest">Abono</span>
                        <div className="flex items-center gap-1 bg-background border border-accent/20 rounded-lg px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={advancePercent}
                            onChange={e => setAdvancePercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                            className="w-10 bg-transparent outline-none text-accent font-black text-sm text-right"
                          />
                          <span className="text-accent font-black text-sm">%</span>
                        </div>
                        <span className="text-accent font-black text-sm">:</span>
                      </div>
                      <span className="text-2xl font-black text-accent tracking-tighter">
                        ${Math.round(formData.total_amount * (advancePercent / 100)).toLocaleString()}
                      </span>
                    </div>
                  
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">Detalles del Pago</h4>
                  <div className="grid grid-cols-1 gap-6">
                    <Select
                      label="Método de Pago"
                      value={formData.payment_method}
                      onChange={e => setFormData({...formData, payment_method: e.target.value})}
                      options={[
                        { value: 'Efectivo', label: 'Efectivo' },
                        { value: 'Transferencia', label: 'Transferencia Bancaria' },
                        { value: 'Nequi', label: 'Nequi' },
                        { value: 'Daviplata', label: 'Daviplata' },
                        { value: 'Bancolombia', label: 'Bancolombia' }
                      ]}
                    />

                    {formData.payment_method === 'Efectivo' ? (
                      <div className="space-y-4 p-6 bg-background rounded-2xl border border-border-custom">
                        <Input 
                          label="Efectivo Recibido"
                          type="number"
                          value={formData.cash_received.toString()}
                          onChange={e => setFormData({...formData, cash_received: Number(e.target.value)})}
                          placeholder="0"
                        />
                        <div className="flex justify-between items-center pt-2 border-t border-border-custom">
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Cambio (Vuelto)</p>
                          <p className="font-black text-xl text-green-500 tracking-tighter">
                            ${Math.max(0, formData.cash_received - (formData.total_amount * 0.5)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">Comprobante de Pago</p>
                        <div className="relative group">
                          <input 
                            type="file" 
                            onChange={e => setFormData({...formData, payment_document: e.target.files?.[0] || null})}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            accept="image/*,application/pdf"
                          />
                          <div className={cn(
                            "w-full py-4 px-6 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-3",
                            formData.payment_document ? "border-accent bg-accent/5 text-accent" : "border-border-custom bg-surface hover:border-accent/50 text-foreground-muted"
                          )}>
                            <Upload size={18} />
                            <span className="text-[11px] font-bold uppercase tracking-widest">
                              {formData.payment_document ? formData.payment_document.name : 'Adjuntar Documento'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
            disabled={step === 1 && !selectedClient && !isCreatingClient}
            className="bg-accent text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
          >
            {step === 2 ? 'Finalizar y Confirmar Abono' : 'Siguiente'}
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
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);

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
                { value: 'Cotización', label: 'Cotización' },
                { value: 'Abono pendiente', label: 'Abono pendiente' },
                { value: 'Diseño', label: 'Diseño' },
                { value: 'Impresión', label: 'Impresión' },
                { value: 'Sublimación', label: 'Sublimación' },
                { value: 'Corte', label: 'Corte' },
                { value: 'Confección', label: 'Confección' },
                { value: 'Empaque', label: 'Empaque' },
                { value: 'Transporte', label: 'Transporte' },
                { value: 'Entregado', label: 'Entregado' },
              ]}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-lg tracking-tight text-foreground-main uppercase">Prendas</h4>
            <button 
              onClick={() => setItems([...items, { item_name: '', player_name: '', number: '', size: '', sleeve: 'Corta', collar_type: 'Cuello V', design_type: 'Jugador', fit: 'Horma Normal', garment_type: 'Camiseta', observations: '', sewing_price: 0, sale_price: 0 }])}
              className="bg-foreground-main text-background px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
            >
              + Agregar
            </button>
          </div>
          <div className="overflow-x-auto border border-border-custom rounded-[24px] bg-surface-hover">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-hover text-[9px] uppercase font-black tracking-[0.2em] text-foreground-muted">
                  <th className="py-4 px-4">Prenda</th>
                  <th className="py-4 px-4">Nombre</th>
                  <th className="py-4 px-4 text-center">N°</th>
                  <th className="py-4 px-4 text-center">Talla</th>
                  <th className="py-4 px-4 text-center">Manga</th>
                  <th className="py-4 px-4 text-center">Cuello</th>
                  <th className="py-4 px-4 text-center">Tipo</th>
                  <th className="py-4 px-4 text-center">Horma</th>
                  <th className="py-4 px-4">Observaciones</th>
                  <th className="py-4 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4">
                      <select 
                        value={item.garment_type || 'Camiseta'} 
                        onChange={e => { const newItems = [...items]; newItems[idx].garment_type = e.target.value; setItems(newItems); }} 
                        className="bg-transparent outline-none text-foreground-muted font-bold cursor-pointer text-[10px] uppercase"
                      >
                        <option className="bg-background">Camiseta</option>
                        <option className="bg-background">Camisa</option>
                        <option className="bg-background">Pantaloneta</option>
                        <option className="bg-background">Medias</option>
                        <option className="bg-background">Chaqueta</option>
                      </select>
                    </td>
                    <td className="py-3 px-4"><input type="text" value={item.player_name || ''} onChange={e => { const newItems = [...items]; newItems[idx].player_name = e.target.value; setItems(newItems); }} className="w-full bg-transparent outline-none font-bold text-foreground-main" placeholder="Nombre..." /></td>
                    <td className="py-3 px-4"><input type="text" value={item.number || ''} onChange={e => { const newItems = [...items]; newItems[idx].number = e.target.value; setItems(newItems); }} className="w-12 bg-transparent outline-none text-foreground-muted text-center" placeholder="00" /></td>
                    <td className="py-3 px-4"><input type="text" value={item.size || ''} onChange={e => { const newItems = [...items]; newItems[idx].size = e.target.value; setItems(newItems); }} className="w-10 bg-transparent outline-none text-foreground-muted text-center" placeholder="M" /></td>
                    <td className="py-3 px-4">
                      <select 
                        value={item.sleeve || 'Corta'} 
                        onChange={e => { const newItems = [...items]; newItems[idx].sleeve = e.target.value; setItems(newItems); }} 
                        className="bg-transparent outline-none text-foreground-muted font-bold cursor-pointer text-[10px] uppercase text-center"
                      >
                        <option className="bg-background">Corta</option>
                        <option className="bg-background">Larga</option>
                        <option className="bg-background">Sisa</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select 
                        value={item.collar_type || 'Cuello V'} 
                        onChange={e => { const newItems = [...items]; newItems[idx].collar_type = e.target.value; setItems(newItems); }} 
                        className="bg-transparent outline-none text-foreground-muted font-bold cursor-pointer text-[10px] uppercase text-center"
                      >
                        <option className="bg-background">Cuello V</option>
                        <option className="bg-background">Cuello Redondo</option>
                        <option className="bg-background">Cuello Polo</option>
                        <option className="bg-background">Cuello Mao</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select 
                        value={item.design_type || 'Jugador'} 
                        onChange={e => { const newItems = [...items]; newItems[idx].design_type = e.target.value; setItems(newItems); }} 
                        className="bg-transparent outline-none text-foreground-muted font-bold cursor-pointer text-[10px] uppercase text-center"
                      >
                        <option className="bg-background">Jugador</option>
                        <option className="bg-background">Portero</option>
                        <option className="bg-background">Cuerpo Técnico</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select 
                        value={item.fit || 'Horma Normal'} 
                        onChange={e => { const newItems = [...items]; newItems[idx].fit = e.target.value; setItems(newItems); }} 
                        className="bg-transparent outline-none text-foreground-muted font-bold cursor-pointer text-[10px] uppercase text-center"
                      >
                        <option className="bg-background">Horma Normal</option>
                        <option className="bg-background">Horma Slim</option>
                        <option className="bg-background">Horma Oversize</option>
                      </select>
                    </td>
                    <td className="py-3 px-4"><input type="text" value={item.observations || ''} onChange={e => { const newItems = [...items]; newItems[idx].observations = e.target.value; setItems(newItems); }} className="w-full bg-transparent outline-none text-foreground-muted text-[10px]" placeholder="Obs..." /></td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-accent hover:text-accent/80 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

// --- Order Details Component ---
function OrderDetails({ orderId, onBack, onUpdate, user, canEdit }: { orderId: number, onBack: () => void, onUpdate: () => void, user: User, canEdit: boolean, key?: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Order>>({});
  const [editItems, setEditItems] = useState<Partial<OrderItem>[]>([]);

  useEffect(() => {
    if (isEditing) {
      const total = editItems.reduce((sum, item) => sum + (item.sale_price || 0), 0);
      setEditData(prev => ({ ...prev, total_amount: total }));
    }
  }, [editItems, isEditing]);

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
  const [payments, setPayments] = useState<Payment[]>([]);

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

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderData, historyData] = await Promise.all([
        api.getOrder(orderId),
        api.getOrderHistory(orderId)
      ]);
      setOrder(orderData);
      setHistory(historyData);
      setEditData(orderData);
      setEditItems(orderData.items || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la orden');
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      await api.updateOrder(orderId, { ...editData, items: editItems, user_name: user.name });
      setIsEditing(false);
      await loadOrder();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    try {
      setError(null);
      await api.updateStatus(orderId, newStatus, user.name);
      await loadOrder();
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el estado');
      console.error('Error updating status:', err);
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
  const exportToExcel = () => {
    if (!order) return;

    // 🔹 1. Información general
    const orderInfo = [
      ["ORDEN", order.order_number],
      ["CLIENTE", order.client_name || "-"],
      [
        "DOCUMENTO",
        `${order.client_doc_type || ""} ${order.client_doc || ""}`.trim() || "-"
      ],
      ["ESTADO", order.status || "-"],
      ["FECHA", order.created_at || "-"],
      ["FECHA DE ENTREGA",
        order.delivery_date
          ? new Date(new Date(order.delivery_date).setDate(new Date(order.delivery_date).getDate() - 1))
              .toISOString()
              .split("T")[0]
          : "-"
      ],
      [],
      ["DETALLE DE PRENDAS"],
    ];

    // 🔹 2. Headers
    const headers = [[
      "Prenda",
      "Nombre / Jugador",
      "Número",
      "Talla",
      "Manga",
      "Cuello",
      "Tipo",
      "Horma",
      "Observaciones"
    ]];

    // 🔹 3. Items
    const itemsData = order.items?.map(item => ([
      item.garment_type,
      item.player_name || "-",
      item.number || "-",
      item.size || "-",
      item.sleeve || "-",
      item.collar_type || "-",
      item.design_type || "-",
      item.fit || "-",
      item.observations || "-"
    ])) || [];

    const finalData = [...orderInfo, ...headers, ...itemsData];

    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    // 🎨 ESTILOS
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

    // 🔹 4. Header index
    const headerRowIndex = orderInfo.length;

    // 🔹 5. Headers tabla
    headers[0].forEach((_, colIndex) => {
      const cell = XLSX.utils.encode_cell({ r: headerRowIndex, c: colIndex });
      if (worksheet[cell]) worksheet[cell].s = headerStyle;
    });

    // 🔹 6. Bordes en items
    itemsData.forEach((row, rowIndex) => {
      row.forEach((_, colIndex) => {
        const cell = XLSX.utils.encode_cell({
          r: headerRowIndex + 1 + rowIndex,
          c: colIndex
        });
        if (worksheet[cell]) worksheet[cell].s = cellBorder;
      });
    });

    // 🔹 7. Labels + valores
    for (let i = 0; i <= 5; i++) {
      const labelCell = XLSX.utils.encode_cell({ r: i, c: 0 });
      if (worksheet[labelCell]) worksheet[labelCell].s = labelStyle;

      const valueCell = XLSX.utils.encode_cell({ r: i, c: 1 });
      if (worksheet[valueCell]) worksheet[valueCell].s = valueStyle;
    }

    // 🔹 8. Merge DETALLE
    const detalleRowIndex = 7;

    worksheet["!merges"] = [
      {
        s: { r: detalleRowIndex, c: 0 },
        e: { r: detalleRowIndex, c: 8 }
      }
    ];

    const detalleCell = XLSX.utils.encode_cell({ r: detalleRowIndex, c: 0 });

    if (worksheet[detalleCell]) {
      worksheet[detalleCell].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center" },
        fill: { fgColor: { rgb: "F2F2F2" } }
      };
    }

    // 🔥 9. AUTO WIDTH INTELIGENTE (TODO)
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

      // límites para que no quede feo
      colWidths.push({
        wch: Math.min(Math.max(maxLength + 2, 10), 40)
      });
    }

    worksheet["!cols"] = colWidths;

    // 🔹 10. Exportar
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedido");

    XLSX.writeFile(workbook, `Pedido_${order.order_number}.xlsx`);
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
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-3 hover:text-foreground-main font-black uppercase tracking-widest text-[10px] transition-colors">
          <ArrowLeft size={20} className="text-accent" />
          Volver a Órdenes
        </button>
        <div className="flex items-center gap-4">
          {error && (
            <div className="bg-accent/10 text-accent px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-accent/20">
              <AlertCircle size={14} />
              {error}
            </div>
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
            order.status === 'Cotización' ? "bg-foreground-muted/10 text-foreground-muted border-border-custom" :
            "bg-accent text-white border-accent shadow-xl shadow-accent/20"
          )}>
            {order.status}
          </span>
          <button 
            onClick={exportToExcel}
            className="bg-surface-hover text-foreground-main px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover/80 transition-all border border-border-custom flex items-center gap-2"
          >
            <Download size={14} /> Exportar Excel
          </button>
        </div>
      </div>

      {showReceiptModal && lastPayment && (
        <ReceiptModal 
          order={order}
          payment={lastPayment}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Info & Items */}
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-surface p-12 rounded-[48px] border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32"></div>
            <div className="flex justify-between items-start mb-12 relative z-10">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-8">
                    {isChangingClient ? (
                      <div className="relative">
                        <div className="flex items-center gap-4 bg-background px-6 py-4 rounded-2xl border border-border-custom focus-within:border-accent/50 transition-all">
                          <Search size={20} className="text-foreground-muted/20" />
                          <input 
                            type="text" 
                            placeholder="Buscar cliente por nombre o documento..." 
                            value={clientSearch}
                            onChange={e => setClientSearch(e.target.value)}
                            className="bg-transparent outline-none w-full text-sm text-foreground-main placeholder:text-foreground-muted/10 font-bold"
                            autoFocus
                          />
                          <button onClick={() => setIsChangingClient(false)} className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent">Cerrar</button>
                        </div>
                        {searchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-4 bg-background rounded-[32px] border border-border-custom shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                            {searchResults.map(client => (
                              <button 
                                key={client.id}
                                onClick={() => {
                                  setEditData({
                                    ...editData,
                                    client_id: client.id,
                                    client_name: client.name,
                                    client_doc: client.doc,
                                    client_phone: client.phone,
                                    client_address: client.address,
                                    client_city: client.city
                                  });
                                  setIsChangingClient(false);
                                  setClientSearch('');
                                }}
                                className="w-full px-8 py-5 text-left hover:bg-accent/10 flex items-center justify-between group transition-colors border-b border-border-custom last:border-0"
                              >
                                <div>
                                  <p className="font-black text-base text-foreground-main tracking-tight group-hover:text-accent transition-colors">{client.name}</p>
                                  <p className="text-[10px] text-foreground-muted font-bold uppercase tracking-[0.2em] mt-1">{client.doc} • {client.city}</p>
                                </div>
                                <ChevronRight size={18} className="text-foreground-muted/10 group-hover:text-accent transition-colors" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between gap-6">
                          <input 
                            type="text" 
                            value={editData.client_name} 
                            onChange={e => setEditData({...editData, client_name: e.target.value})}
                            className="text-4xl font-black tracking-tighter w-full bg-surface-hover px-6 py-4 rounded-2xl border border-border-custom outline-none text-foreground-main focus:border-accent/50 transition-all"
                          />
                          <button 
                            onClick={() => setIsChangingClient(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent whitespace-nowrap bg-accent/10 px-4 py-2 rounded-xl border border-accent/20"
                          >
                            Cambiar Cliente
                          </button>
                        </div>
                        <div className="flex gap-6">
                          <div className="flex-1 space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-foreground-muted/20 ml-2">N° Orden</label>
                            <input 
                              type="text" 
                              value={editData.order_number} 
                              onChange={e => setEditData({...editData, order_number: e.target.value})}
                              className="w-full text-foreground-main font-black text-sm bg-surface-hover px-6 py-3 rounded-2xl border border-border-custom outline-none focus:border-accent/50 transition-all uppercase tracking-widest"
                            />
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-foreground-muted/20 ml-2">Ciudad</label>
                            <input 
                              type="text" 
                              value={editData.client_city} 
                              onChange={e => setEditData({...editData, client_city: e.target.value})}
                              className="w-full text-foreground-main font-black text-sm bg-surface-hover px-6 py-3 rounded-2xl border border-border-custom outline-none focus:border-accent/50 transition-all uppercase tracking-widest"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-10 py-12 border-y border-border-custom relative z-10">

            {/* DOCUMENTO */}
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Documento</p>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData.client_doc} 
                  onChange={e => setEditData({...editData, client_doc: e.target.value})}
                  className="font-black text-sm bg-surface-hover px-5 py-3 rounded-xl border border-border-custom outline-none w-full text-foreground-main focus:border-accent/50 transition-all"
                />
              ) : (
                <p className="font-black text-foreground-main tracking-tight">
                  {order.client_doc_type} - {order.client_doc}
                </p>
              )}
            </div>

            {/* TELÉFONO */}
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Teléfono</p>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData.client_phone} 
                  onChange={e => setEditData({...editData, client_phone: e.target.value})}
                  className="font-black text-sm bg-surface-hover px-5 py-3 rounded-xl border border-border-custom outline-none w-full text-foreground-main focus:border-accent/50 transition-all"
                />
              ) : (
                <p className="font-black text-foreground-main tracking-tight">
                  {order.client_phone}
                </p>
              )}
            </div>

            {/* ENTREGA */}
            <div className="min-w-[150px] flex-1 space-y-3">
              <p className="font-black text-foreground-main">Entrega</p>
              {isEditing ? (
                <input 
                  type="date" 
                  value={editData.delivery_date ? editData.delivery_date.split('T')[0] : ''} 
                  onChange={e => setEditData({...editData, delivery_date: e.target.value})}
                  className="font-black text-sm bg-surface-hover px-5 py-3 rounded-xl border border-border-custom outline-none w-full text-foreground-main focus:border-accent/50 transition-all [color-scheme:dark]"
                />
              ) : (
                <p className="font-black text-foreground-main tracking-tight">
                  {order.delivery_date ? format(new Date(order.delivery_date), 'dd/MM/yyyy') : 'N/A'}
                </p>
              )}
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

          </div>

          <div className="bg-surface rounded-[48px] border border-border-custom shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32"></div>
            <div className="p-12 border-b border-border-custom flex items-center justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                  <Shirt className="text-accent" size={24} />
                </div>
                <div>
                  <h4 className="font-black text-foreground-main uppercase tracking-[0.4em] text-[11px]">Listado de Prendas</h4>
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
                    <th className="py-10 px-6 border-b border-border-custom text-center">Cuello</th>
                    <th className="py-10 px-6 border-b border-border-custom text-center">Tipo</th>
                    <th className="py-10 px-6 border-b border-border-custom text-center">Horma</th>
                    <th className="py-10 px-8 border-b border-border-custom">Prenda</th>
                    <th className="py-10 px-10 border-b border-border-custom">Observaciones</th>
                    {isEditing && <th className="py-10 px-10 border-b border-border-custom text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom">
                  {(isEditing ? editItems : order.items)?.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gradient-to-r hover:from-accent/[0.03] hover:to-transparent transition-all duration-700 group border-b border-border-custom/50 last:border-0">
                      <td className="py-12 px-10">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={item.player_name || ''} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], player_name: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-6 py-4 rounded-2xl border border-border-custom outline-none w-full text-foreground-main font-black text-sm focus:border-accent/50 transition-all placeholder:text-foreground-muted/20 shadow-inner"
                            placeholder="Nombre..."
                          />
                        ) : (
                          <div className="flex flex-col group/name">
                            <span className="font-black text-foreground-main tracking-tighter group-hover:text-accent transition-all duration-500 uppercase drop-shadow-lg">{item.player_name || '-'}</span>
                            <div className="h-[1px] w-0 group-hover:w-12 bg-accent/50 transition-all duration-700 mt-1"></div>
                          </div>
                        )}
                      </td>
                      <td className="py-12 px-6 text-center">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={item.number || ''} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], number: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-4 py-4 rounded-2xl border border-border-custom outline-none w-20 text-foreground-main font-black text-center focus:border-accent/50 transition-all shadow-inner"
                            placeholder="00"
                          />
                        ) : <span className="font-black text-foreground-main tracking-tighter group-hover:text-foreground-main transition-all duration-700">{item.number || '-'}</span>}
                      </td>
                      <td className="py-12 px-6 text-center">
                        {isEditing ? (
                          <select value={item.size || ''} onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], size: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer transition-all"
                          >
                            <option value="">Talla</option>
                            {SIZES.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        ) : <span className="font-black text-foreground-main tracking-tighter group-hover:text-accent transition-all duration-500">{item.size || '-'}</span>}
                      </td>
                      <td className="py-12 px-6 text-center">
                        {isEditing ? (
                          <select 
                            value={item.sleeve || 'Corta'} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], sleeve: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-4 py-4 rounded-2xl border border-border-custom outline-none w-28 text-foreground-main font-black text-center focus:border-accent/50 transition-all shadow-inner appearance-none"
                          >
                            <option value="Corta">Corta</option>
                            <option value="Larga">Larga</option>
                          </select>
                        ) : <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.sleeve || '-'}</span>}
                      </td>
                      <td className="py-12 px-6 text-center">
                        {isEditing ? (
                          <select 
                            value={item.collar_type || 'Cuello V'} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], collar_type: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-4 py-4 rounded-2xl border border-border-custom outline-none w-28 text-foreground-main font-black text-center focus:border-accent/50 transition-all shadow-inner appearance-none"
                          >
                            <option value="Cuello V">Cuello V</option>
                            <option value="Cuello Redondo">Cuello Redondo</option>
                            <option value="Cuello Polo">Cuello Polo</option>
                            <option value="Cuello Mao">Cuello Mao</option>
                          </select>
                        ) : <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.collar_type || '-'}</span>}
                      </td>
                      <td className="py-12 px-6 text-center">
                        {isEditing ? (
                          <select 
                            value={item.design_type} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], design_type: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-4 py-4 rounded-2xl border border-border-custom outline-none w-28 text-foreground-main font-black text-center focus:border-accent/50 transition-all shadow-inner appearance-none"
                          >
                            <option value="Jugador">Jugador</option>
                            <option value="Portero">Portero</option>
                            <option value="Cuerpo Técnico">Cuerpo Técnico</option>
                          </select>
                        ) : <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.design_type || '-'}</span>}
                      </td>
                      <td className="py-12 px-6 text-center">
                        {isEditing ? (
                          <select 
                            value={item.fit} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], fit: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-4 py-4 rounded-2xl border border-border-custom outline-none w-32 text-foreground-main font-black text-center focus:border-accent/50 transition-all shadow-inner appearance-none"
                          >
                            <option value="Horma Normal">Horma Normal</option>
                            <option value="Horma Slim">Horma Slim</option>
                            <option value="Horma Oversize">Horma Oversize</option>
                          </select>
                        ) : <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.fit || '-'}</span>}
                      </td>
                      <td className="py-10 px-8">
                        {isEditing ? (
                          <select 
                            value={item.garment_type} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], garment_type: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-6 py-4 rounded-2xl border border-border-custom outline-none text-foreground-main font-black text-sm focus:border-accent/50 transition-all w-full appearance-none cursor-pointer uppercase"
                          >
                            <option className="bg-surface">Camiseta</option>
                            <option className="bg-surface">Camisa</option>
                            <option className="bg-surface">Pantaloneta</option>
                            <option className="bg-surface">Medias</option>
                            <option className="bg-surface">Chaqueta</option>
                          </select>
                        ) : <span className="font-black text-foreground-main text-xs uppercase tracking-widest">{item.garment_type}</span>}
                      </td>
                      <td className="py-10 px-10">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={item.observations} 
                            onChange={e => {
                              const newItems = [...editItems];
                              newItems[idx] = { ...newItems[idx], observations: e.target.value };
                              setEditItems(newItems);
                            }}
                            className="bg-surface-hover px-6 py-4 rounded-2xl border border-border-custom outline-none w-full text-foreground-main font-black text-sm focus:border-accent/50 transition-all"
                            placeholder="Observaciones..."
                          />
                        ) : <span className="text-foreground-main italic text-[11px] font-bold leading-relaxed">{item.observations || '-'}</span>}
                      </td>
                      {isEditing && (
                        <td className="py-8 px-10 text-right">
                          <button 
                            onClick={() => {
                              const newItems = editItems.filter((_, i) => i !== idx);
                              setEditItems(newItems);
                            }}
                            className="w-10 h-10 rounded-xl bg-accent/10 text-accent hover:bg-accent hover:text-foreground-main transition-all flex items-center justify-center group/del"
                          >
                            <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEditing && (
              <div className="p-12 bg-foreground-main/[0.01] border-t border-border-custom relative z-10">
                <button 
                  onClick={() => setEditItems([...editItems, { player_name: '', number: '', size: '', sleeve: 'Corta', collar_type: 'Cuello V', design_type: 'Jugador', fit: 'Horma Normal', garment_type: 'Camiseta', observations: '', sewing_price: 0, sale_price: 0 }])}
                  className="w-full py-6 rounded-3xl border-2 border-dashed border-border-custom text-foreground-muted/20 font-black uppercase tracking-[0.3em] text-[10px] hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-4"
                >
                  <Plus size={20} />
                  Añadir Prenda al Listado
                </button>
              </div>
            )}
          </div>

          <div className="bg-surface p-12 rounded-[48px] border border-border-custom shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 blur-[100px] -ml-32 -mb-32"></div>
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/5">
                    <FileText className="text-accent" size={24} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground-main">Notas del Pedido</h4>
                    <p className="text-[9px] font-bold text-foreground-main uppercase tracking-widest mt-1">Instrucciones especiales</p>
                  </div>
                </div>
              </div>
              {isEditing ? (
                <div className="relative group">
                  <textarea 
                    value={editData.notes} 
                    onChange={e => setEditData({...editData, notes: e.target.value})}
                    className="w-full h-64 bg-surface-hover p-10 rounded-[40px] border border-border-custom outline-none text-foreground-main font-bold text-sm focus:border-accent/30 transition-all resize-none leading-relaxed shadow-inner"
                    placeholder="Añadir notas internas o instrucciones especiales..."
                  />
                  <div className="absolute bottom-6 right-8 text-[9px] font-black text-foreground-muted/20 uppercase tracking-widest">Editor de Notas</div>
                </div>
              ) : (
                <div className="bg-foreground-main/[0.02] p-10 rounded-[40px] border border-border-custom relative group">
                  <Quote className="absolute top-8 right-10 text-foreground-main/[0.02] group-hover:text-accent/5 transition-colors" size={80} />
                  <p className="text-foreground-muted/50 font-bold leading-relaxed italic text-base relative z-10">
                    {order.notes || "Sin notas adicionales para esta orden."}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Actions & Design */}
        <div className="space-y-10">
          {/* Payment History */}
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <h4 className="font-black text-foreground-main text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
              <DollarSign size={16} className="text-accent" /> Historial de Ordenes
            </h4>
            <div className="space-y-4">
              {payments.map((p) => (
                <div key={p.id} className="p-6 rounded-3xl bg-background border border-border-custom hover:border-accent/30 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest bg-surface-hover px-2 py-1 rounded-lg">
                      {format(new Date(p.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>
                  <p className="text-[10px] text-foreground-muted italic leading-relaxed">{p.notes}</p>
                  <div className="mt-4 pt-4 border-t border-border-custom flex justify-between items-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted/40">Por: {p.created_by}</p>
                    <button 
                      onClick={() => {
                        setLastPayment(p);
                        setShowReceiptModal(true);
                      }}
                      className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline"
                    >
                      Ver Recibo
                    </button>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <div className="text-center py-12 bg-background rounded-[32px] border border-dashed border-border-custom">
                  <DollarSign className="mx-auto text-foreground-muted opacity-20 mb-4" size={40} />
                  <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest italic">No hay abonos registrados</p>
                </div>
              )}
            </div>
          </div>

          {/* Design References */}
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <h4 className="font-black text-foreground-main text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
              <Image size={16} className="text-accent" /> Referencias de Diseño (Cliente)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {order.references?.filter(r => {
                const orderCategories = Array.from(new Set(order.items?.map(item => item.garment_type).filter(Boolean) || [])) as string[];
                return !orderCategories.includes(r.comments || '');
              }).map((ref, i) => (
                <div key={i} className="aspect-square rounded-3xl overflow-hidden border border-border-custom group relative bg-background">
                  <img src={ref.file_path} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-300 backdrop-blur-sm">
                    <a 
                      href={ref.file_path} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all"
                    >
                      <ExternalLink size={20} />
                    </a>
                    <a 
                      href={ref.file_path} 
                      download 
                      className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={20} />
                    </a>
                  </div>
                </div>
              ))}
              {(!order.references || order.references.filter(r => {
                const orderCategories = Array.from(new Set(order.items?.map(item => item.garment_type).filter(Boolean) || [])) as string[];
                return !orderCategories.includes(r.comments || '');
              }).length === 0) && (
                <div className="col-span-2 py-12 text-center border-2 border-dashed border-border-custom rounded-[32px] bg-background">
                  <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest italic">Sin referencias cargadas</p>
                </div>
              )}
              {isEditing && (
                <div className="col-span-2 space-y-4 pt-4 border-t border-border-custom">
                  <div className="relative group">
                    <div className="border-2 border-dashed border-border-custom rounded-[24px] p-6 text-center hover:border-accent/40 transition-all cursor-pointer relative bg-background">
                      <input 
                        type="file" 
                        multiple 
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          setNewReferences(files);
                          const previews = files.map(file => URL.createObjectURL(file as File));
                          setNewReferencePreviews(previews);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                      />
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <Plus size={20} className="text-accent" />
                        <p className="text-[9px] font-black text-foreground-main uppercase tracking-widest">Añadir Referencias</p>
                      </div>
                    </div>
                  </div>
                  {newReferencePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {newReferencePreviews.map((preview, i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border-custom relative group">
                          <img src={preview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => {
                              setNewReferences(newReferences.filter((_, idx) => idx !== i));
                              setNewReferencePreviews(newReferencePreviews.filter((_, idx) => idx !== i));
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-foreground-main rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {newReferences.length > 0 && (
                    <button 
                      onClick={handleAddReferences}
                      disabled={isUploading}
                      className="w-full bg-accent text-white py-3 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                    >
                      {isUploading ? <Clock className="animate-spin" size={14} /> : <Upload size={14} />}
                      Subir Referencias
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Final Designs per Category (Designer Only) */}
          {(role === 'Admin' || role === 'Diseño') && (
            <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
              <h4 className="font-black text-foreground-main text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                <Palette size={16} className="text-accent" /> Diseño ejemplo del Cliente
              </h4>
              <p className="text-foreground-muted text-[9px] font-black uppercase tracking-widest leading-relaxed">Carga el diseño para cada categoría de prenda. Estos se visualizarán en el seguimiento del cliente.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(Array.from(new Set(order.items?.map(item => item.garment_type).filter(Boolean) || [])) as string[]).map((cat) => {
                  const design = [...(order.references || [])].reverse().find(r => r.comments === cat);
                  return (
                    <div key={cat} className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">{cat}</p>
                      {design ? (
                        <div className="aspect-video rounded-3xl overflow-hidden border border-border-custom relative group shadow-lg">
                          <img 
                            src={design.file_path} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
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
                              <label className="cursor-pointer p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all">
                                <Upload size={20} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  onChange={e => e.currentTarget.form?.requestSubmit()} 
                                />
                              </label>
                            </form>
                            <a 
                              href={design.file_path} 
                              download 
                              className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all"
                              target="_blank"
                              rel="noreferrer"
                            >
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
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={e => e.currentTarget.form?.requestSubmit()} 
                            />
                          </label>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Workflow Actions */}
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <h4 className="font-black text-foreground-main text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
              <CheckCircle2 size={16} className="text-accent" /> Acciones de Flujo
            </h4>
            
            <div className="space-y-4">

              {order.status === 'Abono confirmado' && (role === 'Admin' || role === 'Ventas') && (
                <button 
                  onClick={() => handleStatusUpdate('En diseño')}
                  className="w-full bg-foreground-main text-background py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-foreground-main/90 transition-all"
                >
                  <Palette size={18} /> Iniciar Diseño
                </button>
              )}

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
                  <button 
                  onClick={handleApproveDesign}
                  className="bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(22,163,74,0.2)]"
                >
                  Aprobar
                </button>
                  <button 
                    onClick={() => setShowRejectModal(true)}
                    className="bg-accent hover:bg-accent/90 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                  >
                    Corregir
                  </button>
                </div>
              )}

              {order.status === 'Diseño aprobado' && (role === 'Admin' || role === 'Diseño') && (
                <button 
                  onClick={() => handleStatusUpdate('En impresión')}
                  className="w-full bg-foreground-main text-background py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-foreground-main/90 transition-all"
                >
                  <Printer size={18} /> Liberar a Producción
                </button>
              )}

              {/* Botones de avance para estados de producción */}
              {(['En impresión', 'En sublimación', 'En corte', 'En confección', 'En empaque', 'En despacho', 'En transporte'] as OrderStatus[]).includes(order.status) && (role === 'Admin' || role === 'Ventas' || role === 'Impresión' || role === 'Sublimación' || role === 'Corte' || role === 'Confección' || role === 'Empaque' || role === 'Transporte') && (() => {
                const nextMap: Partial<Record<OrderStatus, OrderStatus>> = {
                  'En impresión': 'En sublimación',
                  'En sublimación': 'En corte',
                  'En corte': 'En confección',
                  'En confección': 'En empaque',
                  'En empaque': 'En despacho',
                  'En despacho': 'En transporte',
                  'En transporte': 'Entregado',
                };
                const next = nextMap[order.status];
                if (!next) return null;
                return (
                  <button
                    onClick={() => handleStatusUpdate(next)}
                    className="w-full bg-foreground-main text-background py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-foreground-main/90 transition-all"
                  >
                    <CheckCircle2 size={18} /> Avanzar a: {next}
                  </button>
                );
              })()}

              {order.status === 'Entregado' && (
                <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-500">✓ Orden completada y entregada</p>
                </div>
              )}
            </div>
          </div>

          {/* Design Versions */}
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
                <div key={v.id} className="flex gap-6 p-6 rounded-[32px] border border-border-custom hover:bg-background transition-all group cursor-pointer">
                  <div className="w-24 h-24 bg-background rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-border-custom group-hover:border-accent/30 transition-colors">
                    {v.file_path ? (
                      <img src={v.file_path} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    ) : (
                      <Palette size={28} className="text-foreground-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-black text-foreground-main text-base tracking-tight group-hover:text-accent transition-colors">Versión {v.version_number}</p>
                      <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest bg-background px-2 py-1 rounded-lg">{format(new Date(v.created_at), 'dd/MM')}</span>
                    </div>
                    <p className="text-[11px] text-foreground-muted line-clamp-2 leading-relaxed italic mb-3">{v.comments}</p>
                    {v.client_comments && (
                      <div className="mb-3 p-3 bg-accent/5 border border-accent/10 rounded-xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-1 flex items-center gap-1.5"><MessageSquare size={10} /> Comentarios del Cliente:</p>
                        <p className="text-[11px] text-foreground-main italic">{v.client_comments}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border",
                        v.status === 'Aprobado' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-accent/10 text-accent border-accent/20"
                      )}>
                        {v.status}
                      </span>
                      {v.file_path && (
                        <a 
                          href={v.file_path} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[9px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground-main transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <ExternalLink size={12} /> Ver Full
                        </a>
                      )}
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
          </div>
        </div>

        </div>

        {/* Order History */}
          <div className="bg-surface p-8 rounded-[40px] border border-border-custom shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-foreground-main text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                <History size={16} className="text-accent" /> Historial de Cambios
              </h4>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent/90 transition-colors"
              >
                {showHistory ? 'Ocultar' : 'Ver Todo'}
              </button>
            </div>
            
            <div className={cn("space-y-6 transition-all overflow-hidden relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom", showHistory ? "max-h-[500px] overflow-y-auto pr-2" : "max-h-[200px]")}>
              {history.map((h) => (
                <div key={h.id} className="relative pl-8 group">
                  <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-surface border-2 border-border-custom group-hover:border-accent transition-colors" />
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[11px] font-black text-foreground-main tracking-tight leading-tight">{h.action}</p>
                    <span className="text-[9px] text-foreground-muted font-bold uppercase tracking-widest">{format(new Date(h.created_at), 'dd/MM HH:mm')}</span>
                  </div>
                  <p className="text-[10px] text-foreground-muted leading-relaxed mb-1">{h.details}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Por: {h.user_name}</p>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-[10px] text-foreground-muted font-black uppercase tracking-widest italic text-center py-8">Sin historial registrado</p>
              )}
            </div>
            
          </div>

        {showReceiptModal && lastPayment && order && (
          <ReceiptModal 
            payment={lastPayment}
            order={order}
            onClose={() => setShowReceiptModal(false)}
          />
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-md rounded-[40px] p-10 border border-border-custom shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[60px] -mr-16 -mt-16"></div>
              <h3 className="text-2xl font-black text-foreground-main tracking-tighter mb-2 relative z-10">Solicitar Correcciones</h3>
              <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-8 relative z-10">
                Detalla los cambios necesarios para el diseñador
              </p>
              
              <form onSubmit={handleRejectDesign} className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-foreground-muted mb-3">
                    Comentarios y Correcciones
                  </label>
                  <textarea 
                    value={rejectComment}
                    onChange={e => setRejectComment(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-2xl p-6 text-foreground-main text-sm font-bold outline-none focus:border-accent/50 transition-all resize-none min-h-[120px]"
                    placeholder="Ej. Cambiar el color del logo, ajustar el tamaño de la tipografía..."
                    required
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectComment('');
                    }}
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground-main hover:bg-surface-hover transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingReject || !rejectComment.trim()}
                    className="flex-1 bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-accent/90 transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingReject ? <Clock className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    Enviar Correcciones
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    );
}

// --- KDS Component ---
function KDS({ orders, user, onOrderClick, onUpdate }: { orders: Order[], user: User, onOrderClick: (id: number) => void, onUpdate: () => void, key?: string }) {
  const role = user.role;
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'Todos'>('Todos');
  const [showAssign, setShowAssign] = useState<Order | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignment, setAssignment] = useState({ employee_id: '', garment_count: 0, price_per_unit: 0 });
  const [teamFilter, setTeamFilter] = useState<string>('Todos');
  const [dateField, setDateField] = useState<'created_at' | 'delivery_date'>('delivery_date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const availableTeams = ['Todos', ...Array.from(new Set(
    orders.filter(o => o.team_name).map(o => o.team_name as string)
  ))];

  useEffect(() => {
    if (role === 'Admin' || role === 'Confección' || role === 'Empaque') {
      api.getEmployees().then(setEmployees).catch(console.error);
    }
  }, [role]);

  const departmentMap: Record<string, OrderStatus[]> = {
    'Diseño': ['En diseño', 'Versión enviada', 'Corrección solicitada'],
    'Impresión': ['En impresión'],
    'Sublimación': ['En sublimación'],
    'Corte': ['En corte'],
    'Confección': ['En confección'],
    'Empaque': ['En empaque'],
    'Transporte': ['En despacho', 'En transporte']
  };

  const nextStatusMap: Record<OrderStatus, OrderStatus> = {
    'Cotización': 'Abono pendiente',
    'Abono pendiente': 'Abono confirmado',
    'Abono confirmado': 'En diseño',
    'En diseño': 'Versión enviada',
    'Versión enviada': 'Diseño aprobado',
    'Corrección solicitada': 'Versión enviada',
    'Diseño aprobado': 'Arte final cargado',
    'Arte final cargado': 'En impresión',
    'En impresión': 'En sublimación',
    'En sublimación': 'En corte',
    'En corte': 'En confección',
    'En confección': 'En empaque',
    'En empaque': 'En despacho',
    'En despacho': 'En transporte',
    'En transporte': 'Entregado',
    'Entregado': 'Entregado',
    'Devuelto': 'Devuelto'
  };

  const previousStatusMap: Record<OrderStatus, OrderStatus> = {
    'Cotización': 'Cotización',
    'Abono pendiente': 'Cotización',
    'Abono confirmado': 'Abono pendiente',
    'En diseño': 'Abono confirmado',
    'Versión enviada': 'En diseño',
    'Corrección solicitada': 'En diseño',
    'Diseño aprobado': 'Versión enviada',
    'Arte final cargado': 'Diseño aprobado',
    'En impresión': 'Arte final cargado',
    'En sublimación': 'En impresión',
    'En corte': 'En sublimación',
    'En confección': 'En corte',
    'En empaque': 'En confección',
    'En despacho': 'En empaque',
    'En transporte': 'En despacho',
    'Entregado': 'En transporte',
    'Devuelto': 'Devuelto'
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
    if (o.status === 'Entregado' || o.status === 'Cotización') return false;

    if (role !== 'Admin' && !departmentMap[role]?.includes(o.status)) return false;
    if (role === 'Admin' && statusFilter !== 'Todos' && o.status !== statusFilter) return false;

    const matchesTeam = teamFilter === 'Todos' || o.team_name === teamFilter;
    if (!matchesTeam) return false;

    if (dateFrom || dateTo) {
      const raw = o[dateField];
      if (!raw) return false;
      const orderDate = new Date(raw).toISOString().split('T')[0];
      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
    }

    return true;
  });

  const allStatuses: OrderStatus[] = [
    'Abono pendiente', 'Abono confirmado', 'En diseño', 'Versión enviada',
    'Corrección solicitada', 'Diseño aprobado', 'Arte final cargado',
    'En impresión', 'En sublimación', 'En corte', 'En confección',
    'En empaque', 'En despacho', 'En transporte'
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-4xl font-black text-foreground-main tracking-tighter uppercase">
              KDS: {role}
            </h3>
          </div>
          <div className="flex items-center gap-6 bg-surface px-6 py-3 rounded-2xl border border-border-custom">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">A tiempo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Próximo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_var(--accent-glow)]"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">Vencido</span>
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de estado (solo Admin) */}
          {role === 'Admin' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-surface border border-border-custom rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20 text-foreground-main transition-all appearance-none cursor-pointer"
            >
              <option value="Todos" className="bg-surface">Todos los estados</option>
              {allStatuses.map(s => (
                <option key={s} value={s} className="bg-surface">{s}</option>
              ))}
            </select>
          )}

          {/* Filtro por Equipo */}
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="bg-surface border border-border-custom rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20 text-foreground-main transition-all appearance-none cursor-pointer"
          >
            {availableTeams.map(team => (
              <option key={team} value={team} className="bg-surface">{team}</option>
            ))}
          </select>

          {/* Filtro por Fechas */}
          <div className="flex items-center gap-3 bg-surface border border-border-custom rounded-2xl px-5 py-2.5">
            <select
              value={dateField}
              onChange={e => setDateField(e.target.value as any)}
              className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none text-foreground-muted cursor-pointer appearance-none"
            >
              <option value="delivery_date">Entrega</option>
              <option value="created_at">Creación</option>
            </select>
            <div className="w-[1px] h-4 bg-border-custom" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none cursor-pointer [color-scheme:dark] w-32"
            />
            <span className="text-[10px] font-black text-foreground-muted">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-transparent text-[10px] font-black text-foreground-main outline-none cursor-pointer [color-scheme:dark] w-32"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-foreground-muted hover:text-accent transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Contador */}
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'orden' : 'órdenes'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredOrders.map(order => {
          const daysLeft = order.delivery_date
            ? differenceInBusinessDays(new Date(order.delivery_date), new Date())
            : 0;

          const colorClass = daysLeft < 0
            ? "border-accent shadow-accent/20"
            : daysLeft < 3
            ? "border-yellow-500 shadow-yellow-500/20"
            : "border-green-500 shadow-green-500/20";

          const statusColorClass = daysLeft < 0
            ? "text-accent"
            : daysLeft < 3
            ? "text-yellow-500"
            : "text-green-500";

          return (
            <motion.div
              key={order.id}
              whileHover={{ y: -5 }}
              onClick={() => onOrderClick(order.id)}
              className={cn(
                "bg-surface p-8 rounded-[40px] border-l-[12px] shadow-2xl cursor-pointer flex flex-col h-full border-border-custom transition-all hover:bg-background relative overflow-hidden group",
                colorClass
              )}
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink size={14} className="text-foreground-muted" />
              </div>

              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted">
                  {order.order_number}
                </p>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-background border border-border-custom",
                  statusColorClass
                )}>
                  {daysLeft < 0
                    ? `Vencido ${Math.abs(daysLeft)}d`
                    : `${daysLeft} días`}
                </div>
              </div>

              <h4 className="font-black text-lg mb-1 text-foreground-main tracking-tight leading-tight">
                {order.client_name}
              </h4>

              {order.team_name && (
                <p className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5 mb-4">
                  <Users size={12} /> {order.team_name}
                </p>
              )}

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Prendas</span>
                  <span className="text-sm font-black text-foreground-main tracking-tighter">
                    {order.items?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">Estado</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
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
            </motion.div>
          );
        })}
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

// --- Client Roadmap Component ---
function ClientRoadmap({ orders, user, initialSearch = '', role }: { orders: Order[], user?: User, initialSearch?: string, role: Role, key?: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

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
          // Busca directo en la API, no en el array local
          const allOrders = await api.getOrders(false);
          const order = allOrders.find(o => 
            o.order_number.toLowerCase() === initialSearch.toLowerCase()
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
      const order = allOrders.find(o => 
        o.order_number.toLowerCase() === search.toLowerCase()
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

  const handleSaveItems = async () => {
    if (!foundOrder) return;
    setIsSavingItems(true);
    try {
      await api.updateOrder(foundOrder.id, { 
        ...foundOrder, 
        items: editingItems,
        user_name: user?.name || 'Cliente'
      });
      handleSearch();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleApproveDesign = async () => {
    if (!foundOrder || !foundOrder.versions || foundOrder.versions.length === 0) return;
    try {
      const latestVersion = foundOrder.versions[foundOrder.versions.length - 1];
      await api.updateDesignVersionStatus(latestVersion.id, foundOrder.id, 'Diseño aprobado', '', user?.name || 'Cliente');
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
      await api.updateDesignVersionStatus(latestVersion.id, foundOrder.id, 'Corrección solicitada', rejectComment, user?.name || 'Cliente');
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

  const isDesignPhase = foundOrder && ['En diseño', 'Versión enviada', 'En corte', 'En impresión', 'En sublimación', 'En confección',
    'En empaque', 'En transporte', 'Entregado', 'Corrección solicitada', 'Arte final cargado'].includes(foundOrder.status);

  const canFillItems = foundOrder?.status === 'Diseño aprobado';

  const isPostDesign = foundOrder && ['En impresión', 'En sublimación', 'En corte', 
  'En confección', 'En empaque', 'En transporte', 'Entregado'].includes(foundOrder.status);

  const steps: OrderStatus[] = [
    'Cotización', 'Abono confirmado', 'En diseño', 'Diseño aprobado', 'En impresión', 'En sublimación', 'En corte', 'En confección', 'En empaque', 'En transporte', 'Entregado'
  ];

  const getDisplayStatus = (status: OrderStatus) => {
    if (['En diseño', 'Versión enviada', 'Corrección solicitada'].includes(status)) {
      return 'En espera por aprobación';
    }
    if (status === 'Arte final cargado') {
      return 'Diseño aprobado';
    }
    return status;
  };

  const getNormalizedStatus = (status: OrderStatus): OrderStatus => {
    if (['Versión enviada', 'Corrección solicitada'].includes(status)) return 'En diseño';
    if (status === 'Arte final cargado') return 'Diseño aprobado';
    return status;
  };

  const getStepTime = (step: OrderStatus, index: number) => {
    if (!foundOrder || !foundOrder.history) return null;
    
    // Find when this step started
    let startTime: Date | null = null;
    if (index === 0) {
      startTime = new Date(foundOrder.created_at);
    } else {
      // Find the history entry where status changed to this step
      // History is sorted DESC (newest first), so we reverse to find the FIRST time it entered this state
      const historyEntry = [...foundOrder.history].reverse().find(h => 
        h.action === 'Cambio de Estado' && h.details.includes(step)
      );
      if (historyEntry) {
        startTime = new Date(historyEntry.created_at);
      }
    }

    if (!startTime) return null;

    // Find when the NEXT step started (to calculate duration)
    let endTime: Date | null = null;
    if (index < currentStepIndex) {
      const nextStep = steps[index + 1];
      const nextHistoryEntry = [...foundOrder.history].reverse().find(h => 
        h.action === 'Cambio de Estado' && h.details.includes(nextStep)
      );
      if (nextHistoryEntry) {
        endTime = new Date(nextHistoryEntry.created_at);
      } else {
        // Fallback: if next step history is missing, use the next available step's time
        for (let i = index + 1; i <= currentStepIndex; i++) {
           const futureStep = steps[i];
           const futureEntry = [...foundOrder.history].reverse().find(h => 
             h.action === 'Cambio de Estado' && h.details.includes(futureStep)
           );
           if (futureEntry) {
             endTime = new Date(futureEntry.created_at);
             break;
           }
        }
      }
    } else if (index === currentStepIndex) {
      endTime = new Date(); // Current step is still ongoing
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

  const currentStepIndex = foundOrder ? steps.indexOf(getNormalizedStatus(foundOrder.status)) : -1;

  const SIZES = ['2','4','6','8','10','12','14','16','S','M','L','XL','XXL'];
  
  const handleReferenceUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!foundOrder) return;
    try {
      const formData = new FormData(e.currentTarget);
      await api.uploadReferences(foundOrder.id, formData, user?.name || 'Cliente');
      handleSearch();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto space-y-16">
      <div className="text-center space-y-6">
        <h3 className="text-4xl font-black tracking-tighter text-foreground-main">Sigue tu Pedido</h3>
        <p className="text-foreground-muted text-[10px] font-black tracking-[0.3em]">Ingresa tu número de orden para ver el estado técnico en tiempo real</p>
        <div className="flex flex-col md:flex-row max-w-xl mx-auto gap-4 pt-4">
          <input 
            type="text" 
            placeholder="EJ. ORD-ABC123" 
            value={search}
            onChange={e => setSearch(e.target.value)}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface p-12 border border-border-custom shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
          <div className="absolute top-0 left-0 w-1/3 h-1 bg-accent"></div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-10">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted mb-3">Estado Actual del Proceso</p>
              <h4 className="text-4xl font-black text-accent tracking-tighter uppercase">{getDisplayStatus(foundOrder.status)}</h4>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4">
              <div className="text-center md:text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted mb-3">Fecha Estimada de Entrega</p>
                <h4 className="text-3xl font-black tracking-tighter transition-all duration-500"
                  style={{ color: canFillItems || isPostDesign ? 'var(--text-main)' : 'var(--text-muted)' }}
                >
                  {(canFillItems || isPostDesign)
                    ? (foundOrder.delivery_date ? format(new Date(foundOrder.delivery_date), 'dd MMM, yyyy') : 'PENDIENTE')
                    : 'Por confirmar'}
                </h4>
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

          {foundOrder.status === 'Cotización' && (
            <div className="p-10 bg-accent/5 border border-accent/10 rounded-[32px] space-y-8">
              <div className="text-center">
                <h5 className="text-2xl font-black text-foreground-main tracking-tighter uppercase mb-3">Confirmación de Pedido</h5>
                <p className="text-foreground-muted text-[11px] font-black uppercase tracking-widest leading-relaxed">El pedido está en fase de cotización técnica. Por favor, confirma los detalles finales.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href={`tel:${foundOrder.client_phone}`}
                  className="flex-1 bg-surface-hover text-foreground-main py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-surface-hover/80 transition-all border border-border-custom"
                >
                  <Phone size={18} className="text-accent" /> Llamar para Consultar
                </a>
                <button 
                  onClick={() => setShowConfirmModal(true)}
                  className="flex-1 bg-accent text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-accent/20"
                >
                  <CheckCircle2 size={18} /> Confirmar Pedido Ahora
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="relative pt-16 pb-8">
            <div className="absolute top-[85px] left-0 w-full h-1 bg-foreground-main/5"></div>
            <div 
              className="absolute top-[85px] left-0 h-1 bg-accent transition-all duration-1000 shadow-[0_0_20px_var(--accent-glow)]"
              style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
            ></div>
            
            <div className="relative flex justify-between">
              {steps.map((step, i) => {
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                
                return (
                  <div key={step} className="flex flex-col items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 z-10 border-4 border-surface shadow-2xl",
                      isCompleted ? "bg-accent text-white" : "bg-surface text-foreground-muted/20 border-border-custom",
                      isCurrent && "scale-125 ring-8 ring-accent/10"
                    )}>
                      {isCompleted ? <CheckCircle2 size={24} /> : <div className="w-2 h-2 rounded-full bg-current"></div>}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest text-center max-w-[90px] leading-tight",
                        isCompleted ? "text-foreground-main" : "text-foreground-muted/50"
                      )}>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-12 border-t border-border-custom">

            <div className="bg-foreground-main/[0.02] p-8 rounded-[40px] border border-border-custom shadow-2xl h-fit space-y-8">
              <h5 className="font-black mb-6 flex items-center gap-3 text-foreground-main text-[10px] uppercase tracking-[0.2em]"><Palette size={18} className="text-accent" /> Diseño Actual</h5>
                <div className="space-y-8">
                  {(Array.from(new Set(foundOrder.items?.map(item => item.garment_type).filter(Boolean) || [])) as string[]).map((cat) => {
                    const ref = [...(foundOrder.references || [])].reverse().find(r => r.comments === cat);
                    return (
                      <div key={cat} className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted ml-1">{cat}</p>
                        {ref ? (
                          <div className="aspect-video rounded-3xl overflow-hidden border border-border-custom relative group shadow-lg">
                            <img 
                              src={ref.file_path} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                              referrerPolicy="no-referrer" 
                            />
                            {ref.uploaded_by && ref.uploaded_by !== 'Cliente' && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              {!isDesignPhase && (
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  const formData = new FormData();
                                  const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
                                  if (input.files?.[0]) {
                                    formData.append('references', input.files[0]);
                                    formData.append('comments', cat);
                                    api.uploadReferences(foundOrder.id, formData, user?.name || 'Cliente').then(() => handleSearch());
                                  }
                                }}>
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
    onClick={(e) => e.stopPropagation()}
    className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-accent transition-all"
  >
    <Download size={20} />
  </a>
</div>
                            </div>
                          </div>
                        ) : (
                          !isDesignPhase ? (
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData();
                              const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
                              if (input.files?.[0]) {
                                formData.append('references', input.files[0]);
                                formData.append('comments', cat);
                                api.uploadReferences(foundOrder.id, formData, user?.name || 'Cliente').then(() => handleSearch());
                              }
                            }}>
                              <label className="aspect-video border-2 border-dashed border-border-custom rounded-[32px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all group relative overflow-hidden">
                                <div className="w-12 h-12 bg-foreground-main/[0.02] rounded-2xl flex items-center justify-center text-foreground-muted/20 group-hover:text-accent group-hover:scale-110 transition-all">
                                  <Upload size={24} />
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] font-black text-foreground-muted/50 uppercase tracking-[0.2em] group-hover:text-foreground-main transition-colors">Subir Diseño</p>
                                  <p className="text-[8px] font-bold text-foreground-muted/30 uppercase tracking-widest mt-1">Formato JPG, PNG</p>
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
                              <p className="text-[9px] font-black text-foreground-muted/30 uppercase tracking-[0.2em]">Sin Referencia</p>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Propuesta de Diseño del Diseñador */}
              {foundOrder.versions && foundOrder.versions.length > 0 && (
                <div className="bg-foreground-main/[0.02] p-8 rounded-[40px] border border-border-custom shadow-2xl h-fit space-y-8">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black flex items-center gap-3 text-foreground-main text-[10px] uppercase tracking-[0.2em]">
                      <Palette size={18} className="text-accent" /> Propuesta del Diseñador
                    </h5>
                    <span className="px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[9px] font-black uppercase tracking-widest">
                      Versión #{foundOrder.versions[0].version_number}
                    </span>
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
                      <p className="text-white/80 text-xs italic">{foundOrder.versions[0].comments || 'Sin comentarios adicionales'}</p>
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

                  {foundOrder.status === 'Corrección solicitada' && foundOrder.versions[foundOrder.versions.length - 1].client_comments && (
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
            
            {/* Detalle de Prendas */}
            {editingItems.length > 0 && canFillItems && (
              <div className="bg-foreground-main/[0.02] p-8 rounded-[40px] border border-border-custom shadow-2xl col-span-full">
                <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                  <div>
                    <h5 className="font-black flex items-center gap-3 text-foreground-main text-[10px] uppercase tracking-[0.2em] mb-2">
                      <Shirt size={18} className="text-accent" /> Detalle de Prendas
                    </h5>
                    <p className="text-foreground-muted text-[10px] font-black uppercase tracking-widest">Completa la información técnica de cada prenda para producción</p>
                    <br/>
                    {foundOrder.team_name ? (
                      <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                        <Users size={16} className="text-accent" />
                        <span>Equipo: <span className="font-black text-foreground-main">{foundOrder.team_name}</span></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                        <Users size={16} className="text-foreground-muted/30" />
                        <span className="text-foreground-muted/30">Sin equipo asignado</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={handleSaveItems}
                    disabled={isSavingItems || !canFillItems}
                    className="bg-accent text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20 disabled:opacity-50"
                  >
                    {isSavingItems ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar Información Técnica
                  </button>
                </div>

                <div className="overflow-x-auto -mx-8 px-8">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border-custom">
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Prenda</th>
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Nombre en Camiseta</th>
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Número</th>
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Talla</th>
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Manga</th>
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Jugador</th>
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Horma</th>
                        <th className="pb-6 text-[9px] font-black uppercase tracking-widest text-foreground-muted px-4">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {editingItems.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-foreground-main/[0.01] transition-colors">
                          <td className="py-6 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
                                <Shirt size={14} />
                              </div>
                              <span className="text-[11px] font-black text-foreground-main uppercase">{item.item_name || '-'}</span>
                            </div>
                          </td>
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">{item.player_name || '-'}</span>
                            ) : (
                              <input 
                                type="text" 
                                value={item.player_name || ''}
                                onChange={e => {
                                  const newItems = [...editingItems];
                                  newItems[idx].player_name = e.target.value;
                                  setEditingItems(newItems);
                                }}
                                className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest transition-all"
                                placeholder="EJ. RODRIGUEZ"
                              />
                            )}
                          </td>
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">{item.number || '-'}</span>
                            ) : (
                              <input 
                                type="text" 
                                value={item.number || ''}
                                onChange={e => {
                                  const newItems = [...editingItems];
                                  newItems[idx].number = e.target.value;
                                  setEditingItems(newItems);
                                }}
                                className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-20 focus:border-accent/50 outline-none font-bold text-center transition-all"
                                placeholder="00"
                              />
                            )}
                          </td>
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">
                                {item.size || '-'}
                              </span>
                            ) : (
                              <select
                                value={item.size || ''}
                                onChange={e => {
                                  const newItems = [...editingItems];
                                  newItems[idx] = { ...newItems[idx], size: e.target.value };
                                  setEditingItems(newItems);
                                }}
                                className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer transition-all"
                              >
                                <option value="">Talla</option>
                                {SIZES.map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">{item.sleeve || '-'}</span>
                            ) : (
                              <select 
                                value={item.sleeve || 'Corta'}
                                onChange={e => {
                                  const newItems = [...editingItems];
                                  newItems[idx].sleeve = e.target.value;
                                  setEditingItems(newItems);
                                }}
                                className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer transition-all"
                              >
                                <option value="Corta">Corta</option>
                                <option value="Larga">Larga</option>
                              </select>
                            )}
                          </td>
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">{item.design_type || '-'}</span>
                            ) : (
                              <select 
                                value={item.design_type || 'Jugador'}
                                onChange={e => {
                                  const newItems = [...editingItems];
                                  newItems[idx].design_type = e.target.value;
                                  setEditingItems(newItems);
                                }}
                                className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer transition-all"
                              >
                                <option value="Jugador">Jugador</option>
                                <option value="Portero">Portero</option>
                              </select>
                            )}
                          </td>
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-main uppercase tracking-widest">{item.fit || '-'}</span>
                            ) : (
                              <select 
                                value={item.fit || 'Regular'}
                                onChange={e => {
                                  const newItems = [...editingItems];
                                  newItems[idx].fit = e.target.value;
                                  setEditingItems(newItems);
                                }}
                                className="bg-surface border border-border-custom rounded-xl px-4 py-3 text-[11px] w-full focus:border-accent/50 outline-none font-bold uppercase tracking-widest appearance-none cursor-pointer transition-all"
                              >
                                <option value="Hombre">Hombre</option>
                                <option value="Dama">Dama</option>
                              </select>
                            )}
                          </td>
                          <td className="py-6 px-4">
                            {isDesignPhase ? (
                              <span className="text-[11px] font-bold text-foreground-muted/50 italic">{item.observations || '-'}</span>
                            ) : (
                              <input 
                                type="text" 
                                value={item.observations || ''}
                                onChange={e => {
                                  const newItems = [...editingItems];
                                  newItems[idx].observations = e.target.value;
                                  setEditingItems(newItems);
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
                <h4 className="font-black flex items-center gap-3 text-foreground-main text-[10px] uppercase tracking-[0.2em] mb-8">
                  <History size={18} className="text-accent" /> Historial de Diseños
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {foundOrder.versions.map((v) => (
                    <div key={v.id} className="bg-surface p-6 rounded-[32px] border border-border-custom shadow-xl group">
                      <div className="flex justify-between items-center mb-4">
                        <span className="px-3 py-1 bg-background rounded-full text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                          Versión #{v.version_number}
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                          v.status === 'Aprobado' ? "bg-green-500/10 text-green-500" : "bg-accent/10 text-accent"
                        )}>
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
                          <p className="text-[10px] text-foreground-main italic">{v.client_comments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-8">
              <h5 className="font-black flex items-center gap-3 text-foreground-main text-[10px] uppercase tracking-[0.2em]"><History size={18} className="text-accent" /> Registro de Actividad</h5>
              <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border-custom">
                {foundOrder.history?.slice(0, 5).map((h, i) => (
                  <div key={i} className="relative pl-8 group">
                    <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-surface border-2 border-border-custom group-hover:border-accent transition-colors" />
                    <div>
                      <p className="text-[11px] font-black text-foreground-main tracking-tight leading-tight mb-1">{h.action}</p>
                      <p className="text-[10px] text-foreground-muted leading-relaxed mb-2">{h.details}</p>
                      <p className="text-[9px] text-foreground-muted/50 font-black uppercase tracking-widest">{format(new Date(h.created_at), 'dd MMM, HH:mm')}</p>
                    </div>
                  </div>
                ))}
                {(!foundOrder.history || foundOrder.history.length === 0) && (
                  <div className="text-center py-12">
                    <History size={32} className="mx-auto text-foreground-muted/10 mb-4" />
                    <p className="text-[10px] text-foreground-muted/50 font-black uppercase tracking-widest italic">No hay actividad registrada aún</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : search && (
        <div className="py-32 text-center bg-surface border border-border-custom shadow-2xl">
          <Search className="mx-auto text-foreground-muted/10 mb-6" size={64} />
          <h4 className="font-black text-2xl text-foreground-main tracking-tighter mb-2">Orden no encontrada</h4>
          <p className="text-foreground-muted/50 text-[10px] font-black tracking-widest italic">Verifica el número e intenta nuevamente</p>
        </div>
      )}

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl text-center space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h4 className="text-3xl font-black text-foreground-main tracking-tighter uppercase mb-3">¿Confirmar Pedido?</h4>
                <p className="text-foreground-muted text-[11px] font-black uppercase tracking-widest leading-relaxed">
                  Al confirmar, el pedido pasará al estado de "Abono pendiente" para iniciar el proceso técnico de diseño.
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

        {showRejectModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-surface rounded-[40px] border border-border-custom p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
              <div className="mb-8">
                <h4 className="text-3xl font-black text-foreground-main tracking-tighter uppercase mb-3">Solicitar Correcciones</h4>
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
                    onChange={(e) => setRejectComment(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-surface border border-border-custom focus:border-accent/50 outline-none text-foreground-main transition-all placeholder:text-foreground-muted/30 min-h-[150px] resize-none"
                    placeholder="Ej: Cambiar el color del logo, ajustar el tamaño de la tipografía..."
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

        {showImageModal && selectedImageUrl && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4 sm:p-8" onClick={() => setShowImageModal(false)}>
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-3 rounded-full backdrop-blur-md"
              onClick={() => setShowImageModal(false)}
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImageUrl} 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Employee Management Component ---
// --- Product Management Component ---
function ProductManagement({}: { key?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Camiseta',
    sale_price: 0,
    sewing_cost: 0,
    active: true
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setNewProduct({ name: '', category: 'Camiseta', sale_price: 0, sewing_cost: 0, active: true });
      loadProducts();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      category: product.category,
      sale_price: product.sale_price,
      sewing_cost: product.sewing_cost,
      active: product.active
    });
    setShowAdd(true);
  };

  const toggleProductActive = async (product: Product) => {
    try {
      await api.updateProduct(product.id, { ...product, active: !product.active });
      loadProducts();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <LoadingState message="Cargando Productos" />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <h3 className="text-3xl font-black text-foreground-main tracking-tighter">Catálogo de Productos</h3>
          </div>
          <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom">
            <button 
              onClick={() => setIncludeInactive(false)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !includeInactive ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Activos
            </button>
            <button 
              onClick={() => setIncludeInactive(true)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                includeInactive ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Desactivados
            </button>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setNewProduct({ name: '', category: 'Camiseta', sale_price: 0, sewing_cost: 0, active: true });
            setShowAdd(true);
          }}
          className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20 whitespace-nowrap"
        >
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {products.filter(p => includeInactive ? !p.active : p.active).length === 0 ? (
        <EmptyState 
          icon={Package}
          title={includeInactive ? "No hay productos desactivados" : "Sin productos"}
          message={includeInactive ? "No se han encontrado productos en el archivo." : "Aún no has registrado productos en tu catálogo. Agrega uno para empezar a cotizar."}
          actionLabel={!includeInactive ? "Agregar Producto" : undefined}
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.filter(p => includeInactive ? !p.active : p.active).map(product => (
            <Card 
              key={product.id} 
              className={cn(
                "group hover:border-accent/30 transition-all relative overflow-hidden",
                !product.active && "opacity-60 grayscale-[0.5]"
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
                    onClick={() => toggleProductActive(product)}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      product.active ? "bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent" : "bg-accent text-white"
                    )}
                    title={product.active ? "Desactivar producto" : "Activar producto"}
                  >
                    {product.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-black text-foreground-main tracking-tight uppercase">{product.name}</h4>
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{product.category}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-custom">
                  <div>
                    <p className="text-[9px] font-black text-foreground-muted uppercase tracking-widest mb-1">Costo Costura</p>
                    <p className="text-lg font-black text-foreground-main">${(product.sewing_cost || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}


      <Modal 
        isOpen={showAdd} 
        onClose={() => setShowAdd(false)} 
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        subtitle="Configuración de precios y costos"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Nombre del Producto"
            value={newProduct.name}
            onChange={e => setNewProduct({...newProduct, name: e.target.value})}
            placeholder="Ej. Camiseta Deportiva Pro"
            required
          />
          <Select 
            label="Categoría"
            value={newProduct.category}
            onChange={e => setNewProduct({...newProduct, category: e.target.value})}
            options={[
              { value: 'Camiseta', label: 'Camiseta' },
              { value: 'Pantaloneta', label: 'Pantaloneta' },
              { value: 'Medias', label: 'Medias' },
              { value: 'Chaqueta', label: 'Chaqueta' }
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Costo de Costura"
              type="number"
              value={newProduct.sewing_cost.toString()}
              onChange={e => setNewProduct({...newProduct, sewing_cost: Number(e.target.value)})}
              required
            />
          </div>
          <div className="flex items-center gap-3 pt-4">
            <input 
              type="checkbox" 
              checked={newProduct.active} 
              onChange={e => setNewProduct({...newProduct, active: e.target.checked})}
              className="w-5 h-5 rounded-lg accent-accent"
            />
            <label className="text-xs font-bold text-foreground-main uppercase tracking-widest">Producto Activo</label>
          </div>
          <button type="submit" className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all mt-4">
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

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      if (editingTeam) {
        await api.updateTeam(editingTeam.id, { name: newTeamName });
        toast.success('Equipo actualizado');
      } else {
        await api.createTeam(client.id, newTeamName);
        toast.success('Equipo creado');
      }
      setNewTeamName('');
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
      await api.updateTeam(team.id, { active: !team.active });
      toast.success(`Equipo ${team.active ? 'desactivado' : 'activado'}`);
      fetchTeams();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar estado del equipo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">Equipos de {client.name}</h4>
          <p className="text-foreground-muted text-[10px] font-black uppercase tracking-widest mt-1">Gestiona los equipos asociados a este cliente</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-accent text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus size={16} /> Nuevo Equipo
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddTeam} className="bg-surface-hover p-6 rounded-2xl border border-border-custom space-y-4">
          <Input 
            label="Nombre del Equipo"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            placeholder="Ej. Equipo A, Sucursal Norte, etc."
            required
          />
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => { setIsAdding(false); setEditingTeam(null); setNewTeamName(''); }}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground-muted hover:text-foreground-main"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-accent text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              {editingTeam ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState message="Cargando Equipos" />
      ) : teams.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border-custom rounded-2xl bg-surface-hover">
          <Users size={40} className="mx-auto text-foreground-muted/20 mb-4" />
          <p className="text-foreground-muted text-sm font-bold">No hay equipos registrados para este cliente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {teams.map(team => (
            <div 
              key={team.id} 
              className={cn(
                "flex items-center justify-between p-4 bg-surface rounded-2xl border border-border-custom transition-all",
                !team.active && "opacity-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-bold text-foreground-main">{team.name}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-foreground-muted">
                    {team.active ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingTeam(team); setNewTeamName(team.name); setIsAdding(true); }}
                  className="p-2 hover:bg-accent/10 rounded-lg text-foreground-muted hover:text-foreground-main transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleToggleTeam(team)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    team.active ? "hover:bg-accent/20 text-foreground-muted hover:text-accent" : "bg-accent text-white"
                  )}
                >
                  {team.active ? <Trash2 size={16} /> : <RefreshCw size={16} />}
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
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [clientToToggle, setClientToToggle] = useState<Client | null>(null);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [selectedClientForTeams, setSelectedClientForTeams] = useState<Client | null>(null);
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

  useEffect(() => {
    fetchClients();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await api.createClient(formData);
        toast.success('Cliente registrado correctamente');
      }
      setIsAdding(false);
      setEditingClient(null);
      setFormData({ name: '', doc: '', doc_type: 'CC', phone: '', address: '', city: '', email: '' });
      fetchClients();
    } catch (error) {
      console.error(error);
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
    setIsAdding(true);
  };

  const handleToggleActive = async () => {
    if (!clientToToggle) return;
    try {
      const newStatus = !clientToToggle.active;
      await api.updateClient(clientToToggle.id, { active: newStatus });
      toast.success(`Cliente ${clientToToggle.active ? 'desactivado' : 'activado'} correctamente`);
      setShowConfirmToggle(false);
      setClientToToggle(null);
      if (!newStatus) {
        setIncludeInactive(true);
      }
      fetchClients();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado del cliente');
    }
  };

  const confirmToggleActive = (client: Client) => {
    setClientToToggle(client);
    setShowConfirmToggle(true);
  };

  if (loading) return <LoadingState message="Cargando Clientes" />;

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.doc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = includeInactive ? !c.active : c.active;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <div>
            <h3 className="text-3xl font-black text-foreground-main tracking-tighter">Directorio de Clientes</h3>
          </div>
          <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom">
            <button 
              onClick={() => setIncludeInactive(false)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !includeInactive ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Activos
            </button>
            <button 
              onClick={() => setIncludeInactive(true)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                includeInactive ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Desactivados
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar clientes..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-surface-hover border border-border-custom rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-accent/20 transition-all text-foreground-main font-bold text-sm"
            />
          </div>
          <button 
            onClick={() => {
              setIsAdding(true);
              setEditingClient(null);
              setFormData({ name: '', doc: '', doc_type: 'CC', phone: '', address: '', city: '', email: '', active: true });
            }}
            className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20 whitespace-nowrap"
          >
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <Modal 
        isOpen={showConfirmToggle} 
        onClose={() => setShowConfirmToggle(false)} 
        title="Confirmar Cambio de Estado"
        maxWidth="max-w-md"
      >
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
            {clientToToggle?.active ? <UserMinus size={40} /> : <UserPlus size={40} />}
          </div>
          <div>
            <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">
              ¿Estás seguro de {clientToToggle?.active ? 'desactivar' : 'activar'} a este cliente?
            </h4>
            <p className="text-foreground-muted text-sm mt-2">
              {clientToToggle?.active 
                ? 'El cliente se moverá a la pestaña de inactivos y no será visible en la lista principal.' 
                : 'El cliente volverá a la lista principal de clientes activos.'}
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setShowConfirmToggle(false)}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleToggleActive}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-accent text-white hover:scale-105 transition-all shadow-xl shadow-accent/20"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isAdding} 
        onClose={() => setIsAdding(false)} 
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input 
            label="Nombre Completo"
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="Ej. Juan Pérez"
          />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Select
                label="Tipo"
                value={formData.doc_type}
                onChange={e => setFormData({...formData, doc_type: e.target.value})}
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
              <Input 
                label="Documento"
                required
                value={formData.doc}
                onChange={e => setFormData({...formData, doc: e.target.value})}
                placeholder="Ej. 123456789"
              />
            </div>
          </div>
          <Input 
            label="Teléfono"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            placeholder="Ej. 3001234567"
          />
          <Input 
            label="Email"
            type="email"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            placeholder="juan@ejemplo.com"
          />
          <Input 
            label="Ciudad"
            value={formData.city}
            onChange={e => setFormData({...formData, city: e.target.value})}
            placeholder="Ej. Medellín"
          />
          <Input 
            label="Dirección"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            placeholder="Ej. Calle 10 # 20-30"
          />
          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button 
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-3 rounded-xl font-bold text-foreground-muted hover:text-foreground-main transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/90 transition-all"
            >
              {editingClient ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full">
            <EmptyState 
              icon={Contact} 
              title={includeInactive ? "No hay clientes desactivados" : "No se encontraron clientes"} 
              message={searchTerm 
                ? `No hay resultados para "${searchTerm}" en esta sección.` 
                : includeInactive 
                  ? "No tienes clientes en la lista de desactivados."
                  : "Aún no tienes clientes registrados. Los clientes se crean automáticamente al generar una orden o puedes agregarlos manualmente aquí."
              }
              actionLabel={(!searchTerm && !includeInactive) ? "Registrar Nuevo Cliente" : undefined}
              onAction={() => { setEditingClient(null); setFormData({ name: '', doc: '', doc_type: 'CC', phone: '', address: '', city: '', email: '', active: true }); setIsAdding(true); }}
            />
          </div>
        ) : filteredClients.map(client => (
          <Card 
            key={client.id} 
            className={cn(
              "group hover:border-accent/30 transition-all relative overflow-hidden",
              !client.active && "opacity-60 grayscale-[0.5]"
            )}
          >
            {!client.active && (
              <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-widest rounded-bl-xl">
                Inactivo
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                <Contact size={24} />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setSelectedClientForTeams(client); setShowTeamManagement(true); }}
                  className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                  title="Gestionar equipos"
                >
                  <Users size={18} />
                </button>
                <button 
                  onClick={() => handleEdit(client)}
                  className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                  title="Editar cliente"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => confirmToggleActive(client)}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    client.active ? "bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent" : "bg-accent text-white"
                  )}
                  title={client.active ? "Desactivar cliente" : "Activar cliente"}
                >
                  {client.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                </button>
              </div>
            </div>
            <h4 className="font-bold text-lg mb-1 text-foreground-main tracking-tight">{client.name}</h4>
            <p className="text-foreground-muted text-[10px] mb-4 font-black uppercase tracking-widest">{client.doc_type || 'CC'} {client.doc}</p>
            <div className="space-y-3 pt-4 border-t border-border-custom">
              <div className="flex items-center gap-3 text-sm text-foreground-muted">
                <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                  <Clock size={14} />
                </div>
                <span className="font-bold tracking-tight">{client.phone || 'Sin teléfono'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground-muted">
                <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                  <LayoutDashboard size={14} />
                </div>
                <span className="font-bold tracking-tight">{client.city || 'Sin ciudad'}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={showTeamManagement}
        onClose={() => setShowTeamManagement(false)}
        title="Gestión de Equipos"
        maxWidth="max-w-2xl"
      >
        {selectedClientForTeams && (
          <TeamManagement 
            client={selectedClientForTeams} 
            onClose={() => setShowTeamManagement(false)} 
          />
        )}
      </Modal>
    </div>
  );
}

function EmployeeManagement({}: { key?: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [report, setReport] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [employeeToToggle, setEmployeeToToggle] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: 'Confección' as Role,
    phone: '',
    pin: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, reportData] = await Promise.all([
        api.getEmployees(true),
        api.getEmployeeReport()
      ]);
      setEmployees(empData);
      setReport(reportData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Cargando Personal" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newEmployee.name);
      formData.append('role', newEmployee.role);
      formData.append('phone', newEmployee.phone);
      if (newEmployee.pin) formData.append('pin', newEmployee.pin);
      if (photoFile) formData.append('photo', photoFile);

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, formData);
        toast.success('Empleado actualizado correctamente');
      } else {
        await api.createEmployee(formData);
        toast.success('Empleado registrado correctamente');
      }
      setShowAdd(false);
      setEditingEmployee(null);
      setNewEmployee({ name: '', role: 'Confección', phone: '', pin: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setNewEmployee({
      name: emp.name,
      role: emp.role,
      phone: emp.phone || '',
      pin: '' // Don't show PIN for security, but allow updating it
    });
    setPhotoPreview(emp.photo_path ? `/uploads/${emp.photo_path}` : null);
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
    if (emp.active) {
      setEmployeeToToggle(emp);
      setShowConfirmToggle(true);
    } else {
      // If activating, we can do it directly or also confirm. User said "todos los desactivar deben de tener confirmacion".
      // I'll confirm both for consistency, or just deactivate.
      setEmployeeToToggle(emp);
      setShowConfirmToggle(true);
    }
  };

  const filteredEmployees = employees.filter(emp => activeTab === 'active' ? emp.active : !emp.active);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <h3 className="text-3xl font-black text-foreground-main tracking-tighter">Gestión de Personal</h3>
          </div>
          <div className="flex bg-surface-hover p-1 rounded-2xl border border-border-custom">
            <button 
              onClick={() => setActiveTab('active')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'active' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Activos
            </button>
            <button 
              onClick={() => setActiveTab('inactive')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'inactive' ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-foreground-muted hover:text-foreground-main"
              )}
            >
              Desactivados
            </button>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingEmployee(null);
            setNewEmployee({ name: '', role: 'Confección', phone: '', pin: '' });
            setShowAdd(true);
          }}
          className="bg-accent text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-accent/20"
        >
          <Plus size={20} /> Registrar Empleado
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-black text-foreground-main uppercase tracking-widest text-xs">Lista de Empleados</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full">
                <Card className="py-20">
                  <EmptyState 
                    icon={Users} 
                    title={activeTab === 'active' ? "No hay empleados activos" : "No hay empleados inactivos"} 
                    message={activeTab === 'active' ? "Aún no has registrado ningún empleado activo." : "No tienes empleados desactivados en este momento."}
                    actionLabel={activeTab === 'active' ? "Registrar Primer Empleado" : undefined}
                    onAction={activeTab === 'active' ? () => { setEditingEmployee(null); setNewEmployee({ name: '', role: 'Confección', phone: '', pin: '' }); setShowAdd(true); } : undefined}
                  />
                </Card>
              </div>
            ) : filteredEmployees.map(emp => (
              <Card 
                key={emp.id} 
                className={cn(
                  "group hover:border-accent/30 transition-all relative overflow-hidden",
                  !emp.active && "opacity-60 grayscale-[0.5]"
                )}
              >
                {!emp.active && (
                  <div className="absolute top-0 right-0 bg-accent text-white text-[8px] font-black px-3 py-1.5 uppercase tracking-widest rounded-bl-xl">
                    Inactivo
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-surface-hover overflow-hidden flex items-center justify-center border border-border-custom shadow-inner">
                      {emp.photo_path ? (
                        <img src={`/uploads/${emp.photo_path}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users size={24} className="text-foreground-muted/30" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-foreground-main tracking-tight">{emp.name}</h4>
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/5 px-2 py-1 rounded-md">
                        {emp.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(emp)}
                      className="p-3 bg-surface-hover hover:bg-accent/10 rounded-xl text-foreground-muted hover:text-foreground-main transition-all"
                      title="Editar empleado"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => confirmToggleStatus(emp)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        emp.active ? "bg-surface-hover hover:bg-accent/20 text-foreground-muted hover:text-accent" : "bg-accent text-white"
                      )}
                      title={emp.active ? "Desactivar empleado" : "Activar empleado"}
                    >
                      {emp.active ? <Trash2 size={18} /> : <RefreshCw size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-border-custom">
                  <div className="flex items-center gap-3 text-sm text-foreground-muted">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                      <Clock size={14} />
                    </div>
                    <span className="font-bold tracking-tight">{emp.phone || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground-muted">
                    <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center">
                      <LayoutDashboard size={14} />
                    </div>
                    <span className="font-bold tracking-tight capitalize">{emp.active ? 'Estado: Activo' : 'Estado: Inactivo'}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>


        <Card className="overflow-hidden p-0 border-accent/20 !bg-accent text-white">

          <div className="p-6 border-b border-white/20">
            <h4 className="font-black flex items-center gap-2 uppercase tracking-widest text-xs">
              <DollarSign size={18} /> Rendimiento Mensual
            </h4>
          </div>

          <div className="p-6 space-y-6">
            {report.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/10 border border-white/20 hover:border-white/40 transition-all">
                <div>
                  <p className="font-bold text-sm tracking-tight">
                    {item.employee_name}
                  </p>
                  <p className="text-[10px] text-white/70 uppercase font-black tracking-widest mt-0.5">
                    {item.role}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black tracking-tighter text-lg">
                    ${(item.total_earned || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/70 font-black uppercase tracking-widest">
                    {item.total_garments} prendas
                  </p>
                </div>
              </div>
            ))}

            {report.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <Users size={48} className="mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-widest">
                  Sin registros este mes
                </p>
              </div>
            )}

          </div>

        </Card>
      </div>

      <Modal 
        isOpen={showConfirmToggle} 
        onClose={() => setShowConfirmToggle(false)} 
        title="Confirmar Cambio de Estado"
        maxWidth="max-w-md"
      >
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent mx-auto">
            {employeeToToggle?.active ? <UserMinus size={40} /> : <UserPlus size={40} />}
          </div>
          <div>
            <h4 className="text-xl font-black text-foreground-main uppercase tracking-tight">
              ¿Estás seguro de {employeeToToggle?.active ? 'desactivar' : 'activar'} a este empleado?
            </h4>
            <p className="text-foreground-muted text-sm mt-2">
              {employeeToToggle?.active 
                ? 'El empleado no podrá acceder al sistema ni se le podrán asignar nuevas tareas.' 
                : 'El empleado recuperará el acceso al sistema y podrá recibir asignaciones.'}
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setShowConfirmToggle(false)}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border-custom text-foreground-muted hover:bg-surface-hover transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleToggleStatus}
              className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-accent text-white hover:scale-105 transition-all shadow-xl shadow-accent/20"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showAdd} 
        onClose={() => setShowAdd(false)} 
        title={editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[32px] bg-surface-hover border-2 border-dashed border-border-custom flex items-center justify-center overflow-hidden transition-all group-hover:border-accent/50">
                {photoPreview ? (
                  <img src={photoPreview} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-center p-4">
                    <Upload size={24} className="mx-auto mb-2 text-foreground-muted" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-foreground-muted">Subir Foto</p>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {photoPreview && (
                <button 
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute -top-2 -right-2 p-2 bg-accent text-white rounded-xl shadow-lg hover:scale-110 transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <Input 
            label="Nombre Completo"
            required
            value={newEmployee.name}
            onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
            placeholder="Ej. Juan Pérez"
          />
          <Select 
            label="Departamento"
            value={newEmployee.role}
            onChange={e => setNewEmployee({...newEmployee, role: e.target.value as any})}
            options={[
              { value: 'Admin', label: 'Admin' },
              { value: 'Ventas', label: 'Ventas' },
              { value: 'Diseño', label: 'Diseño' },
              { value: 'Impresión', label: 'Impresión' },
              { value: 'Sublimación', label: 'Sublimación' },
              { value: 'Corte', label: 'Corte' },
              { value: 'Confección', label: 'Confección' },
              { value: 'Empaque', label: 'Empaque' },
              { value: 'Transporte', label: 'Transporte' }
            ]}
          />
          <Input 
            label="Teléfono"
            value={newEmployee.phone}
            onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})}
            placeholder="Ej. 3001234567"
          />
          <Input 
            label={editingEmployee ? "Nuevo PIN (Opcional)" : "PIN de Acceso (4 dígitos)"}
            type="password"
            maxLength={4}
            required={!editingEmployee}
            value={newEmployee.pin}
            onChange={(e) => setNewEmployee({...newEmployee, pin: e.target.value.replace(/\D/g, '')})}
            placeholder="****"
          />
          <button type="submit" className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all mt-4">
            {editingEmployee ? 'Actualizar Registro' : 'Guardar Registro'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

// --- Login Component ---
function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;
    
    setLoading(true);
    setError('');
    try {
      const user = await api.login(pin);
      onLogin(user);
    } catch (err) {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      const timer = setTimeout(() => {
        const form = document.getElementById('login-form') as HTMLFormElement;
        form?.requestSubmit();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  return (
    <div className="min-h-screen grid md:grid-cols-[65%_35%] font-sans">

  {/* IZQUIERDA — IMAGEN GRANDE */}
  <div className="hidden md:block h-screen">
    <img
      src="/login.jpg"
      alt="Login"
      className="w-full h-full object-cover"
    />
  </div>

  {/* DERECHA — LOGIN MÁS COMPACTO */}
  <div className="flex items-center justify-center bg-background px-6">

    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-sm"
    >

      {/* HEADER */}
      <div className="text-center">
        <img
          src="/logo-bachestic.png"
          alt="Bachestic Logo"
          className="h-40 mx-auto object-contain mb-4"
        />
      </div>

      {/* CARD */}
      <div className="bg-surface rounded-3xl p-8 border border-border-custom shadow-xl">
        <h2 className="text-lg font-bold mb-6 text-center">
          Ingresa tu PIN
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* PIN */}
          <div className="flex justify-center gap-3">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={cn(
                  "w-10 h-14 rounded-xl border-2 flex items-center justify-center transition-all",
                  pin[i]
                    ? "border-accent bg-accent/10"
                    : "border-border-custom bg-surface-hover"
                )}
              >
                {pin[i] && (
                  <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                )}
              </div>
            ))}
          </div>

          {/* NUMPAD */}
          <div className="grid grid-cols-3 gap-3">
            {['1','2','3','4','5','6','7','8','9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num)}
                disabled={loading}
                className="h-14 rounded-xl bg-surface-hover border border-border-custom text-xl font-bold active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}

            <div />

            <button
              type="button"
              onClick={() => handleNumberClick('0')}
              disabled={loading}
              className="h-14 rounded-xl bg-surface-hover border border-border-custom text-xl font-bold active:scale-95 transition-all"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="h-14 rounded-xl bg-surface-hover border border-border-custom flex items-center justify-center active:scale-95 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full py-3 bg-accent disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading
              ? <Clock className="animate-spin" size={18} />
              : <><Lock size={18} /> Entrar</>
            }
          </button>

        </form>
      </div>

    </motion.div>

  </div>
</div>
  );
}
