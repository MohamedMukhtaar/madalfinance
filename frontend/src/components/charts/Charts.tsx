import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from "recharts";
import { useTheme } from "@/context/ThemeContext";
import { formatCompactCurrency, formatCurrency } from "@/utils/format";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

export interface ChartDatum {
  [key: string]: string | number;
}

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return {
    dark,
    grid: dark ? "#1e293b" : "#eef2f7",
    axis: dark ? "#64748b" : "#94a3b8",
    tooltipBg: dark ? "#0f172a" : "#ffffff",
    tooltipBorder: dark ? "#1e293b" : "#e2e8f0",
    legendText: dark ? "#94a3b8" : "#64748b",
  };
}

function ChartTooltip({
  active,
  payload,
  label,
  currency = "$",
  showPercent = false,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: ChartDatum }>;
  label?: string;
  currency?: string;
  showPercent?: boolean;
}) {
  const t = useChartTheme();
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div
      className="rounded-xl px-3.5 py-3 text-sm shadow-pop ring-1"
      style={{ backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, color: t.legendText }}
    >
      {label && <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize">{entry.name}</span>
            <span className="ml-auto pl-4 font-semibold text-slate-900 dark:text-white">
              {formatCurrency(entry.value ?? 0, currency)}
              {showPercent && total > 0 && (
                <span className="ml-1.5 text-xs font-medium opacity-60">
                  {Math.round(((entry.value ?? 0) / total) * 100)}%
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueAreaChart({
  data,
  currency = "$",
  height = 280,
  loading,
  className,
}: {
  data: ChartDatum[];
  currency?: string;
  height?: number;
  loading?: boolean;
  className?: string;
}) {
  const t = useChartTheme();
  if (loading) {
    return (
      <div className={cn("flex items-end justify-center", className)} style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#74bcf8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#74bcf8" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.26} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: t.grid }} />
        <Legend
          formatter={(value: string) => <span style={{ color: t.legendText, fontSize: 12 }}>{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="#74bcf8"
          strokeWidth={2.5}
          fill="url(#gIncome)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Expenses"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fill="url(#gExpense)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CashFlowComposedChart({
  data,
  currency = "$",
  height = 300,
  loading,
}: {
  data: ChartDatum[];
  currency?: string;
  height?: number;
  loading?: boolean;
}) {
  const t = useChartTheme();
  if (loading) return <Skeleton className="h-full w-full" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "rgba(100,116,139,0.06)" }} />
        <Legend formatter={(v: string) => <span style={{ color: t.legendText, fontSize: 12 }}>{v}</span>} />
        <Bar dataKey="inflow" name="Cash In" fill="#74bcf8" radius={[6, 6, 0, 0]} maxBarSize={22} />
        <Bar dataKey="outflow" name="Cash Out" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={22} />
        <Line
          type="monotone"
          dataKey="net"
          name="Net"
          stroke="#22c55e"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseBarChart({
  data,
  currency = "$",
  height = 300,
  loading,
}: {
  data: ChartDatum[];
  currency?: string;
  height?: number;
  loading?: boolean;
}) {
  const t = useChartTheme();
  if (loading) {
    return (
      <div style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }} barGap={5}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
        <YAxis
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "rgba(100,116,139,0.06)" }} />
        <Legend formatter={(v: string) => <span style={{ color: t.legendText, fontSize: 12 }}>{v}</span>} />
        <Bar dataKey="income" name="Income" fill="#74bcf8" radius={[6, 6, 0, 0]} maxBarSize={18} />
        <Bar dataKey="expense" name="Expense" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bar ranking (e.g. customers by outstanding, expense categories). */
export function HorizontalBarChart({
  data,
  currency = "$",
  height = 300,
  loading,
  valueKey = "value",
  nameKey = "name",
  color = "#101848",
}: {
  data: Array<Record<string, string | number>>;
  currency?: string;
  height?: number;
  loading?: boolean;
  valueKey?: string;
  nameKey?: string;
  color?: string;
}) {
  const t = useChartTheme();
  if (loading) {
    return (
      <div style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  if (!data.length) {
    return <p className="py-16 text-center text-sm text-slate-400">No data to chart.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
        />
        <YAxis
          type="category"
          dataKey={nameKey}
          width={110}
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "rgba(100,116,139,0.06)" }} />
        <Bar dataKey={valueKey} name="Amount" fill={color} radius={[0, 6, 6, 0]} maxBarSize={18}>
          {data.map((entry, i) => (
            <Cell key={i} fill={String(entry.color ?? color)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Full pie (not donut) for mix views. */
export function FullPieChart({
  data,
  height = 280,
  loading,
  currency = "$",
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  loading?: boolean;
  currency?: string;
}) {
  if (loading) {
    return (
      <div style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency={currency} showPercent />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatCurrency(d.value, currency)}
              {total ? ` · ${Math.round((d.value / total) * 100)}%` : ""}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Net profit/loss line for income statement. */
export function NetTrendLineChart({
  data,
  currency = "$",
  height = 280,
  loading,
}: {
  data: ChartDatum[];
  currency?: string;
  height?: number;
  loading?: boolean;
}) {
  const t = useChartTheme();
  if (loading) {
    return (
      <div style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
        <YAxis
          tick={{ fill: t.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: t.grid }} />
        <Legend formatter={(v: string) => <span style={{ color: t.legendText, fontSize: 12 }}>{v}</span>} />
        <Line
          type="monotone"
          dataKey="profit"
          name="Net profit"
          stroke="#101848"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#101848", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Stacked bars for member dues status (counts). */
export function StackedStatusBarChart({
  data,
  height = 280,
  loading,
}: {
  data: ChartDatum[];
  height?: number;
  loading?: boolean;
}) {
  const t = useChartTheme();
  if (loading) {
    return (
      <div style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
        <YAxis tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(100,116,139,0.06)" }} />
        <Legend formatter={(v: string) => <span style={{ color: t.legendText, fontSize: 12 }}>{v}</span>} />
        <Bar dataKey="paid" name="Paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={36} />
        <Bar dataKey="partial" name="Partial" stackId="a" fill="#f59e0b" maxBarSize={36} />
        <Bar dataKey="pending" name="Pending" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 260,
  centerLabel,
  centerValue,
  loading,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  loading?: boolean;
}) {
  const t = useChartTheme();
  if (loading) return <Skeleton className="h-full w-full" />;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="64%"
            outerRadius="88%"
            paddingAngle={3}
            strokeWidth={0}
            cornerRadius={6}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip showPercent />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-xl font-bold text-slate-900 dark:text-white">{centerValue}</span>
          )}
          {centerLabel && <span className="text-[11px] font-medium text-slate-400">{centerLabel}</span>}
        </div>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <CardHeader title={title} subtitle={subtitle} action={action} className="px-0 pt-0 sm:px-0" />
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function useThemeColors() {
  const t = useChartTheme();
  return { ...t, ...{ axis: t.axis } };
}
