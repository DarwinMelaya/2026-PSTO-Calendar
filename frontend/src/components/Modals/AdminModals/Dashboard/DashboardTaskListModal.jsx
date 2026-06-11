import { useEffect, useMemo, useState } from "react";
import PriorityBadge from "../../../Task/PriorityBadge";
import {
  TASK_PROGRAMS,
  TASK_STATUSES,
  formatActivitiesPreview,
  formatTaskDeadline,
  hasDeadline,
  isTaskPriority,
  parseTaskRemarks,
  taskProgramLabel,
} from "../../../../utils/task";

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

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

const DEFAULT_FILTERS = {
  q: "",
  status: "all",
  program: "all",
  assignee: "all",
  awaitingApproval: false,
  priorityOnly: false,
  datePeriod: "month",
  dateBasis: "task_date",
  anchorDate: toIsoDate(new Date()),
};

const DATE_PERIODS = [
  { value: "all", label: "All" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const collectProofEntries = (task) => {
  const members = task.members?.length ? task.members : [task];
  const labels = task.responsibleLabels ?? [];

  return members
    .map((member, index) => {
      const proofUrl =
        member.proofUrl ?? parseTaskRemarks(member.remarks).proofUrl ?? null;
      if (!proofUrl) return null;
      return {
        label:
          labels[index] ??
          member.profile?.code_name ??
          member.profiles?.code_name ??
          "Assignee",
        proofUrl,
      };
    })
    .filter(Boolean);
};

const DashboardTaskListModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  tasks,
  emptyMessage,
  modalId = "dashboard-task-list-modal",
  renderActions,
  renderHeaderActions,
  showCompletionProof = false,
  showFilters = false,
  getItemKey = (t) => String(t.id),
}) => {
  const [expandedProofUrl, setExpandedProofUrl] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setFilters(DEFAULT_FILTERS);
      setFiltersExpanded(true);
      setExpandedProofUrl(null);
    }
  }, [isOpen]);

  const assigneeOptions = useMemo(() => {
    const labels = new Set();
    for (const task of tasks) {
      for (const label of task.responsibleLabels ?? []) {
        if (label && label !== "—") labels.add(label);
      }
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

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

  const filteredTasks = useMemo(() => {
    if (!showFilters) return tasks;

    const q = filters.q.trim().toLowerCase();
    const status = filters.status;
    const program = filters.program;
    const assignee = filters.assignee;
    const awaitingApproval = filters.awaitingApproval;
    const priorityOnly = filters.priorityOnly;
    const dateField =
      filters.dateBasis === "deadline" ? "deadline" : "task_date";

    return tasks.filter((task) => {
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
  }, [filters, showFilters, tasks, dateRange]);

  const hasActiveFilters =
    showFilters &&
    (filters.awaitingApproval ||
      filters.priorityOnly ||
      filters.status !== "all" ||
      filters.program !== "all" ||
      filters.assignee !== "all" ||
      filters.datePeriod !== "all" ||
      !!filters.q.trim());

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

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  if (!isOpen) return null;

  const handleClose = () => {
    setExpandedProofUrl(null);
    onClose();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const displaySubtitle =
    showFilters && hasActiveFilters
      ? `${filteredTasks.length} of ${tasks.length} task${tasks.length === 1 ? "" : "s"}`
      : subtitle;

  const listEmptyMessage =
    tasks.length === 0
      ? emptyMessage
      : "No tasks match your filters.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2
              id={`${modalId}-title`}
              className="text-xl font-semibold text-slate-900"
            >
              {title}
            </h2>
            {displaySubtitle ? (
              <p className="mt-1 text-sm text-slate-500">{displaySubtitle}</p>
            ) : null}
          </div>
          {renderHeaderActions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {renderHeaderActions()}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {showFilters ? (
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <button
              type="button"
              onClick={() => setFiltersExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 text-left"
              aria-expanded={filtersExpanded}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Filters
                {hasActiveFilters ? (
                  <span className="ml-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-blue-800">
                    Active
                  </span>
                ) : null}
              </span>
              <span
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-inset transition ${
                  filtersExpanded
                    ? "bg-slate-200 text-slate-800 ring-slate-300 hover:bg-slate-300"
                    : "bg-blue-600 text-white ring-blue-700 hover:bg-blue-700"
                }`}
              >
                {filtersExpanded ? "Hide" : "Show"}
              </span>
            </button>

            {filtersExpanded ? (
              <div className="mt-4 space-y-4">
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
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => shiftAnchorDate(-1)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        aria-label={`Previous ${filters.datePeriod}`}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => shiftAnchorDate(1)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto"
                      aria-label="Date field to filter"
                    >
                      <option value="task_date">Task date</option>
                      <option value="deadline">Deadline</option>
                    </select>
                  </div>
                ) : null}

                <div className="relative">
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:flex-none"
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
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:flex-none"
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
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:flex-none"
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
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
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
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      filters.priorityOnly
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Priority only
                  </button>

                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-y-auto px-6 py-5">
          {filteredTasks.length === 0 ? (
            <p className="text-sm text-slate-500">{listEmptyMessage}</p>
          ) : (
            <ul className="space-y-3">
              {filteredTasks.map((t) => {
                const assigneeLabels =
                  t.responsibleLabels?.length > 0
                    ? t.responsibleLabels
                    : [
                        t.profile?.code_name ??
                          t.profiles?.code_name ??
                          "—",
                      ];
                const withDeadline = hasDeadline(t.deadline);
                const deadlineDate = withDeadline
                  ? new Date(`${t.deadline}T00:00:00`)
                  : null;
                const isOverdue =
                  t.status !== "completed" &&
                  withDeadline &&
                  deadlineDate &&
                  !Number.isNaN(deadlineDate.getTime()) &&
                  deadlineDate < today;
                const proofEntries = showCompletionProof
                  ? collectProofEntries(t)
                  : [];

                return (
                  <li
                    key={getItemKey(t)}
                    className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isTaskPriority(t) ? (
                          <div className="mb-1.5">
                            <PriorityBadge />
                          </div>
                        ) : null}
                        <p className="font-semibold text-slate-900">{t.agenda}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {assigneeLabels.map((label, idx) => (
                            <span
                              key={`${label}-${idx}`}
                              className="inline-flex items-center rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5"
                            >
                              {label}
                            </span>
                          ))}
                          <span>•</span>
                          <span>{formatDate(t.task_date)}</span>
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                        {statusLabel(t.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {formatActivitiesPreview(t.activities) || "—"}
                    </p>
                    {withDeadline || isOverdue || t.requestedStatus ? (
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {withDeadline ? (
                          <span className="font-medium">
                            Deadline: {formatTaskDeadline(t.deadline, t.deadline_time)}
                          </span>
                        ) : null}
                        {isOverdue ? (
                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-800 ring-1 ring-inset ring-rose-600/15">
                            Overdue
                          </span>
                        ) : null}
                        {t.requestedStatus ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-900 ring-1 ring-inset ring-amber-600/15">
                            Requested: {statusLabel(t.requestedStatus)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {proofEntries.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                          Proof of completion
                        </p>
                        <div className="mt-2 space-y-2">
                          {proofEntries.map((entry) => (
                            <div key={`${entry.label}-${entry.proofUrl}`}>
                              {proofEntries.length > 1 ? (
                                <p className="mb-1 text-xs font-semibold text-emerald-900">
                                  {entry.label}
                                </p>
                              ) : null}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedProofUrl(entry.proofUrl)
                                }
                                className="block overflow-hidden rounded-lg ring-2 ring-emerald-200/80 transition hover:ring-emerald-400"
                              >
                                <img
                                  src={entry.proofUrl}
                                  alt={`Proof of completion${proofEntries.length > 1 ? ` — ${entry.label}` : ""}`}
                                  className="max-h-36 w-full object-cover sm:max-h-40 sm:w-auto sm:max-w-full"
                                />
                              </button>
                              <a
                                href={entry.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1.5 inline-block text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline"
                              >
                                Open full size
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {renderActions ? (
                      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-200/80 pt-3">
                        {renderActions(t)}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>

      {expandedProofUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setExpandedProofUrl(null)}
          aria-label="Close proof preview"
        >
          <img
            src={expandedProofUrl}
            alt="Proof of completion"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}
    </div>
  );
};

export default DashboardTaskListModal;
