'use client';

import { RotateCcw } from 'lucide-react';
import { useDashboardPage } from '../use-dashboard-page';
import { motion } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
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
  const {
    data,
    stats,
    range,
    setRange,
    resetRange,
    setTodayRange,
    setLast7DaysRange,
    setLast30DaysRange,
  } = useDashboardPage();

  const statusPieData = STATUS_CHART_DATA
    .map((s) => ({ ...s, value: data?.ordersByStatus?.[s.key] ?? 0 }))
    .filter((s) => s.value > 0);

  const weeklyData = (data?.weeklyRevenue ?? []).map((d) => {
    const date = new Date(d.date + 'T12:00:00');
    return {
      ...d,
      label: `${SHORT_DAYS[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}`,
    };
  });

  const hourlyData = (data?.revenueByHour ?? [])
    .filter((h) => h.hour >= 6)
    .map((h) => ({
      ...h,
      label: `${h.hour}h`,
    }));

  const presetValue = getDashboardPreset(range);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#3D2B1F]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#8B7355]">Filtre os números por intervalo de datas.</p>
        </div>

        <div className="w-full rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] px-3 py-2 shadow-[0_0_8px_rgba(61,43,31,0.10)] xl:w-auto">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <PresetButton active={presetValue === 'today'} onClick={setTodayRange}>
                Hoje
              </PresetButton>
              <PresetButton active={presetValue === '7d'} onClick={setLast7DaysRange}>
                7 dias
              </PresetButton>
              <PresetButton active={presetValue === '30d'} onClick={setLast30DaysRange}>
                30 dias
              </PresetButton>
              <button
                type="button"
                onClick={resetRange}
                className="inline-flex items-center gap-1 rounded-full border border-[#E8DDD0] px-3 py-1.5 text-xs font-bold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpar
              </button>
            </div>

            <div className="hidden h-7 w-px bg-[#E8DDD0] xl:block" />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                  De
                </span>
                <DatePicker
                  value={range.from}
                  onChange={(value) => setRange((current) => ({ ...current, from: value }))}
                  placeholder="Selecionar"
                  className="h-9 sm:w-[10.5rem]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                  Até
                </span>
                <DatePicker
                  value={range.to}
                  onChange={(value) => setRange((current) => ({ ...current, to: value }))}
                  placeholder="Selecionar"
                  className="h-9 sm:w-[10.5rem]"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

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
            className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-4 shadow-[0_0_8px_rgba(61,43,31,0.12)]"
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                {stat.title}
              </span>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', stat.bgColor)}>
                <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
              </div>
            </div>
            <div className="font-display text-2xl font-semibold text-[#3D2B1F]">{stat.value}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Receita por dia" className="lg:col-span-2" delay={0.1}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A0603A" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#A0603A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#8B7355', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8B7355' }}
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
                  stroke="#A0603A"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ r: 4, fill: '#A0603A', strokeWidth: 2, stroke: '#FFFCF8' }}
                  activeDot={{ r: 6, fill: '#A0603A', stroke: '#FFFCF8', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Pedidos por status" delay={0.15}>
          {statusPieData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-[#C4B5A0]">Sem dados</p>
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
                          <div className="rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] px-3 py-2 shadow-lg">
                            <p className="text-xs font-semibold text-[#8B7355]">{d.label}</p>
                            <p className="text-sm font-semibold text-[#3D2B1F]">{d.value} pedidos</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="font-display text-xl font-semibold text-[#3D2B1F]">
                      {data?.todayOrdersCount ?? 0}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B7355]">total</div>
                  </div>
                </div>
              </div>
              <div className="ml-3 space-y-1.5">
                {statusPieData.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-[#8B7355]">{s.label}</span>
                    <span className="text-xs font-semibold text-[#3D2B1F]">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Receita por hora" delay={0.2}>
          <div className="h-[200px]">
            {hourlyData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[#C4B5A0]">Sem dados</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#8B7355', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8B7355' }}
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
                        fill={entry.revenue > 0 ? '#A0603A' : '#E8DDD0'}
                        fillOpacity={entry.revenue > 0 ? 0.85 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Mais vendidos" delay={0.25}>
          <div className="h-[200px]">
            {!data?.topProducts?.length ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[#C4B5A0]">Sem dados</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 200 }}>
                {data.topProducts.map((product, i) => {
                  const maxQty = data.topProducts[0].qty;
                  const pct = maxQty > 0 ? (product.qty / maxQty) * 100 : 0;
                  return (
                    <div key={product.name} className="group">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-xs font-semibold text-[#3D2B1F]">
                          {i + 1}. {product.name}
                        </span>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          <span className="text-[10px] font-bold text-[#8B7355]">
                            {product.qty}x
                          </span>
                          <span className="text-[10px] font-semibold text-[#A0603A]">
                            {formatCurrency(product.revenue)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8DDD0]/60">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, #A0603A, #A0603A)`,
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

    </div>
  );
}

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
        active
          ? 'border-[#4A2810] bg-[#4A2810] text-white shadow-sm'
          : 'border-[#E8DDD0] bg-white text-[#3D2B1F] hover:bg-[#FAF6F1]',
      )}
    >
      {children}
    </button>
  );
}

function getDashboardPreset(range: { from: string; to: string }): 'today' | '7d' | '30d' | 'custom' {
  const today = toInputDate(new Date());
  const days = diffDays(range.from, range.to);

  if (range.from === today && range.to === today) return 'today';
  if (days === 6 && isExpectedRelativeRange(range.from, range.to, 6)) return '7d';
  if (days === 29 && isExpectedRelativeRange(range.from, range.to, 29)) return '30d';
  return 'custom';
}

function isExpectedRelativeRange(from: string, to: string, daysBack: number): boolean {
  const now = new Date();
  const expectedTo = toInputDate(now);
  const expectedFrom = new Date(now);
  expectedFrom.setDate(expectedFrom.getDate() - daysBack);
  return from === toInputDate(expectedFrom) && to === expectedTo;
}

function diffDays(from: string, to: string): number {
  const fromDate = new Date(`${from}T12:00:00`);
  const toDate = new Date(`${to}T12:00:00`);
  const diff = toDate.getTime() - fromDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function toInputDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}
