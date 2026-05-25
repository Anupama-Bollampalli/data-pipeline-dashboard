import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

interface Summary {
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
  customer_count: number;
  top_region: string;
}

interface MonthlyPoint {
  month: string;
  total_revenue: number;
  order_count: number;
}

interface TopProduct {
  product_id: number;
  name: string;
  category: string;
  total_revenue: number;
  order_count: number;
}

function fmt(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}k`;
  return `$${val.toFixed(2)}`;
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, subtitle, icon, color }: KpiCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const API = import.meta.env.VITE_API_URL ?? ''

export default function MetricsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sumRes, monRes, prodRes] = await Promise.all([
          fetch(`${API}/metrics/summary`),
          fetch(`${API}/metrics/monthly`),
          fetch(`${API}/metrics/top-products`),
        ]);

        if (!sumRes.ok) {
          const d = await sumRes.json().catch(() => ({}));
          throw new Error(d.detail ?? "Failed to load summary");
        }

        setSummary(await sumRes.json());
        setMonthly(monRes.ok ? await monRes.json() : []);
        setTopProducts(prodRes.ok ? await prodRes.json() : []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-6 text-yellow-300">
        <p className="font-medium">No data available</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-sm mt-2 text-yellow-400">
          Click "Run Pipeline" to load data first.
        </p>
      </div>
    );
  }

  const top5 = topProducts.slice(0, 5).map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 18) + "…" : p.name,
    revenue: p.total_revenue,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={fmt(summary?.total_revenue ?? 0)}
          subtitle={`Top region: ${summary?.top_region ?? "N/A"}`}
          icon={<DollarSign size={20} className="text-green-300" />}
          color="bg-green-900/30"
        />
        <KpiCard
          title="Orders"
          value={String(summary?.order_count ?? 0)}
          icon={<ShoppingCart size={20} className="text-blue-300" />}
          color="bg-blue-900/30"
        />
        <KpiCard
          title="Avg Order Value"
          value={fmt(summary?.avg_order_value ?? 0)}
          icon={<TrendingUp size={20} className="text-purple-300" />}
          color="bg-purple-900/30"
        />
        <KpiCard
          title="Customers"
          value={String(summary?.customer_count ?? 0)}
          icon={<Users size={20} className="text-orange-300" />}
          color="bg-orange-900/30"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Line Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            Monthly Revenue
          </h2>
          {monthly.length === 0 ? (
            <p className="text-gray-500 text-sm">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthly} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#d1d5db" }}
                  formatter={((v: number) => [fmt(v), "Revenue"]) as any}
                />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="total_revenue"
                  name="Revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 Products Bar Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            Top 5 Products by Revenue
          </h2>
          {top5.length === 0 ? (
            <p className="text-gray-500 text-sm">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={top5} margin={{ top: 4, right: 16, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#d1d5db" }}
                  formatter={((v: number) => [fmt(v), "Revenue"]) as any}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
