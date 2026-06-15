/**
 * BudgetByYearChart
 * Bar chart — total_amount and downloaded_funds_to_beneficiary grouped by year.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatPHP = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="mb-2 font-bold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}:{" "}
          <span className="font-semibold">
            {new Intl.NumberFormat("en-PH", {
              style: "currency",
              currency: "PHP",
              minimumFractionDigits: 2,
            }).format(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
};

const BudgetByYearChart = ({ records }) => {
  const data = Object.entries(
    records.reduce((acc, r) => {
      const year = r.year ?? "Unknown";
      if (!acc[year]) acc[year] = { year: String(year), total: 0, downloaded: 0 };
      acc[year].total += Number(r.total_amount) || 0;
      acc[year].downloaded += Number(r.downloaded_funds_to_beneficiary) || 0;
      return acc;
    }, {}),
  )
    .map(([, v]) => v)
    .sort((a, b) => Number(a.year) - Number(b.year));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatPHP}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar dataKey="total" name="Total Budget" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={48} />
        <Bar dataKey="downloaded" name="Downloaded Funds" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BudgetByYearChart;
