import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import AddTaskModal from "../../components/Modals/AdminModals/AddTaskModal";
import EditTaskModal from "../../components/Modals/AdminModals/EditTaskModal";
import OwnerOpenTasksModal from "../../components/Modals/AdminModals/OwnerOpenTasksModal";
import ViewTaskModal from "../../components/Modals/AdminModals/ViewTaskModal";
import RejectRequestModal from "../../components/Modals/AdminModals/Dashboard/RejectRequestModal";
import Layout from "../../components/Layout/Layout";
import PriorityBadge from "../../components/Task/PriorityBadge";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  ProgressRing,
  StatCard,
  TableSkeleton,
} from "../../components/User/UserWorkspaceUI";
import {
  TASK_PROGRAMS,
  TASK_STATUSES,
  approveTaskStatusRequest,
  deleteTasks,
  formatTaskDeadline,
  hasDeadline,
  isTaskPriority,
  listTasks,
  formatActivitiesPreview,
  parseTaskActivities,
  parseTaskRemarks,
  rejectTaskStatusRequest,
  taskProgramLabel,
} from "../../utils/task";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return startOfDay(d);
};

const startOfWeek = (date) => {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const formatRangeLabel = (start, end) => {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const endFmt = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
};

const getDateRange = (period, anchorDate) => {
  if (period === "all") return null;
  const anchor = startOfDay(parseDateOnly(anchorDate) ?? new Date());

  if (period === "day") {
    return { start: anchor, end: anchor };
  }

  if (period === "week") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 6) };
  }

  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start: startOfDay(start), end: startOfDay(end) };
};

const isDateInRange = (value, range) => {
  if (!range) return true;
  const d = parseDateOnly(value);
  if (!d) return false;
  const t = startOfDay(d).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
};

const taskDateSortTime = (task) => {
  if (task?.task_date) {
    const t = new Date(`${task.task_date}T00:00:00`).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
};

const taskCreatedSortTime = (task) => {
  if (task?.created_at) {
    const t = new Date(task.created_at).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
};

const groupMembers = (group) => [group, ...(group.members ?? [])];

const compareGroupsNewestFirst = (a, b) => {
  const priA = isTaskPriority(a) ? 1 : 0;
  const priB = isTaskPriority(b) ? 1 : 0;
  if (priB !== priA) return priB - priA;

  const membersA = groupMembers(a);
  const membersB = groupMembers(b);
  const maxDateA = Math.max(...membersA.map(taskDateSortTime), 0);
  const maxDateB = Math.max(...membersB.map(taskDateSortTime), 0);
  if (maxDateB !== maxDateA) return maxDateB - maxDateA;

  const maxCreatedA = Math.max(...membersA.map(taskCreatedSortTime), 0);
  const maxCreatedB = Math.max(...membersB.map(taskCreatedSortTime), 0);
  if (maxCreatedB !== maxCreatedA) return maxCreatedB - maxCreatedA;

  return (Number(b.id) || 0) - (Number(a.id) || 0);
};

const DEFAULT_FILTERS = {
  q: "",
  status: "all",
  program: "all",
  assignee: "all",
  awaitingApproval: false,
  priorityOnly: false,
  datePeriod: "all",
  dateBasis: "task_date",
  anchorDate: toIsoDate(new Date()),
};

const DATE_PERIODS = [
  { value: "all", label: "All" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const TASKS_PAGE_SIZE = 6;

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

function OwnerProgressCard({ label, completed, total, selected, onClick }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCompleted = clamp(Number(completed) || 0, 0, safeTotal || 0);
  const pct = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
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

const PAGE_SECTIONS = [
  { id: "stats",   label: "1. Stats" },
  { id: "owners",  label: "2. Owners" },
  { id: "tasks",   label: "3. Tasks" },
];

const AddTask = () => {
  const scrollRef = useRef(null);
  const scrollToSection = (id) => {
    const el = scrollRef.current?.querySelector(`#at-section-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToView, setTaskToView] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [resolvingRequestId, setResolvingRequestId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tablePage, setTablePage] = useState(1);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

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
      const { cleanRemarks, requestedStatus, groupKey, proofUrl } =
        parseTaskRemarks(task.remarks);
      const key = groupKey || `single-${task.id}`;
      const current = groups.get(key);
      const { cleanActivities, subTasks, instructionImageUrl } = parseTaskActivities(task.activities);
      const normalizedTask = {
        ...task,
        cleanActivities,
        subTasks,
        instructionImageUrl,
        cleanRemarks,
        requestedStatus,
        groupKey,
        proofUrl,
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
    return Array.from(groups.values()).sort(compareGroupsNewestFirst);
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

  const selectedOwner = useMemo(
    () => ownerProgress.find((o) => o.id === selectedOwnerId) ?? null,
    [ownerProgress, selectedOwnerId],
  );

  const incompleteTasksForOwner = useMemo(() => {
    if (!selectedOwnerId) return [];
    return (tasks ?? [])
      .filter(
        (t) =>
          String(t?.responsible_id) === String(selectedOwnerId) &&
          t?.status !== "completed",
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
  }, [tasks, selectedOwnerId]);

  const assigneeOptions = useMemo(() => {
    const labels = new Set();
    for (const task of groupedTasks) {
      for (const label of task.responsibleLabels ?? []) {
        if (label && label !== "—") labels.add(label);
      }
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [groupedTasks]);

  const dateRange = useMemo(
    () => getDateRange(filters.datePeriod, filters.anchorDate),
    [filters.datePeriod, filters.anchorDate],
  );

  const dateFilterLabel = useMemo(() => {
    if (!dateRange) return null;
    if (filters.datePeriod === "day") {
      return formatDate(filters.anchorDate);
    }
    if (filters.datePeriod === "week") {
      return formatRangeLabel(dateRange.start, dateRange.end);
    }
    return dateRange.start.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [dateRange, filters.anchorDate, filters.datePeriod]);

  const filteredGroupedTasks = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const status = filters.status;
    const program = filters.program;
    const assignee = filters.assignee;
    const awaitingApproval = filters.awaitingApproval;
    const priorityOnly = filters.priorityOnly;
    const dateField =
      filters.dateBasis === "deadline" ? "deadline" : "task_date";

    const filtered = groupedTasks.filter((task) => {
      if (priorityOnly && !isTaskPriority(task)) return false;
      if (awaitingApproval && !task.requestedStatus) return false;
      if (status !== "all" && task.status !== status) return false;
      if (program !== "all" && task.program !== program) return false;
      if (
        assignee !== "all" &&
        !(task.responsibleLabels ?? []).some((label) => label === assignee)
      ) {
        return false;
      }
      if (
        dateRange &&
        dateField === "deadline" &&
        !hasDeadline(task.deadline)
      ) {
        return false;
      }
      if (!isDateInRange(task[dateField], dateRange)) return false;
      if (!q) return true;

      const haystack = [
        task.agenda,
        task.cleanActivities,
        ...(task.subTasks ?? []).flatMap((st) => [st.title, st.remarks]),
        task.cleanRemarks,
        task.program,
        taskProgramLabel(task.program),
        ...(task.responsibleLabels ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
    return filtered.sort(compareGroupsNewestFirst);
  }, [filters, groupedTasks, dateRange]);

  const tablePageCount = Math.max(
    1,
    Math.ceil(filteredGroupedTasks.length / TASKS_PAGE_SIZE),
  );

  const paginatedGroupedTasks = useMemo(() => {
    const start = (tablePage - 1) * TASKS_PAGE_SIZE;
    return filteredGroupedTasks.slice(start, start + TASKS_PAGE_SIZE);
  }, [filteredGroupedTasks, tablePage]);

  useEffect(() => {
    setTablePage(1);
  }, [filters]);

  useEffect(() => {
    if (tablePage > tablePageCount) {
      setTablePage(tablePageCount);
    }
  }, [tablePage, tablePageCount]);

  const tableRangeStart =
    filteredGroupedTasks.length === 0
      ? 0
      : (tablePage - 1) * TASKS_PAGE_SIZE + 1;
  const tableRangeEnd = Math.min(
    tablePage * TASKS_PAGE_SIZE,
    filteredGroupedTasks.length,
  );

  const shiftAnchorDate = (direction) => {
    const anchor = parseDateOnly(filters.anchorDate) ?? new Date();
    let next = anchor;

    if (filters.datePeriod === "day") {
      next = addDays(anchor, direction);
    } else if (filters.datePeriod === "week") {
      next = addDays(anchor, direction * 7);
    } else if (filters.datePeriod === "month") {
      next = new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
    }

    setFilters((prev) => ({ ...prev, anchorDate: toIsoDate(next) }));
  };

  const setDatePeriod = (datePeriod) => {
    setFilters((prev) => ({
      ...prev,
      datePeriod,
      anchorDate: prev.anchorDate || toIsoDate(new Date()),
    }));
  };

  const stats = useMemo(() => {
    const list = groupedTasks;
    return {
      total: list.length,
      pending: list.filter((t) => t.status === "pending").length,
      ongoing: list.filter((t) => t.status === "ongoing").length,
      completed: list.filter((t) => t.status === "completed").length,
      onHold: list.filter((t) => t.status === "on_hold").length,
      awaitingApproval: list.filter((t) => !!t.requestedStatus).length,
      priority: list.filter((t) => isTaskPriority(t)).length,
    };
  }, [groupedTasks]);

  const completionPercent = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, [stats.completed, stats.total]);

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

  const hasActiveFilters =
    filters.awaitingApproval ||
    filters.priorityOnly ||
    filters.status !== "all" ||
    filters.program !== "all" ||
    filters.assignee !== "all" ||
    filters.datePeriod !== "all" ||
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

  const handleRejectRequest = async (rejectionRemarks) => {
    const task = rejectTarget;
    const requestStatus = task?.requestedStatus;
    if (!task || !requestStatus) return;

    setResolvingRequestId(task.id);
    for (const member of task.members ?? []) {
      const { error } = await rejectTaskStatusRequest(member, {
        rejectionRemarks,
      });
      if (error) {
        setResolvingRequestId(null);
        toast.error(error.message);
        return;
      }
    }
    setResolvingRequestId(null);
    setRejectTarget(null);

    toast.success("Status request rejected.");
    loadTasks();
  };

  return (
    <Layout>
      <div ref={scrollRef} className="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-x-hidden bg-gradient-to-b from-slate-50/80 via-transparent to-blue-50/40 pb-10 sm:space-y-8 lg:max-w-[min(80rem,calc(100vw-19rem))]">
        {/* Hero */}
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 px-6 py-8 shadow-2xl shadow-blue-900/30 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-400/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                PSTO Calendar · Task management
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100/90">
                  {getGreeting()}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  Task command center
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-blue-100/85 sm:text-base">
                  Create assignments, approve status requests, and track
                  deadlines by code name.{" "}
                  <span className="text-white/90">{todayLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!loadingTasks && stats.awaitingApproval > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-50 ring-1 ring-amber-300/30">
                    {stats.awaitingApproval} awaiting approval
                  </span>
                ) : null}
                {!loadingTasks && stats.priority > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-50 ring-1 ring-rose-300/30">
                    {stats.priority} priority
                  </span>
                ) : null}
                {!loadingTasks && stats.onHold > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                    {stats.onHold} on hold
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col xl:items-end">
              <ProgressRing percent={completionPercent} loading={loadingTasks} />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row xl:flex-col">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg shadow-blue-950/20 transition hover:bg-blue-50 hover:shadow-xl"
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
                  New task
                </button>
                <button
                  type="button"
                  onClick={loadTasks}
                  disabled={loadingTasks}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
                >
                  <svg
                    className={`h-5 w-5 ${loadingTasks ? "animate-spin" : ""}`}
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

        {/* Section nav */}
        <div className="sticky top-2 z-20 flex flex-wrap gap-2">
          {PAGE_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-slate-400 hover:bg-white"
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div id="at-section-stats" className="ut-animate-in ut-delay-1 grid min-w-0 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 scroll-mt-4">
          <StatCard
            label="Total tasks"
            value={loadingTasks ? "…" : stats.total}
            accent="slate"
            sublabel="All assignments"
          />
          <StatCard
            label="Priority"
            value={loadingTasks ? "…" : stats.priority}
            accent="rose"
            sublabel="High importance"
          />
          <StatCard
            label="Pending"
            value={loadingTasks ? "…" : stats.pending}
            accent="blue"
            sublabel="Not started"
          />
          <StatCard
            label="Ongoing"
            value={loadingTasks ? "…" : stats.ongoing}
            accent="amber"
            sublabel="In progress"
          />
          <StatCard
            label="Completed"
            value={loadingTasks ? "…" : stats.completed}
            accent="emerald"
            sublabel="Marked done"
          />
        </div>

        {/* Owner progress */}
        <section id="at-section-owners" className="ut-animate-in ut-delay-2 min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm scroll-mt-4">
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
              loadingTasks
                ? "Loading team completion…"
                : "Click an owner to view open (not completed) tasks"
            }
            action={
              !loadingTasks && ownerProgress.length > 0 ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                  Top {Math.min(ownerProgress.length, 12)}
                </span>
              ) : null
            }
          />

          <div className="bg-slate-50/40 p-5 sm:p-6">
            {loadingTasks ? (
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
                  Add tasks with assignees to see completion by code name.
                </p>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
                >
                  Add first task
                </button>
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {ownerProgress.map((o) => (
                  <OwnerProgressCard
                    key={o.id}
                    label={o.label}
                    completed={o.completed}
                    total={o.total}
                    selected={String(selectedOwnerId) === String(o.id)}
                    onClick={() => setSelectedOwnerId(o.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Task board */}
        <section id="at-section-tasks" className="ut-animate-in ut-delay-3 min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm scroll-mt-4">
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
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z"
                />
              </svg>
            }
            title="All tasks"
            subtitle={
              loadingTasks
                ? "Syncing workspace…"
                : `${filteredGroupedTasks.length} shown · ${groupedTasks.length} total · ${stats.awaitingApproval} awaiting approval`
            }
            action={
              !loadingTasks && groupedTasks.length > 0 ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-600/15">
                  Latest first
                </span>
              ) : null
            }
          />

          <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setFiltersExpanded((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
              aria-expanded={filtersExpanded}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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
                      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.036a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                    />
                  </svg>
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Search & filters
                  </span>
                  <span className="block text-xs text-slate-500">
                    {hasActiveFilters
                      ? "Filters active — tap to adjust"
                      : "Find tasks by date, status, assignee, or keyword"}
                  </span>
                </span>
              </span>
              <svg
                className={`h-5 w-5 shrink-0 text-slate-400 transition ${filtersExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </div>

          {filtersExpanded ? (
          <div className="min-w-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
            <div className="mb-4 flex min-w-0 flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date range
                </p>
                <div className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
                  {DATE_PERIODS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDatePeriod(value)}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition sm:flex-none ${
                        filters.datePeriod === value
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filters.datePeriod !== "all" ? (
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => shiftAnchorDate(-1)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      aria-label={`Previous ${filters.datePeriod}`}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftAnchorDate(1)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      aria-label={`Next ${filters.datePeriod}`}
                    >
                      ›
                    </button>
                    <input
                      type="date"
                      value={filters.anchorDate}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          anchorDate: e.target.value,
                        }))
                      }
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:flex-none"
                      aria-label="Anchor date"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          anchorDate: toIsoDate(new Date()),
                        }))
                      }
                      className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Today
                    </button>
                  </div>

                  <p className="min-w-0 flex-1 text-sm font-medium text-slate-700 sm:text-center">
                    {dateFilterLabel}
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      Filtering by{" "}
                      {filters.dateBasis === "deadline"
                        ? "deadline"
                        : "task date"}
                    </span>
                  </p>

                  <select
                    value={filters.dateBasis}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        dateBasis: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto"
                    aria-label="Date field to filter"
                  >
                    <option value="task_date">Task date</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </div>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
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
                      setFilters((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
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
                    value={filters.program}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        program: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    aria-label="Filter by program"
                  >
                    <option value="all">All programs</option>
                    {TASK_PROGRAMS.map(({ value, label }) => (
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

                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        priorityOnly: !prev.priorityOnly,
                      }))
                    }
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto ${
                      filters.priorityOnly
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Priority only
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
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
          ) : null}

          <div className="w-0 min-w-full overflow-x-auto overscroll-x-contain bg-slate-50/30 p-2 sm:p-3">
            <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left text-sm lg:min-w-[980px]">
              <thead>
                <tr>
                  <th className="whitespace-nowrap rounded-l-xl bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Date
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Priority
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Program
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Agenda
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Activities
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Deadline
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Person responsible
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Status
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Remarks
                  </th>
                  <th className="w-[1%] whitespace-nowrap rounded-r-xl bg-slate-900 px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingTasks ? (
                  <TableSkeleton colSpan={10} />
                ) : groupedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          No tasks yet
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Start by adding a task and assigning it to a code
                          name.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddModalOpen(true)}
                          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
                        >
                          Create first task
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredGroupedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration variant="filter" />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          No matches found
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Try adjusting your filters or clearing them to see
                          all tasks.
                        </p>
                        {hasActiveFilters ? (
                          <button
                            type="button"
                            onClick={() => setFilters(DEFAULT_FILTERS)}
                            className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700"
                          >
                            Clear filters
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedGroupedTasks.map((task) => (
                    <tr
                      key={task.groupKey || task.id}
                      className={`group transition-all duration-200 ${
                        isTaskPriority(task)
                          ? "[&_td]:!border-rose-200/80 [&_td]:!bg-rose-50/40"
                          : "hover:[&_td]:shadow-md"
                      }`}
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900 sm:px-6">
                        {formatDate(task.task_date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        {isTaskPriority(task) ? (
                          <PriorityBadge />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-900 ring-1 ring-inset ring-indigo-600/15">
                          {taskProgramLabel(task.program)}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-5 py-4 text-slate-800 sm:px-6">
                        <span className="line-clamp-2" title={task.agenda}>
                          {task.agenda}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-5 py-4 text-slate-600 sm:px-6">
                        <div className="flex flex-col gap-2">
                          <span
                            className="line-clamp-2"
                            title={formatActivitiesPreview(task.activities)}
                          >
                            {formatActivitiesPreview(task.activities) || "—"}
                          </span>
                          {(task.subTasks?.length ?? 0) > 0 ? (
                            <span className="w-fit rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-600/15">
                              {task.subTasks.length} sub-task
                              {task.subTasks.length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                          {task.instructionImageUrl ? (
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-inset ring-sky-600/15">
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21z"
                                />
                              </svg>
                              Has image
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setTaskToView(task)}
                            className="w-fit rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            View
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-800 sm:px-6">
                        {formatTaskDeadline(task.deadline, task.deadline_time)}
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
                              Requested: {statusLabel(task.requestedStatus)}
                            </span>
                          ) : null}
                          {(task.proofUrl ||
                            task.members?.some((m) => m.proofUrl)) &&
                          (task.status === "completed" ||
                            task.requestedStatus === "completed") ? (
                            <button
                              type="button"
                              onClick={() => setTaskToView(task)}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15 transition hover:bg-emerald-100"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                aria-hidden
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21z"
                                />
                              </svg>
                              View proof
                            </button>
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
                                onClick={() => setRejectTarget(task)}
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

          {!loadingTasks && filteredGroupedTasks.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {tableRangeStart}–{tableRangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {filteredGroupedTasks.length}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={tablePage <= 1}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 text-sm font-medium text-slate-600">
                  Page {tablePage} of {tablePageCount}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTablePage((p) => Math.min(tablePageCount, p + 1))
                  }
                  disabled={tablePage >= tablePageCount}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
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

      <ViewTaskModal
        isOpen={!!taskToView}
        task={taskToView}
        onClose={() => setTaskToView(null)}
      />

      <OwnerOpenTasksModal
        isOpen={!!selectedOwnerId}
        onClose={() => setSelectedOwnerId(null)}
        ownerLabel={selectedOwner?.label}
        tasks={incompleteTasksForOwner}
        onRefresh={loadTasks}
      />

      <RejectRequestModal
        isOpen={!!rejectTarget}
        task={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectRequest}
        submitting={rejectTarget ? resolvingRequestId === rejectTarget.id : false}
      />
    </Layout>
  );
};

export default AddTask;
