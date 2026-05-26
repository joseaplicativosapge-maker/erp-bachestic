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
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { Order, OrderStatus, User } from './lib/types';
import { differenceInBusinessDays } from 'date-fns';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientRoadmap from './pages/ClientRoadmap';
import { EmployeeManagement } from './pages/management/EmployeeManagement';
import { ClientManagement } from './pages/management/ClientManagement';
import { ProductManagement } from './pages/management/ProductManagement';
import { OrdersList } from './pages/orders/OrdersList';
import { CreateOrder } from './pages/orders/CreateOrder';
import { OrderDetails } from './pages/orders/OrderDetails';
import { ConfectionReport } from './pages/reports/ConfectionReport';
import { KDS } from './pages/orders/KDS';

// Componentes
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
