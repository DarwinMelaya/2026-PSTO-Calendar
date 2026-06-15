/**
 * DocumentCompletionChart
 * Radial bar chart — average completion rate per boolean field group.
 */
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const GROUPS = [
  {
    label: "Reports",
    color: "#3b82f6",
    fields: ["status_report_1st", "status_report_2nd", "terminal_report"],
  },
  {
    label: "Documents",
    color: "#8b5cf6",
    fields: ["received_approved", "with_coo"],
  },
  {
    label: "Interventions",
    color: "#f59e0b",
    fields: [
      "intervention_equipment",
      "intervention_mooe",
      "intervention_trainings",
      "intervention_consultancy",
      "intervention_pl",
      "intervention_lab_others",
    ],
  },
  {
    label: "Realignment",
    color: "#0d9488",
    fields: ["realignment_1st", "realignment_2nd"],
  },
  {
    label: "Completion",
    color: "#059669",
    fields: ["completed", "liquidation_psto", "impact_assessment"],
  },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, fill } = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg text-xs">
      <p className="font-bold" style={{ color: fill }}>
        {name}
      </p>
      <p className="text-slate-700">
        Avg. completion:{" "}
        <span className="font-semibold">{value.toFixed(1)}%</span>
      </p>
    </div>
  );
};

const DocumentCompletionChart = ({ records }) => {
  if (records.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No data
      </div>
    );
  }

  const data = GROUPS.map(({ label, color, fields }) => {
    const checkedCounts = fields.map(
      (f) => records.filter((r) => Boolean(r[f])).length,
    );
    const avg =
      checkedCounts.reduce((s, c) => s + c, 0) /
      (fields.length * records.length) *
      100;
    return { name: label, value: Math.round(avg * 10) / 10, fill: color };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-1">
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          barSize={14}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={6}
            background={{ fill: "#f1f5f9" }}
            label={false}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Legend with inline % */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-2 pb-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: d.fill }}
            />
            <span className="min-w-0 truncate text-xs text-slate-600">{d.name}</span>
            <span className="ml-auto text-xs font-semibold" style={{ color: d.fill }}>
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentCompletionChart;
