import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { NavLink } from "react-router-dom";
import Layout from "../../components/Layout/Layout";
import ApprovalViewModal from "../../components/Modals/AdminModals/Dashboard/ApprovalViewModal";
import CompletedViewModal from "../../components/Modals/AdminModals/Dashboard/CompletedViewModal";
import OverdueViewModal from "../../components/Modals/AdminModals/Dashboard/OverdueViewModal";
import PriorityViewModal from "../../components/Modals/AdminModals/Dashboard/PriorityViewModal";
import TotalTaskModal from "../../components/Modals/AdminModals/Dashboard/TotalTaskModal";
import OwnerOpenTasksModal from "../../components/Modals/AdminModals/OwnerOpenTasksModal";
import PriorityBadge from "../../components/Task/PriorityBadge";
import { listProfiles } from "../../utils/profile";
import {
  formatTaskDeadline,
  isTaskPriority,
  listTasks,
  parseTaskRemarks,
  TASK_STATUSES,
} from "../../utils/task";

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

function StatCard({ label, value, accent, subtitle, onClick }) {
  const accents = {
    slate: "from-slate-50 to-white ring-slate-200/80",
    blue: "from-blue-50/80 to-white ring-blue-200/60",
    amber: "from-amber-50/80 to-white ring-amber-200/60",
    emerald: "from-emerald-50/80 to-white ring-emerald-200/60",
    violet: "from-violet-50/80 to-white ring-violet-200/60",
    rose: "from-rose-50/80 to-white ring-rose-200/60",
  };
  const className = `group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-left shadow-sm ring-1 transition ${accents[accent] ?? accents.slate} ${
    onClick
      ? "cursor-pointer hover:shadow-md hover:ring-slate-300/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      : ""
  }`;

  const content = (
    <>
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
      {onClick ? (
        <p className="mt-2 text-xs font-medium text-blue-600 opacity-0 transition group-hover:opacity-100">
          Click to view
        </p>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
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
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function OwnerProgressCard({
  label,
  completed,
  total,
  selected,
  onClick,
}) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCompleted = clamp(Number(completed) || 0, 0, safeTotal || 0);
  const incomplete = safeTotal - safeCompleted;
  const pct = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
        selected
          ? "border-blue-300 bg-blue-50/50 ring-2 ring-blue-500/20"
          : "border-slate-200/90 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {label}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Completed{" "}
            <span className="font-semibold text-slate-700">
              {safeCompleted}/{safeTotal || 0}
            </span>
            {incomplete > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold text-amber-700">
                  {incomplete} open
                </span>
              </>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
          {pct}%
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-600/80"
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}

const Dashboard = ({ readOnly = false }) => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [activeStatModal, setActiveStatModal] = useState(null);

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

    const priority = list.filter((t) => isTaskPriority(t)).length;
    const priorityOpen = list.filter(
      (t) => isTaskPriority(t) && t.status !== "completed",
    ).length;

    return { total, completed, pendingApproval, overdue, priority, priorityOpen };
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

  const ownerProgress = useMemo(() => {
    const map = new Map();
    for (const t of enrichedTasks ?? []) {
      const id = Number(t?.responsible_id);
      if (!id) continue;
      const label = t?.profile?.code_name || t?.profile?.email || `profile #${id}`;
      const current = map.get(id) ?? { id, label, total: 0, completed: 0 };
      current.total += 1;
      if (t?.status === "completed") current.completed += 1;
      map.set(id, current);
    }

    return Array.from(map.values())
      .filter((x) => x.total > 0)
      .sort((a, b) => {
        const aPct = a.total > 0 ? a.completed / a.total : 0;
        const bPct = b.total > 0 ? b.completed / b.total : 0;
        if (bPct !== aPct) return bPct - aPct;
        return b.total - a.total;
      })
      .slice(0, 12);
  }, [enrichedTasks]);

  const selectedOwner = useMemo(
    () => ownerProgress.find((o) => o.id === selectedOwnerId) ?? null,
    [ownerProgress, selectedOwnerId],
  );

  const incompleteTasksForOwner = useMemo(() => {
    if (!selectedOwnerId) return [];
    return enrichedTasks
      .filter(
        (t) =>
          Number(t.responsible_id) === selectedOwnerId &&
          t.status !== "completed",
      )
      .sort((a, b) => {
        const priA = isTaskPriority(a) ? 1 : 0;
        const priB = isTaskPriority(b) ? 1 : 0;
        if (priB !== priA) return priB - priA;
        const aDate = a.deadline
          ? new Date(`${a.deadline}T00:00:00`).getTime()
          : Infinity;
        const bDate = b.deadline
          ? new Date(`${b.deadline}T00:00:00`).getTime()
          : Infinity;
        return aDate - bDate;
      });
  }, [enrichedTasks, selectedOwnerId]);

  const priorityTasks = useMemo(() => {
    const seen = new Set();
    const list = [];

    for (const t of enrichedTasks) {
      if (!isTaskPriority(t) || t.status === "completed") continue;
      const key = t.groupKey || `single-${t.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(t);
    }

    return list
      .sort((a, b) => {
        const aDeadline = a.deadline
          ? new Date(`${a.deadline}T00:00:00`).getTime()
          : Infinity;
        const bDeadline = b.deadline
          ? new Date(`${b.deadline}T00:00:00`).getTime()
          : Infinity;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      })
      .slice(0, 8);
  }, [enrichedTasks]);

  const isOverdueTask = useCallback((t) => {
    if (t.status === "completed" || !t.deadline) return false;
    const deadline = new Date(`${t.deadline}T00:00:00`);
    return !Number.isNaN(deadline.getTime()) && deadline < new Date();
  }, []);

  const allTasksSorted = useMemo(() => {
    return [...enrichedTasks].sort((a, b) => {
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });
  }, [enrichedTasks]);

  const priorityTasksAll = useMemo(() => {
    return enrichedTasks
      .filter((t) => isTaskPriority(t))
      .sort((a, b) => {
        const aDeadline = a.deadline
          ? new Date(`${a.deadline}T00:00:00`).getTime()
          : Infinity;
        const bDeadline = b.deadline
          ? new Date(`${b.deadline}T00:00:00`).getTime()
          : Infinity;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      });
  }, [enrichedTasks]);

  const completedTasksAll = useMemo(() => {
    return enrichedTasks
      .filter((t) => t.status === "completed")
      .sort((a, b) => {
        const aAt = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bAt - aAt;
      });
  }, [enrichedTasks]);

  const approvalTasksAll = useMemo(() => {
    return enrichedTasks
      .filter((t) => !!t.requestedStatus)
      .sort((a, b) => {
        const aDate = a.task_date
          ? new Date(`${a.task_date}T00:00:00`).getTime()
          : 0;
        const bDate = b.task_date
          ? new Date(`${b.task_date}T00:00:00`).getTime()
          : 0;
        return bDate - aDate;
      });
  }, [enrichedTasks]);

  const overdueTasksAll = useMemo(() => {
    return enrichedTasks
      .filter(isOverdueTask)
      .sort((a, b) => {
        const aDeadline = new Date(`${a.deadline}T00:00:00`).getTime();
        const bDeadline = new Date(`${b.deadline}T00:00:00`).getTime();
        return aDeadline - bDeadline;
      });
  }, [enrichedTasks, isOverdueTask]);

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
      .sort((a, b) => {
        const priA = isTaskPriority(a) ? 1 : 0;
        const priB = isTaskPriority(b) ? 1 : 0;
        if (priB !== priA) return priB - priA;
        return a.deadlineDate - b.deadlineDate;
      })
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
              {readOnly ? "Viewer" : "Admin"}
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total tasks"
            value={loading ? "…" : overview.total}
            accent="slate"
            onClick={loading ? undefined : () => setActiveStatModal("total")}
          />
          <StatCard
            label="Priority"
            value={loading ? "…" : overview.priority}
            accent="rose"
            subtitle={
              loading ? "" : `${overview.priorityOpen} open · high importance`
            }
            onClick={loading ? undefined : () => setActiveStatModal("priority")}
          />
          <StatCard
            label="Completed"
            value={loading ? "…" : overview.completed}
            accent="emerald"
            subtitle={loading ? "" : `${statusLabel("completed")} tasks`}
            onClick={loading ? undefined : () => setActiveStatModal("completed")}
          />
          <StatCard
            label="Awaiting approval"
            value={loading ? "…" : overview.pendingApproval}
            accent="amber"
            subtitle="Status change requests"
            onClick={loading ? undefined : () => setActiveStatModal("approval")}
          />
          <StatCard
            label="Overdue (not completed)"
            value={loading ? "…" : overview.overdue}
            accent="violet"
            subtitle="Past due date"
            onClick={loading ? undefined : () => setActiveStatModal("overdue")}
          />
        </div>

        <section className="overflow-hidden rounded-3xl border border-rose-200/80 bg-white shadow-xl shadow-rose-100/30 ring-1 ring-rose-900/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-100 bg-gradient-to-r from-rose-50/90 to-white px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Priority tasks
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading
                  ? "Loading…"
                  : `${priorityTasks.length} open shown · ${overview.priorityOpen} total open priority`}
              </p>
            </div>
            {!readOnly && !loading && overview.priority > 0 ? (
              <NavLink
                to="/admin-add-task"
                className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-900 transition hover:bg-rose-100"
              >
                Manage in Tasks
              </NavLink>
            ) : null}
          </div>
          <div className="space-y-3 p-5">
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : priorityTasks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No open priority tasks. Mark tasks as priority from the Tasks
                page.
              </p>
            ) : (
              priorityTasks.map((t) => (
                <div
                  key={t.groupKey || t.id}
                  className="rounded-2xl border border-rose-200/90 bg-rose-50/30 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge />
                        <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                          {statusLabel(t.status)}
                        </span>
                      </div>
                      <p className="mt-2 truncate font-semibold text-slate-900">
                        {t.agenda}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                          {t.profile?.code_name ?? t.profiles?.code_name ?? "—"}
                        </span>
                        <span>•</span>
                        <span>{formatDate(t.task_date)}</span>
                        <span>•</span>
                        <span className="font-medium">
                          {formatTaskDeadline(t.deadline)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {t.activities || "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Owner progress
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {loading
                    ? "Loading…"
                    : "Click an owner to view open (not completed) tasks"}
                </p>
              </div>
              {!loading && ownerProgress.length > 0 ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                  Top {Math.min(ownerProgress.length, 12)}
                </span>
              ) : null}
            </div>

            <div className="p-5">
              {loading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : ownerProgress.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No owner progress yet. Add tasks first.
                </p>
              ) : (
                <div className="-mx-5 overflow-x-auto px-5">
                  <div className="grid min-w-[720px] grid-cols-3 gap-3 sm:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
                    {ownerProgress.map((o) => (
                      <OwnerProgressCard
                        key={o.id}
                        label={o.label}
                        completed={o.completed}
                        total={o.total}
                        selected={selectedOwnerId === o.id}
                        onClick={() => setSelectedOwnerId(o.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
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
                          <div className="flex flex-wrap items-center gap-2">
                            {isTaskPriority(t) ? <PriorityBadge /> : null}
                            <p className="truncate font-semibold text-slate-900">
                              {t.agenda}
                            </p>
                          </div>
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

      <OwnerOpenTasksModal
        isOpen={!!selectedOwnerId}
        onClose={() => setSelectedOwnerId(null)}
        ownerLabel={selectedOwner?.label}
        tasks={incompleteTasksForOwner}
      />

      <TotalTaskModal
        isOpen={activeStatModal === "total"}
        onClose={() => setActiveStatModal(null)}
        tasks={allTasksSorted}
      />
      <PriorityViewModal
        isOpen={activeStatModal === "priority"}
        onClose={() => setActiveStatModal(null)}
        tasks={priorityTasksAll}
      />
      <CompletedViewModal
        isOpen={activeStatModal === "completed"}
        onClose={() => setActiveStatModal(null)}
        tasks={completedTasksAll}
      />
      <ApprovalViewModal
        isOpen={activeStatModal === "approval"}
        onClose={() => setActiveStatModal(null)}
        tasks={approvalTasksAll}
      />
      <OverdueViewModal
        isOpen={activeStatModal === "overdue"}
        onClose={() => setActiveStatModal(null)}
        tasks={overdueTasksAll}
      />
    </Layout>
  );
};

export default Dashboard;
