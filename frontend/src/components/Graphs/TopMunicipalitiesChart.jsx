/**
 * TopMunicipalitiesChart
 * Horizontal bar chart — top municipalities by project count.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BAR_COLORS = [
  "#059669", "#0d9488", "#3b82f6", "#8b5cf6",
  "#f59e0b", "#f43f5e", "#64748b", "#10b981",
  "#6366f1", "#ec4899",
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700">{payload[0].payload.municipality}</p>
      <p className="text-slate-600">
        {payload[0].value} project{payload[0].value !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

const TopMunicipalitiesChart = ({ records, topN = 10 }) => {
  const counts = records.reduce((acc, r) => {
    const m = r.municipality?.trim() || "Unknown";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts)
    .map(([municipality, count]) => ({ municipality, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No data
      </div>
    );
  }

  const chartHeight = Math.max(200, data.length * 36);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
        barSize={20}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="municipality"
          width={110}
          tick={{ fontSize: 11, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="count" name="Projects" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopMunicipalitiesChart;
