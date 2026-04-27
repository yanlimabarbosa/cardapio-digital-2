'use client';

import { useDashboardPage } from '../use-dashboard-page';
import { motion } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { ChartTooltip } from './chart-tooltip';
import { SectionCard } from './section-card';
import { StoreSettings } from './store-settings';

const SHORT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_CHART_DATA = [
  { key: 'pending_payment', label: 'Aguardando', color: '#EAB308' },
  { key: 'paid', label: 'Pago', color: '#3B82F6' },
  { key: 'preparing', label: 'Preparando', color: '#F97316' },
  { key: 'ready', label: 'Pronto', color: '#10B981' },
  { key: 'delivered', label: 'Entregue', color: '#6B7280' },
  { key: 'cancelled', label: 'Cancelado', color: '#EF4444' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 24, stiffness: 300 } },
};

export function DashboardClient() {
  const { data, stats, storeSettings, storeStatus, storeMode, setStoreModeMutation, updateSettingsMutation, toggleDay } = useDashboardPage();

  const statusPieData = STATUS_CHART_DATA
    .map((s) => ({ ...s, value: data?.ordersByStatus?.[s.key] ?? 0 }))
    .filter((s) => s.value > 0);

  const weeklyData = (data?.weeklyRevenue ?? []).map((d) => {
    const date = new Date(d.date + 'T12:00:00');
    return {
      ...d,
      label: SHORT_DAYS[date.getDay()] + ' ' + date.getDate(),
    };
  });

  const hourlyData = (data?.revenueByHour ?? [])
    .filter((h) => h.hour >= 6)
    .map((h) => ({
      ...h,
      label: `${h.hour}h`,
    }));

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold text-[#2A1508]">Dashboard</h1>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.title}
            variants={cardVariants}
            className="rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] p-4 shadow-[0_0_8px_rgba(60,40,20,0.12)]"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
                {stat.title}
              </span>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', stat.bgColor)}>
                <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
              </div>
            </div>
            <div className="font-display text-2xl font-semibold text-[#2A1508]">{stat.value}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Receita — Últimos 7 dias" className="lg:col-span-2" delay={0.1}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6B3E14" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6B3E14" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAD8A0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#8A6F40', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8A6F40' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v}`}
                  width={55}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6B3E14"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ r: 4, fill: '#6B3E14', strokeWidth: 2, stroke: '#FBF6E9' }}
                  activeDot={{ r: 6, fill: '#6B3E14', stroke: '#FBF6E9', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Pedidos por Status" delay={0.15}>
          {statusPieData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-[#B89D5F]">Sem dados</p>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-[#EAD8A0] bg-[#FBF6E9] px-3 py-2 shadow-lg">
                            <p className="text-xs font-semibold text-[#8A6F40]">{d.label}</p>
                            <p className="text-sm font-semibold text-[#2A1508]">{d.value} pedidos</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="font-display text-xl font-semibold text-[#2A1508]">
                      {data?.todayOrdersCount ?? 0}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A6F40]">total</div>
                  </div>
                </div>
              </div>
              <div className="ml-3 space-y-1.5">
                {statusPieData.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-[#8A6F40]">{s.label}</span>
                    <span className="text-xs font-semibold text-[#2A1508]">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Receita por Hora — Hoje" delay={0.2}>
          <div className="h-[200px]">
            {hourlyData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[#B89D5F]">Sem dados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAD8A0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#8A6F40', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8A6F40' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v}`}
                    width={50}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={(v: number) => formatCurrency(v)} />}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {hourlyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.revenue > 0 ? '#6B3E14' : '#EAD8A0'}
                        fillOpacity={entry.revenue > 0 ? 0.85 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Mais Vendidos — Hoje" delay={0.25}>
          <div className="h-[200px]">
            {!data?.topProducts?.length ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[#B89D5F]">Sem dados</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 200 }}>
                {data.topProducts.map((product, i) => {
                  const maxQty = data.topProducts[0].qty;
                  const pct = maxQty > 0 ? (product.qty / maxQty) * 100 : 0;
                  return (
                    <div key={product.name} className="group">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-xs font-semibold text-[#2A1508]">
                          {i + 1}. {product.name}
                        </span>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          <span className="text-[10px] font-bold text-[#8A6F40]">
                            {product.qty}x
                          </span>
                          <span className="text-[10px] font-semibold text-[#6B3E14]">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAD8A0]/60">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, #6B3E14, #A77A1E)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {storeSettings && (
        <StoreSettings
          storeSettings={storeSettings}
          storeStatus={storeStatus}
          storeMode={storeMode}
          onSetMode={(mode) => setStoreModeMutation.mutate(mode)}
          onUpdateSettings={(data) => updateSettingsMutation.mutate(data)}
          onToggleDay={toggleDay}
        />
      )}
    </div>
  );
}
