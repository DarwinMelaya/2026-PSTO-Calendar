/**
 * StatusByYearChart
 * Stacked bar chart — completed / ongoing / terminated counts by year.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="mb-2 font-bold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
      <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-slate-500">
        Total: <span className="font-semibold text-slate-700">{total}</span>
      </p>
    </div>
  );
};

const StatusByYearChart = ({ records }) => {
  const grouped = records.reduce((acc, r) => {
    const year = r.year ?? "Unknown";
    if (!acc[year]) acc[year] = { year: String(year), Completed: 0, Ongoing: 0, Terminated: 0 };
    if (r.completed) acc[year].Completed += 1;
    else if (r.terminated) acc[year].Terminated += 1;
    else acc[year].Ongoing += 1;
    return acc;
  }, {});

  const data = Object.values(grouped).sort(
    (a, b) => Number(a.year) - Number(b.year),
  );

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar dataKey="Completed" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Ongoing" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Terminated" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StatusByYearChart;
