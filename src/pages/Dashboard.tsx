'use client';

import { motion } from 'framer-motion';

import {
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from 'recharts';

import { format } from 'date-fns';

import { cn } from '@/src/lib/utils';

import Card from '@/src/pages/components/Card';

interface Order {
  id: number;
  order_number: string;
  client_name: string;
  status: string;
  active: boolean;
  delivery_date?: string;
}

interface DashboardProps {
  stats: {
    activeOrders: number;
    delayedOrders: number;
  };

  orders: Order[];

  employeeReport: any[];

  onOrderClick: (id: number) => void;
}

export default function Dashboard({
  stats,
  orders,
  employeeReport,
  onOrderClick,
}: DashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 mt-8"
    >
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            label: 'Órdenes Activas',
            value: stats.activeOrders,
            icon: ShoppingCart,
            color: 'text-accent',
            trend: '+12%',
          },
          {
            label: 'Órdenes Retrasadas',
            value: stats.delayedOrders,
            icon: AlertCircle,
            color: 'text-accent',
            trend: '-2%',
          },
          {
            label: 'Órdenes Entregadas',
            value: orders.filter((o) => o.status === 'Entregado').length,
            icon: CheckCircle2,
            color: 'text-green-500',
            trend: '+0%',
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="flex items-center justify-between group"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-foreground-muted mb-3">
                {stat.label}
              </p>

              <h3 className="text-3xl font-black tracking-tighter text-foreground-main">
                {stat.value}
              </h3>

              <p
                className={cn(
                  'text-[10px] font-bold mt-3 flex items-center gap-1.5',
                  stat.trend.startsWith('+')
                    ? 'text-green-500'
                    : 'text-red-500'
                )}
              >
                <span className="px-1.5 py-0.5 rounded-md bg-current/10">
                  {stat.trend}
                </span>

                <span className="text-foreground-muted font-medium uppercase tracking-wider">
                  vs mes anterior
                </span>
              </p>
            </div>

            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center bg-surface-hover group-hover:bg-accent/10 transition-colors',
                stat.color
              )}
            >
              <stat.icon size={28} />
            </div>
          </Card>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* VENTAS */}
        <Card>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg tracking-tight text-foreground-main">
              Ventas Semanales
            </h3>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />

              <span className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">
                Ingresos
              </span>
            </div>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Lun', sales: 4000 },
                  { name: 'Mar', sales: 3000 },
                  { name: 'Mie', sales: 2000 },
                  { name: 'Jue', sales: 2780 },
                  { name: 'Vie', sales: 1890 },
                  { name: 'Sab', sales: 2390 },
                  { name: 'Dom', sales: 3490 },
                ]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.1}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                  dy={10}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: 'var(--text-muted)',
                    fontWeight: 600,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: 'var(--surface-hover)',
                    opacity: 0.4,
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    color: 'var(--text-main)',
                  }}
                  itemStyle={{
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />

                <Bar
                  dataKey="sales"
                  fill="var(--accent)"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* DISTRIBUCIÓN */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg tracking-tight text-foreground-main">
              Distribución de Estados
            </h3>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />

              <span className="text-[10px] uppercase tracking-widest text-foreground-muted font-bold">
                Órdenes
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto pr-2">
            {[
              { name: 'Abono confirmado', color: '#3B82F6' },
              { name: 'En diseño', color: '#6366F1' },
              { name: 'Versión enviada', color: '#8B5CF6' },
              { name: 'Corrección solicitada', color: '#EC4899' },
              { name: 'Diseño aprobado', color: '#06B6D4' },
              { name: 'En cuadro', color: '#7C3AED' },
              { name: 'En montaje', color: '#9333EA' },
              { name: 'En impresión', color: '#8B5CF6' },
              { name: 'En sublimación', color: '#EC4899' },
              { name: 'En corte', color: '#10B981' },
              { name: 'En confección', color: '#3B82F6' },
              { name: 'En empaque', color: '#06B6D4' },
              { name: 'En despacho', color: '#F97316' },
              { name: 'Entregado', color: '#22C55E' },
            ].map((status, i) => {
              const count = orders.filter(
                (o) => o.status === status.name
              ).length;

              const percentage =
                orders.length > 0
                  ? (count / orders.length) * 100
                  : 0;

              return (
                <div key={i} className="space-y-2 group">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted group-hover:text-foreground-main transition-colors">
                      {status.name}
                    </p>

                    <p className="text-sm font-black text-foreground-main tracking-tighter">
                      {count}
                    </p>
                  </div>

                  <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: status.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {orders.length === 0 && (
              <div className="text-center py-12 opacity-20">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
                  Sin datos disponibles
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ÓRDENES */}
      <div className="grid grid-cols-1 gap-10">
        <Card className="overflow-hidden" noPadding>
          {/* HEADER */}
          <div className="p-8 border-b border-border-custom flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-bold text-lg tracking-tight text-foreground-main">
                Órdenes Recientes
              </h3>

              <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-black mt-1">
                Últimas órdenes activas registradas
              </p>
            </div>

            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('navigate', {
                    detail: {
                      tab: 'orders',
                    },
                  })
                );
              }}
              className="
                flex items-center gap-2
                px-5 py-3
                rounded-2xl
                bg-accent
                text-white
                text-[10px]
                font-black
                uppercase
                tracking-widest
                hover:scale-105
                hover:shadow-xl
                hover:shadow-accent/20
                transition-all
                whitespace-nowrap
              "
            >
              Ver Todas

              <ArrowRight size={16} />
            </button>
          </div>

          {/* TABLA */}
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
                {orders
                  .filter((o) => o.active)
                  .slice(0, 3)
                  .map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-surface-hover transition-colors cursor-pointer group"
                      onClick={() => onOrderClick(order.id)}
                    >
                      <td className="px-8 py-6 font-bold text-foreground-main tracking-tight">
                        {order.order_number}
                      </td>

                      <td className="px-8 py-6 text-foreground-muted font-medium">
                        {order.client_name}
                      </td>

                      <td className="px-8 py-6">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest',
                            order.status === 'Entregado'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-accent/10 text-accent'
                          )}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-8 py-6 text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
                        {order.delivery_date
                          ? format(
                              new Date(order.delivery_date),
                              'dd MMM, yyyy'
                            )
                          : 'N/A'}
                      </td>

                      <td className="px-8 py-6 text-right">
                        <button
                          className="
                            p-2.5
                            bg-surface-hover
                            hover:bg-accent
                            rounded-xl
                            transition-all
                            text-foreground-muted
                            hover:text-white
                            group-hover:scale-110
                          "
                        >
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