/**
 * ProjectsByTypeChart
 * Donut chart — project count by project_type (GIA, SETUP, CEST, SSCP).
 */
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const TYPE_COLORS = {
  GIA: "#059669",
  SETUP: "#3b82f6",
  CEST: "#8b5cf6",
  SSCP: "#f59e0b",
  Unknown: "#94a3b8",
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  const pct = p.percent != null ? `(${(p.percent * 100).toFixed(1)}%)` : "";
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="font-bold" style={{ color: TYPE_COLORS[name] ?? "#64748b" }}>
        {name}
      </p>
      <p className="text-slate-700">
        {value} project{value !== 1 ? "s" : ""}{" "}
        <span className="text-slate-400">{pct}</span>
      </p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const ProjectsByTypeChart = ({ records }) => {
  const counts = records.reduce((acc, r) => {
    const type = r.project_type || "Unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius="38%"
          outerRadius="62%"
          paddingAngle={3}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={TYPE_COLORS[entry.name] ?? "#94a3b8"}
              stroke="none"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ProjectsByTypeChart;
