import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { NavLink } from "react-router-dom";
import Layout from "../../components/Layout/Layout";
import { listProfiles } from "../../utils/profile";
import { listTasks, parseTaskRemarks, TASK_STATUSES } from "../../utils/task";

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

function StatCard({ label, value, accent, subtitle }) {
  const accents = {
    slate: "from-slate-50 to-white ring-slate-200/80",
    blue: "from-blue-50/80 to-white ring-blue-200/60",
    amber: "from-amber-50/80 to-white ring-amber-200/60",
    emerald: "from-emerald-50/80 to-white ring-emerald-200/60",
    violet: "from-violet-50/80 to-white ring-violet-200/60",
  };
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-sm ring-1 ${accents[accent] ?? accents.slate}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/40 blur-2xl transition group-hover:scale-110" />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

function RankRow({ rank, title, meta, value, badge }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-white text-sm font-bold tabular-nums text-slate-700 ring-1 ring-slate-200/80">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        {badge ? (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-600/15">
            {badge}
          </span>
        ) : null}
        <span className="text-sm font-bold tabular-nums text-slate-900">
          {value}
        </span>
      </div>
    </div>
  );
}

const daysBetween = (a, b) => Math.floor((a - b) / (1000 * 60 * 60 * 24));
const startOfDayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { data: taskData, error: taskError },
      { data: profileData, error: profileError },
    ] = await Promise.all([listTasks(), listProfiles()]);
    setLoading(false);

    if (taskError) {
      toast.error(taskError.message);
      return;
    }
    if (profileError) {
      toast.error(profileError.message);
      return;
    }

    setTasks(taskData ?? []);
    setProfiles(profileData ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const profileById = useMemo(() => {
    const map = new Map();
    for (const p of profiles) map.set(Number(p.id), p);
    return map;
  }, [profiles]);

  const enrichedTasks = useMemo(() => {
    return (tasks ?? []).map((t) => {
      const meta = parseTaskRemarks(t.remarks);
      return {
        ...t,
        ...meta,
        profile: profileById.get(Number(t.responsible_id)) ?? null,
      };
    });
  }, [tasks, profileById]);

  const overview = useMemo(() => {
    const list = enrichedTasks;
    const total = list.length;
    const completed = list.filter((t) => t.status === "completed").length;
    const pendingApproval = list.filter((t) => !!t.requestedStatus).length;
    const overdue = list.filter(
      (t) =>
        t.status !== "completed" &&
        t.deadline &&
        new Date(`${t.deadline}T00:00:00`) < new Date(),
    ).length;

    return { total, completed, pendingApproval, overdue };
  }, [enrichedTasks]);

  const completedByPerson = useMemo(() => {
    const counts = new Map();
    for (const t of enrichedTasks) {
      if (t.status !== "completed") continue;
      const id = Number(t.responsible_id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([id, count]) => {
        const p = profileById.get(id);
        return {
          id,
          count,
          label: p?.code_name || p?.email || `profile #${id}`,
          meta: p?.email || "—",
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [enrichedTasks, profileById]);

  const earlyFinishByPerson = useMemo(() => {
    // Only count tasks that have COMPLETED_AT marker and a deadline.
    const stats = new Map();
    for (const t of enrichedTasks) {
      if (t.status !== "completed") continue;
      if (!t.completedAt || !t.deadline) continue;

      const completedAt = new Date(t.completedAt);
      if (Number.isNaN(completedAt.getTime())) continue;
      const deadline = new Date(`${t.deadline}T00:00:00`);

      const daysEarly = daysBetween(deadline, completedAt);
      // Positive means finished before deadline.
      if (daysEarly <= 0) continue;

      const id = Number(t.responsible_id);
      const current = stats.get(id) ?? {
        totalEarlyDays: 0,
        completedEarlyCount: 0,
      };
      current.totalEarlyDays += daysEarly;
      current.completedEarlyCount += 1;
      stats.set(id, current);
    }

    return Array.from(stats.entries())
      .map(([id, s]) => {
        const p = profileById.get(id);
        const avg = s.totalEarlyDays / s.completedEarlyCount;
        return {
          id,
          avgDaysEarly: avg,
          completedEarlyCount: s.completedEarlyCount,
          label: p?.code_name || p?.email || `profile #${id}`,
          meta: `${s.completedEarlyCount} finished early`,
        };
      })
      .sort((a, b) => b.avgDaysEarly - a.avgDaysEarly)
      .slice(0, 8);
  }, [enrichedTasks, profileById]);

  const statusCounts = useMemo(() => {
    const map = new Map();
    for (const t of enrichedTasks) {
      map.set(t.status, (map.get(t.status) ?? 0) + 1);
    }
    return TASK_STATUSES.map((s) => ({
      status: s.value,
      label: s.label,
      count: map.get(s.value) ?? 0,
    }));
  }, [enrichedTasks]);

  const trend = useMemo(() => {
    // last 14 days including today
    const days = 14;
    const today = new Date();
    const keys = [];
    const createdCounts = new Map();
    const completedCounts = new Map();

    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = startOfDayKey(d);
      keys.push(key);
      createdCounts.set(key, 0);
      completedCounts.set(key, 0);
    }

    for (const t of enrichedTasks) {
      // created_at is a timestamp with timezone in DB
      if (t.created_at) {
        const created = new Date(t.created_at);
        if (!Number.isNaN(created.getTime())) {
          const key = startOfDayKey(created);
          if (createdCounts.has(key)) {
            createdCounts.set(key, (createdCounts.get(key) ?? 0) + 1);
          }
        }
      }

      if (t.status === "completed" && t.completedAt) {
        const completed = new Date(t.completedAt);
        if (!Number.isNaN(completed.getTime())) {
          const key = startOfDayKey(completed);
          if (completedCounts.has(key)) {
            completedCounts.set(key, (completedCounts.get(key) ?? 0) + 1);
          }
        }
      }
    }

    const createdSeries = keys.map((k) => createdCounts.get(k) ?? 0);
    const completedSeries = keys.map((k) => completedCounts.get(k) ?? 0);
    const max = Math.max(1, ...createdSeries, ...completedSeries);

    return { keys, createdSeries, completedSeries, max };
  }, [enrichedTasks]);

  const trendSvg = useMemo(() => {
    const w = 640;
    const h = 220;
    const padX = 16;
    const padY = 18;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    const toPoint = (idx, value) => {
      const x =
        trend.keys.length <= 1
          ? padX
          : padX + (idx / (trend.keys.length - 1)) * innerW;
      const y = padY + (1 - value / trend.max) * innerH;
      return { x, y };
    };

    const toPath = (series) =>
      series
        .map((v, i) => {
          const p = toPoint(i, v);
          return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
        })
        .join(" ");

    const createdPath = toPath(trend.createdSeries);
    const completedPath = toPath(trend.completedSeries);

    // fill under completed line (subtle)
    const areaPoints = trend.completedSeries.map((v, i) => toPoint(i, v));
    const areaPath = [
      `M ${areaPoints[0].x.toFixed(2)} ${h - padY}`,
      ...areaPoints.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
      `L ${areaPoints[areaPoints.length - 1].x.toFixed(2)} ${h - padY}`,
      "Z",
    ].join(" ");

    return { w, h, padX, padY, createdPath, completedPath, areaPath };
  }, [trend]);

  const dueSoon = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const windowDays = 7;
    const end = new Date(today);
    end.setDate(end.getDate() + windowDays);

    const list = enrichedTasks
      .filter((t) => t.status !== "completed" && t.deadline)
      .map((t) => ({
        ...t,
        deadlineDate: new Date(`${t.deadline}T00:00:00`),
      }))
      .filter((t) => !Number.isNaN(t.deadlineDate.getTime()))
      .filter((t) => t.deadlineDate <= end)
      .sort((a, b) => a.deadlineDate - b.deadlineDate)
      .slice(0, 8);

    return {
      windowDays,
      items: list,
    };
  }, [enrichedTasks]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Admin
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={load}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              <svg
                className={`h-5 w-5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total tasks"
            value={loading ? "…" : overview.total}
            accent="slate"
          />
          <StatCard
            label="Completed"
            value={loading ? "…" : overview.completed}
            accent="emerald"
            subtitle={loading ? "" : `${statusLabel("completed")} tasks`}
          />
          <StatCard
            label="Awaiting approval"
            value={loading ? "…" : overview.pendingApproval}
            accent="amber"
            subtitle="Status change requests"
          />
          <StatCard
            label="Overdue (not completed)"
            value={loading ? "…" : overview.overdue}
            accent="violet"
            subtitle="Past due date"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Activity trend
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {loading
                    ? "Loading…"
                    : "Tasks created vs tasks completed (last 14 days)"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  Created
                </span>
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  Completed
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
                <svg
                  viewBox={`0 0 ${trendSvg.w} ${trendSvg.h}`}
                  className="h-[240px] w-full"
                  role="img"
                  aria-label="Activity trend chart"
                >
                  {/* grid */}
                  {[0, 1, 2, 3].map((i) => {
                    const y =
                      trendSvg.padY +
                      (i / 3) * (trendSvg.h - trendSvg.padY * 2);
                    return (
                      <line
                        key={i}
                        x1={trendSvg.padX}
                        x2={trendSvg.w - trendSvg.padX}
                        y1={y}
                        y2={y}
                        stroke="rgb(226 232 240)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* area under completed */}
                  <path d={trendSvg.areaPath} fill="rgb(16 185 129 / 0.08)" />

                  {/* created line */}
                  <path
                    d={trendSvg.createdPath}
                    fill="none"
                    stroke="rgb(37 99 235)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* completed line */}
                  <path
                    d={trendSvg.completedPath}
                    fill="none"
                    stroke="rgb(5 150 105)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>
                    Max/day: <span className="font-semibold">{trend.max}</span>
                  </span>
                  <span>
                    Range:{" "}
                    <span className="font-semibold">
                      {trend.keys[0]} → {trend.keys[trend.keys.length - 1]}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-1 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Due soon</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading
                  ? "Loading…"
                  : `Next ${dueSoon.windowDays} days · excludes completed`}
              </p>
            </div>
            <div className="space-y-3 p-5">
              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : dueSoon.items.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No upcoming deadlines in the next {dueSoon.windowDays} days.
                </p>
              ) : (
                dueSoon.items.map((t) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffDays = daysBetween(t.deadlineDate, today);
                  const urgency =
                    diffDays < 0
                      ? {
                          label: "Overdue",
                          cls: "bg-rose-50 text-rose-800 ring-rose-600/15",
                        }
                      : diffDays === 0
                        ? {
                            label: "Due today",
                            cls: "bg-amber-50 text-amber-900 ring-amber-600/15",
                          }
                        : diffDays === 1
                          ? {
                              label: "Due tomorrow",
                              cls: "bg-amber-50 text-amber-900 ring-amber-600/15",
                            }
                          : {
                              label: `Due in ${diffDays}d`,
                              cls: "bg-slate-100 text-slate-700 ring-slate-600/10",
                            };

                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {t.agenda}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                              {t.profile?.code_name ?? t.profiles?.code_name ?? "—"}
                            </span>
                            <span>•</span>
                            <span className="font-medium">
                              {formatDate(t.deadline)}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${urgency.cls}`}
                        >
                          {urgency.label}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                        {t.activities}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="lg:col-span-1 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Status breakdown
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading ? "Loading…" : "All tasks by current status"}
              </p>
            </div>
            <div className="space-y-3 p-5">
              {statusCounts.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="w-28 text-sm font-medium text-slate-700">
                    {s.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600/70"
                      style={{
                        width:
                          overview.total > 0
                            ? `${Math.round((s.count / overview.total) * 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-900">
                    {loading ? "…" : s.count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-1 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Most completed
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading
                  ? "Loading…"
                  : "Who completed the most tasks (all time)"}
              </p>
            </div>
            <div className="space-y-3 p-5">
              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : completedByPerson.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No completed tasks yet.
                </p>
              ) : (
                completedByPerson.map((row, idx) => (
                  <RankRow
                    key={row.id}
                    rank={idx + 1}
                    title={row.label}
                    meta={row.meta}
                    value={row.count}
                    badge="completed"
                  />
                ))
              )}
            </div>
          </section>

          <section className="lg:col-span-1 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Finishes early
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading
                  ? "Loading…"
                  : "Highest average days finished before deadline"}
              </p>
            </div>
            <div className="space-y-3 p-5">
              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : earlyFinishByPerson.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No “finished early” data yet. Once tasks are marked completed,
                  this leaderboard will populate.
                </p>
              ) : (
                earlyFinishByPerson.map((row, idx) => (
                  <RankRow
                    key={row.id}
                    rank={idx + 1}
                    title={row.label}
                    meta={row.meta}
                    value={`${row.avgDaysEarly.toFixed(1)}d`}
                    badge="avg early"
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
