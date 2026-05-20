import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddTaskModal from "../../components/Modals/AdminModals/AddTaskModal";
import EditTaskModal from "../../components/Modals/AdminModals/EditTaskModal";
import Layout from "../../components/Layout/Layout";
import {
  TASK_STATUSES,
  approveTaskStatusRequest,
  deleteTasks,
  listTasks,
  parseTaskRemarks,
  rejectTaskStatusRequest,
} from "../../utils/task";

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

const statusBadgeClass = (status) => {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/15";
    case "ongoing":
      return "bg-blue-50 text-blue-800 ring-blue-600/15";
    case "on_hold":
      return "bg-amber-50 text-amber-900 ring-amber-600/15";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-600/10";
  }
};

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

function StatCard({ label, value, accent }) {
  const accents = {
    slate: "from-slate-50 to-white ring-slate-200/80",
    blue: "from-blue-50/80 to-white ring-blue-200/60",
    amber: "from-amber-50/80 to-white ring-amber-200/60",
    emerald: "from-emerald-50/80 to-white ring-emerald-200/60",
  };
  return (
    <div
      className={`rounded-xl bg-gradient-to-br p-4 shadow-sm ring-1 ${accents[accent] ?? accents.slate}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function OwnerProgressCard({ label, completed, total }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCompleted = clamp(Number(completed) || 0, 0, safeTotal || 0);
  const pct = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
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
    </div>
  );
}

const AddTask = () => {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [resolvingRequestId, setResolvingRequestId] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    status: "all",
    assignee: "all",
    awaitingApproval: false,
  });

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    const { data, error } = await listTasks();
    setLoadingTasks(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTasks(data ?? []);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const groupedTasks = useMemo(() => {
    const groups = new Map();
    for (const task of tasks) {
      const { cleanRemarks, requestedStatus, groupKey } = parseTaskRemarks(
        task.remarks,
      );
      const key = groupKey || `single-${task.id}`;
      const current = groups.get(key);
      const normalizedTask = {
        ...task,
        cleanRemarks,
        requestedStatus,
        groupKey,
      };
      if (!current) {
        groups.set(key, {
          ...normalizedTask,
          taskIds: [task.id],
          responsibleIds: [task.responsible_id],
          responsibleLabels: [task.profiles?.code_name ?? "—"],
          members: [normalizedTask],
        });
      } else {
        current.taskIds.push(task.id);
        current.responsibleIds.push(task.responsible_id);
        current.responsibleLabels.push(task.profiles?.code_name ?? "—");
        current.members.push(normalizedTask);
      }
    }
    return Array.from(groups.values());
  }, [tasks]);

  const ownerProgress = useMemo(() => {
    const map = new Map();
    for (const t of tasks ?? []) {
      const id = t?.responsible_id ?? "unknown";
      const label = t?.profiles?.code_name ?? t?.profiles?.email ?? "—";
      const current = map.get(id) ?? { id, label, total: 0, completed: 0 };
      current.total += 1;
      if (t?.status === "completed") current.completed += 1;
      if (!current.label || current.label === "—") current.label = label;
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
  }, [tasks]);

  const assigneeOptions = useMemo(() => {
    const labels = new Set();
    for (const task of groupedTasks) {
      for (const label of task.responsibleLabels ?? []) {
        if (label && label !== "—") labels.add(label);
      }
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [groupedTasks]);

  const filteredGroupedTasks = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const status = filters.status;
    const assignee = filters.assignee;
    const awaitingApproval = filters.awaitingApproval;

    return groupedTasks.filter((task) => {
      if (awaitingApproval && !task.requestedStatus) return false;
      if (status !== "all" && task.status !== status) return false;
      if (
        assignee !== "all" &&
        !(task.responsibleLabels ?? []).some((label) => label === assignee)
      ) {
        return false;
      }
      if (!q) return true;

      const haystack = [
        task.agenda,
        task.activities,
        task.cleanRemarks,
        ...(task.responsibleLabels ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [filters, groupedTasks]);

  const stats = useMemo(() => {
    const list = groupedTasks;
    return {
      total: list.length,
      pending: list.filter((t) => t.status === "pending").length,
      ongoing: list.filter((t) => t.status === "ongoing").length,
      completed: list.filter((t) => t.status === "completed").length,
      onHold: list.filter((t) => t.status === "on_hold").length,
      awaitingApproval: list.filter((t) => !!t.requestedStatus).length,
    };
  }, [groupedTasks]);

  const dueSoon = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const windowDays = 7;
    const end = new Date(today);
    end.setDate(end.getDate() + windowDays);

    const list = groupedTasks
      .filter((t) => t.status !== "completed" && t.deadline)
      .map((t) => ({
        ...t,
        deadlineDate: new Date(`${t.deadline}T00:00:00`),
      }))
      .filter((t) => !Number.isNaN(t.deadlineDate.getTime()))
      .filter((t) => t.deadlineDate <= end)
      .sort((a, b) => a.deadlineDate - b.deadlineDate)
      .slice(0, 8);

    return { windowDays, items: list, today };
  }, [groupedTasks]);

  const hasActiveFilters =
    filters.awaitingApproval ||
    filters.status !== "all" ||
    filters.assignee !== "all" ||
    !!filters.q.trim();

  const openEdit = (task) => {
    setTaskToEdit({
      ...task,
      remarks: task.cleanRemarks,
      group_key: task.groupKey,
      task_ids: task.taskIds,
      responsible_ids: task.responsibleIds,
      existing_remarks: task.remarks,
    });
    setEditModalOpen(true);
  };

  const closeEdit = () => {
    setEditModalOpen(false);
    setTaskToEdit(null);
  };

  const handleDelete = async (task) => {
    const ok = window.confirm(
      `Delete this task?\n\n${task.agenda?.slice(0, 120) || "Untitled"}${task.agenda?.length > 120 ? "…" : ""}`,
    );
    if (!ok) return;

    setDeletingId(task.id);
    const { error } = await deleteTasks(task.taskIds ?? [task.id]);
    setDeletingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Task deleted.");
    loadTasks();
  };

  const handleApproveRequest = async (task) => {
    const requestStatus = task.requestedStatus;
    if (!requestStatus) return;

    setResolvingRequestId(task.id);
    for (const member of task.members ?? []) {
      const { error } = await approveTaskStatusRequest(member);
      if (error) {
        setResolvingRequestId(null);
        toast.error(error.message);
        return;
      }
    }
    setResolvingRequestId(null);

    toast.success(`Status request approved (${statusLabel(requestStatus)}).`);
    loadTasks();
  };

  const handleRejectRequest = async (task) => {
    const requestStatus = task.requestedStatus;
    if (!requestStatus) return;

    setResolvingRequestId(task.id);
    for (const member of task.members ?? []) {
      const { error } = await rejectTaskStatusRequest(member);
      if (error) {
        setResolvingRequestId(null);
        toast.error(error.message);
        return;
      }
    }
    setResolvingRequestId(null);

    toast.success("Status request rejected.");
    loadTasks();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Admin
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Tasks
            </h1>
            <p className="max-w-xl text-base text-slate-600 leading-relaxed">
              Create assignments, track deadlines, and keep responsibility clear
              with code-name owners.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add task
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Owner progress
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loadingTasks
                  ? "Loading…"
                  : "Completed tasks per owner (deadline-based list)"}
              </p>
            </div>
            {!loadingTasks && ownerProgress.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                Top {Math.min(ownerProgress.length, 12)}
              </span>
            ) : null}
          </div>

          <div className="p-5 sm:p-6">
            {loadingTasks ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : ownerProgress.length === 0 ? (
              <p className="text-sm text-slate-500">
                No owner progress yet. Add tasks first.
              </p>
            ) : (
              <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
                <div className="grid min-w-[720px] grid-cols-3 gap-3 sm:min-w-0 sm:grid-cols-2 lg:grid-cols-4">
                  {ownerProgress.map((o) => (
                    <OwnerProgressCard
                      key={o.id}
                      label={o.label}
                      completed={o.completed}
                      total={o.total}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Near due deadlines
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loadingTasks
                  ? "Loading…"
                  : `Next ${dueSoon.windowDays} days · excludes completed`}
              </p>
            </div>
            {!loadingTasks && dueSoon.items.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-600/15">
                Monitor owners here
              </span>
            ) : null}
          </div>
          <div className="space-y-3 p-5 sm:p-6">
            {loadingTasks ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : dueSoon.items.length === 0 ? (
              <p className="text-sm text-slate-500">
                No upcoming deadlines in the next {dueSoon.windowDays} days.
              </p>
            ) : (
              dueSoon.items.map((t) => {
                const diffDays = daysBetween(t.deadlineDate, dueSoon.today);
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
                    key={t.groupKey || t.id}
                    className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {t.agenda}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <div className="flex flex-wrap gap-1.5">
                            {(t.responsibleLabels ?? ["—"]).map((label, idx) => (
                              <span
                                key={`${label}-${idx}`}
                                className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                          <span>•</span>
                          <span className="font-medium">
                            {formatDate(t.deadline)}
                          </span>
                        </div>
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total tasks"
            value={loadingTasks ? "…" : stats.total}
            accent="slate"
          />
          <StatCard
            label="Pending"
            value={loadingTasks ? "…" : stats.pending}
            accent="blue"
          />
          <StatCard
            label="Ongoing"
            value={loadingTasks ? "…" : stats.ongoing}
            accent="amber"
          />
          <StatCard
            label="Completed"
            value={loadingTasks ? "…" : stats.completed}
            accent="emerald"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                All tasks
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loadingTasks
                  ? "Loading your workspace…"
                  : `${filteredGroupedTasks.length} shown · ${groupedTasks.length} total · ${stats.onHold} on hold · ${stats.awaitingApproval} awaiting approval`}
              </p>
            </div>
            {!loadingTasks && groupedTasks.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-600/15">
                Latest first
              </span>
            ) : null}
          </div>

          <div className="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={filters.q}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, q: e.target.value }))
                    }
                    placeholder="Search agenda, activities, remarks, assignees…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    {TASK_STATUSES.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.assignee}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        assignee: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    aria-label="Filter by assignee"
                  >
                    <option value="all">All assignees</option>
                    {assigneeOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        awaitingApproval: !prev.awaitingApproval,
                      }))
                    }
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto ${
                      filters.awaitingApproval
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Awaiting approval
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        q: "",
                        status: "all",
                        assignee: "all",
                        awaitingApproval: false,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
                  >
                    Clear filters
                  </button>
                ) : (
                  <span className="text-sm text-slate-500">
                    Tip: use search + status + assignee together.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Agenda
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Activities
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Deadline
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Owner
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Remarks
                  </th>
                  <th className="w-[1%] whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingTasks ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div
                          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
                          aria-hidden
                        />
                        <p className="text-sm font-medium text-slate-600">
                          Loading tasks…
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : groupedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                          <svg
                            className="h-7 w-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                            />
                          </svg>
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-900">
                          No tasks yet
                        </p>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          Start by adding a task and assigning it to someone’s
                          code name.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddModalOpen(true)}
                          className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
                        >
                          Create first task
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredGroupedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                          <svg
                            className="h-7 w-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v12m6-6H6"
                            />
                          </svg>
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-900">
                          No matches
                        </p>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          Try adjusting your filters or clearing them to see all
                          tasks.
                        </p>
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={() =>
                              setFilters({
                                q: "",
                                status: "all",
                                assignee: "all",
                                awaitingApproval: false,
                              })
                            }
                            className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
                          >
                            Clear filters
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGroupedTasks.map((task) => (
                    <tr
                      key={task.groupKey || task.id}
                      className="transition-colors hover:bg-slate-50/90"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 sm:px-6">
                        {formatDate(task.task_date)}
                      </td>
                      <td className="max-w-[200px] px-5 py-4 text-slate-800 sm:px-6">
                        <span className="line-clamp-2" title={task.agenda}>
                          {task.agenda}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-5 py-4 text-slate-600 sm:px-6">
                        <span className="line-clamp-2" title={task.activities}>
                          {task.activities}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-800 sm:px-6">
                        {formatDate(task.deadline)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {task.responsibleLabels.map((label, idx) => (
                            <span
                              key={`${label}-${idx}`}
                              className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(task.status)}`}
                          >
                            {statusLabel(task.status)}
                          </span>
                          {task.requestedStatus ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/15">
                              Requested:{" "}
                              {statusLabel(task.requestedStatus)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-[200px] px-5 py-4 text-slate-600 sm:px-6">
                        <span
                          className="line-clamp-2"
                          title={task.cleanRemarks}
                        >
                          {task.cleanRemarks || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                        <div className="flex justify-end gap-2">
                          {task.requestedStatus ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(task)}
                                disabled={resolvingRequestId === task.id}
                                className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {resolvingRequestId === task.id
                                  ? "Saving..."
                                  : "Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRequest(task)}
                                disabled={resolvingRequestId === task.id}
                                className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEdit(task)}
                            disabled={resolvingRequestId === task.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(task)}
                            disabled={
                              deletingId === task.id ||
                              resolvingRequestId === task.id
                            }
                            className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === task.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddTaskModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadTasks}
      />

      <EditTaskModal
        isOpen={editModalOpen}
        task={taskToEdit}
        onClose={closeEdit}
        onSuccess={loadTasks}
      />
    </Layout>
  );
};

export default AddTask;
