import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  ListSkeleton,
  PanelHeader,
  ProgressRing,
  StatCard,
} from "../../components/User/UserWorkspaceUI";
import ApprovalViewModal from "../../components/Modals/AdminModals/Dashboard/ApprovalViewModal";
import CompletedViewModal from "../../components/Modals/AdminModals/Dashboard/CompletedViewModal";
import OverdueViewModal from "../../components/Modals/AdminModals/Dashboard/OverdueViewModal";
import PriorityViewModal from "../../components/Modals/AdminModals/Dashboard/PriorityViewModal";
import TotalTaskModal from "../../components/Modals/AdminModals/Dashboard/TotalTaskModal";
import OwnerOpenTasksModal from "../../components/Modals/AdminModals/OwnerOpenTasksModal";
import PriorityBadge from "../../components/Task/PriorityBadge";
import { listProfiles } from "../../utils/profile";
import {
  formatActivitiesPreview,
  isTaskPriority,
  listTasks,
  parseTaskRemarks,
  TASK_STATUSES,
} from "../../utils/task";

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

function RankRow({ rank, title, meta, value, badge }) {
  const rankStyle =
    rank === 1
      ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30 ring-amber-300/50"
      : rank === 2
        ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md ring-slate-400/50"
        : rank === 3
          ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md ring-orange-300/50"
          : "bg-gradient-to-br from-slate-100 to-white text-slate-700 ring-slate-200/80";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold tabular-nums ring-1 ${rankStyle}`}
      >
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

const urgencyStyle = (diffDays) => {
  if (diffDays < 0) {
    return {
      label: "Overdue",
      badge: "bg-rose-50 text-rose-800 ring-rose-600/15",
      border: "border-l-rose-500",
      iconBg: "bg-rose-50 text-rose-600",
    };
  }
  if (diffDays === 0) {
    return {
      label: "Due today",
      badge: "bg-amber-50 text-amber-900 ring-amber-600/15",
      border: "border-l-amber-500",
      iconBg: "bg-amber-50 text-amber-600",
    };
  }
  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      badge: "bg-amber-50 text-amber-900 ring-amber-600/15",
      border: "border-l-amber-400",
      iconBg: "bg-amber-50 text-amber-600",
    };
  }
  return {
    label: `Due in ${diffDays}d`,
    badge: "bg-slate-100 text-slate-700 ring-slate-600/10",
    border: "border-l-slate-300",
    iconBg: "bg-slate-100 text-slate-600",
  };
};

const normalizeText = (value) => String(value ?? "").toLowerCase().trim();

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
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
        selected
          ? "border-blue-300 bg-blue-50/50 ring-2 ring-blue-500/20"
          : "border-slate-200/90 bg-white hover:border-slate-300"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-8 -bottom-8 h-12 rounded-full bg-emerald-300/30 blur-2xl opacity-0 transition duration-300 group-hover:opacity-100" />
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredTasks = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return enrichedTasks;

    return enrichedTasks.filter((t) => {
      const assigneeLabel =
        t.profile?.code_name ?? t.profile?.email ?? t.profiles?.code_name ?? "";
      const searchBlob = normalizeText(
        [
          t.agenda,
          formatActivitiesPreview(t.activities),
          t.status,
          t.requestedStatus,
          t.task_date,
          t.deadline,
          t.deadline_time,
          assigneeLabel,
          t.cleanRemarks,
          t.notes,
        ].join(" "),
      );
      return searchBlob.includes(query);
    });
  }, [enrichedTasks, searchQuery]);

  const overview = useMemo(() => {
    const list = filteredTasks;
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
  }, [filteredTasks]);

  const completedByPerson = useMemo(() => {
    const counts = new Map();
    for (const t of filteredTasks) {
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
  }, [filteredTasks, profileById]);

  const earlyFinishByPerson = useMemo(() => {
    // Only count tasks that have COMPLETED_AT marker and a deadline.
    const stats = new Map();
    for (const t of filteredTasks) {
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
  }, [filteredTasks, profileById]);

  const statusCounts = useMemo(() => {
    const map = new Map();
    for (const t of filteredTasks) {
      map.set(t.status, (map.get(t.status) ?? 0) + 1);
    }
    return TASK_STATUSES.map((s) => ({
      status: s.value,
      label: s.label,
      count: map.get(s.value) ?? 0,
    }));
  }, [filteredTasks]);

  const ownerProgress = useMemo(() => {
    const map = new Map();
    for (const t of filteredTasks ?? []) {
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
  }, [filteredTasks]);

  const selectedOwner = useMemo(
    () => ownerProgress.find((o) => o.id === selectedOwnerId) ?? null,
    [ownerProgress, selectedOwnerId],
  );

  const incompleteTasksForOwner = useMemo(() => {
    if (!selectedOwnerId) return [];
    return filteredTasks
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
  }, [filteredTasks, selectedOwnerId]);

  const isOverdueTask = useCallback((t) => {
    if (t.status === "completed" || !t.deadline) return false;
    const deadline = new Date(`${t.deadline}T00:00:00`);
    return !Number.isNaN(deadline.getTime()) && deadline < new Date();
  }, []);

  const allTasksSorted = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    });
  }, [filteredTasks]);

  const priorityTasksAll = useMemo(() => {
    return filteredTasks
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
  }, [filteredTasks]);

  const completedTasksAll = useMemo(() => {
    return filteredTasks
      .filter((t) => t.status === "completed")
      .sort((a, b) => {
        const aAt = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bAt - aAt;
      });
  }, [filteredTasks]);

  const approvalTasksAll = useMemo(() => {
    return filteredTasks
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
  }, [filteredTasks]);

  const overdueTasksAll = useMemo(() => {
    return filteredTasks
      .filter(isOverdueTask)
      .sort((a, b) => {
        const aDeadline = new Date(`${a.deadline}T00:00:00`).getTime();
        const bDeadline = new Date(`${b.deadline}T00:00:00`).getTime();
        return aDeadline - bDeadline;
      });
  }, [filteredTasks, isOverdueTask]);

  const completionPercent = useMemo(() => {
    if (!overview.total) return 0;
    return Math.round((overview.completed / overview.total) * 100);
  }, [overview.completed, overview.total]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const dueSoon = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const windowDays = 7;
    const end = new Date(today);
    end.setDate(end.getDate() + windowDays);

    const list = filteredTasks
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
  }, [filteredTasks]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 bg-gradient-to-b from-slate-50/80 via-transparent to-blue-50/40 pb-10 sm:space-y-8">
        {/* Hero */}
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 px-6 py-8 shadow-2xl shadow-indigo-900/30 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                PSTO Calendar · {readOnly ? "Viewer" : "Admin"} workspace
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100/90">
                  {getGreeting()}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  Operations dashboard
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-blue-100/85 sm:text-base">
                  Monitor team workload, approvals, and deadlines across all
                  tasks. <span className="text-white/90">{todayLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!loading && overview.pendingApproval > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-50 ring-1 ring-amber-300/30">
                    {overview.pendingApproval} awaiting approval
                  </span>
                ) : null}
                {!loading && overview.overdue > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-50 ring-1 ring-rose-300/30">
                    {overview.overdue} overdue
                  </span>
                ) : null}
                {!loading && overview.priorityOpen > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-400/20 px-3 py-1 text-xs font-semibold text-rose-50 ring-1 ring-rose-300/30">
                    {overview.priorityOpen} priority open
                  </span>
                ) : null}
                {!loading && searchQuery ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                    {overview.total} search result
                    {overview.total === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              <label className="relative block max-w-xl">
                <span className="sr-only">Search tasks</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, owners, status, dates…"
                  className="w-full rounded-xl border border-white/20 bg-white/95 py-3 pl-10 pr-10 text-sm text-slate-800 shadow-lg shadow-slate-900/10 outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-white/40"
                />
                <FiSearch
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <FiX className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
              </label>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col xl:items-end">
              <ProgressRing percent={completionPercent} loading={loading} />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row xl:flex-col">
                {!readOnly ? (
                  <Link
                    to="/admin-add-task"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg shadow-indigo-950/20 transition hover:bg-blue-50 hover:shadow-xl"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    Manage tasks
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
                >
                  <svg
                    className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
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
          </div>
        </section>

        {/* Stats */}
        <div className="ut-animate-in ut-delay-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total tasks"
            value={loading ? "…" : overview.total}
            accent="slate"
            sublabel="All assignments"
            onClick={loading ? undefined : () => setActiveStatModal("total")}
          />
          <StatCard
            label="Priority"
            value={loading ? "…" : overview.priority}
            accent="rose"
            sublabel={
              loading ? "" : `${overview.priorityOpen} open · high importance`
            }
            onClick={loading ? undefined : () => setActiveStatModal("priority")}
          />
          <StatCard
            label="Completed"
            value={loading ? "…" : overview.completed}
            accent="emerald"
            sublabel={loading ? "" : `${statusLabel("completed")} tasks`}
            onClick={loading ? undefined : () => setActiveStatModal("completed")}
          />
          <StatCard
            label="Awaiting approval"
            value={loading ? "…" : overview.pendingApproval}
            accent="amber"
            sublabel="Status change requests"
            onClick={loading ? undefined : () => setActiveStatModal("approval")}
          />
          <StatCard
            label="Overdue"
            value={loading ? "…" : overview.overdue}
            accent="violet"
            sublabel="Past due · not completed"
            onClick={loading ? undefined : () => setActiveStatModal("overdue")}
          />
        </div>

        <div className="ut-animate-in ut-delay-2 grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-3 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
            <PanelHeader
              iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              }
              title="Owner progress"
              subtitle={
                loading
                  ? "Loading team completion…"
                  : "Click an owner to view open (not completed) tasks"
              }
              action={
                !loading && ownerProgress.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                    Top {Math.min(ownerProgress.length, 12)}
                  </span>
                ) : null
              }
            />

            <div className="bg-slate-50/40 p-5 sm:p-6">
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
                    />
                  ))}
                </div>
              ) : ownerProgress.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <EmptyIllustration />
                  <p className="mt-6 text-lg font-bold text-slate-900">
                    No owner data yet
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    Add tasks with assignees to see completion progress by code
                    name.
                  </p>
                  {!readOnly ? (
                    <Link
                      to="/admin-add-task"
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Add tasks
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="-mx-2 overflow-x-auto px-2">
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

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
            <PanelHeader
              iconGradient="bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              }
              title="Due soon"
              subtitle={
                loading
                  ? "Checking upcoming dates…"
                  : `Next ${dueSoon.windowDays} days · excludes completed`
              }
            />
            <div className="space-y-3 bg-slate-50/40 p-5 sm:p-6">
              {loading ? (
                <ListSkeleton rows={3} />
              ) : dueSoon.items.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <EmptyIllustration variant="deadline" />
                  <p className="mt-4 text-sm font-semibold text-slate-800">
                    No deadlines soon
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Nothing due in the next {dueSoon.windowDays} days.
                  </p>
                </div>
              ) : (
                dueSoon.items.map((t) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffDays = daysBetween(t.deadlineDate, today);
                  const urgency = urgencyStyle(diffDays);

                  return (
                    <article
                      key={t.id}
                      className={`rounded-2xl border border-slate-200/90 border-l-4 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${urgency.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${urgency.iconBg}`}
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.75}
                            stroke="currentColor"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {isTaskPriority(t) ? <PriorityBadge /> : null}
                              <p className="font-semibold text-slate-900">
                                {t.agenda}
                              </p>
                            </div>
                            <span
                              className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${urgency.badge}`}
                            >
                              {urgency.label}
                            </span>
                          </div>
                          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                              {t.profile?.code_name ??
                                t.profiles?.code_name ??
                                "—"}
                            </span>
                            <span className="font-medium text-slate-700">
                              {formatDate(t.deadline)}
                            </span>
                          </p>
                          {formatActivitiesPreview(t.activities) ? (
                            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                              {formatActivitiesPreview(t.activities)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
            <PanelHeader
              iconGradient="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/25"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              }
              title="Status breakdown"
              subtitle={loading ? "Loading…" : "All tasks by current status"}
            />
            <div className="space-y-4 bg-slate-50/40 p-5 sm:p-6">
              {statusCounts.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm font-medium text-slate-700">
                    {s.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      style={{
                        width:
                          overview.total > 0
                            ? `${Math.round((s.count / overview.total) * 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                    {loading ? "…" : s.count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
            <PanelHeader
              iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
                  />
                </svg>
              }
              title="Most completed"
              subtitle={
                loading ? "Loading…" : "Who completed the most tasks (all time)"
              }
            />
            <div className="space-y-3 bg-slate-50/40 p-5 sm:p-6">
              {loading ? (
                <ListSkeleton rows={4} />
              ) : completedByPerson.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
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

          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm lg:col-span-1">
            <PanelHeader
              iconGradient="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              }
              title="Finishes early"
              subtitle={
                loading
                  ? "Loading…"
                  : "Highest average days finished before deadline"
              }
            />
            <div className="space-y-3 bg-slate-50/40 p-5 sm:p-6">
              {loading ? (
                <ListSkeleton rows={4} />
              ) : earlyFinishByPerson.length === 0 ? (
                <p className="py-6 text-center text-sm leading-relaxed text-slate-500">
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
        onRefresh={load}
        readOnly={readOnly}
      />

      <TotalTaskModal
        isOpen={activeStatModal === "total"}
        onClose={() => setActiveStatModal(null)}
        tasks={allTasksSorted}
        onRefresh={load}
        readOnly={readOnly}
      />
      <PriorityViewModal
        isOpen={activeStatModal === "priority"}
        onClose={() => setActiveStatModal(null)}
        tasks={priorityTasksAll}
        onRefresh={load}
        readOnly={readOnly}
      />
      <CompletedViewModal
        isOpen={activeStatModal === "completed"}
        onClose={() => setActiveStatModal(null)}
        tasks={completedTasksAll}
        onRefresh={load}
        readOnly={readOnly}
      />
      <ApprovalViewModal
        isOpen={activeStatModal === "approval"}
        onClose={() => setActiveStatModal(null)}
        tasks={approvalTasksAll}
        onRefresh={load}
        readOnly={readOnly}
      />
      <OverdueViewModal
        isOpen={activeStatModal === "overdue"}
        onClose={() => setActiveStatModal(null)}
        tasks={overdueTasksAll}
        onRefresh={load}
        readOnly={readOnly}
      />
    </Layout>
  );
};

export default Dashboard;
