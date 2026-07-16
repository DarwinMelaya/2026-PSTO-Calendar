import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import ViewTaskModal from "../../components/Modals/AdminModals/ViewTaskModal";
import AddUserTaskModal from "../../components/Modals/UserModals/AddUserTaskModal";
import EditUserTaskModal from "../../components/Modals/UserModals/EditUserTaskModal";
import {
  EmptyIllustration,
  getGreeting,
  ProgressRing,
  StatCard,
  TableSkeleton,
} from "../../components/User/UserWorkspaceUI";
import {
  formatFileSize,
  MAX_UPLOAD_INPUT_BYTES,
} from "../../utils/compressImage";
import { getSession } from "../../utils/session";
import {
  TASK_PROGRAMS,
  TASK_STATUSES,
  formatActivitiesPreview,
  formatTaskDeadline,
  hasDeadline,
  isImageProofUrl,
  isInstructionImageUrl,
  isTaskPriority,
  listTasksForUser,
  normalizeProofLink,
  parseTaskActivities,
  parseTaskRemarks,
  requestTaskStatusChange,
  taskProgramLabel,
  updateTaskRemarks,
  uploadTaskCompletionProof,
} from "../../utils/task";

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
  awaitingApproval: false,
  priorityOnly: false,
  lateOnly: false,
  datePeriod: "all",
  dateBasis: "task_date",
  anchorDate: toIsoDate(new Date()),
};

const isOverdueTask = (task) => {
  if (task.status === "completed" || !hasDeadline(task.deadline)) return false;
  const deadline = startOfDay(parseDateOnly(task.deadline));
  const today = startOfDay(new Date());
  return deadline.getTime() < today.getTime();
};

const DATE_PERIODS = [
  { value: "all", label: "All" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

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

const completedRowClass = (selectedStatus) =>
  selectedStatus === "completed"
    ? "text-emerald-950 [&_td]:!border-emerald-500/35 [&_td]:!bg-emerald-400/80 [&_td]:shadow-emerald-900/5 hover:[&_td]:!bg-emerald-500/75"
    : "hover:[&_td]:shadow-md";

const UserTask = () => {
  const session = getSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestDrafts, setRequestDrafts] = useState({});
  const [remarksDrafts, setRemarksDrafts] = useState({});
  const [requestingId, setRequestingId] = useState(null);
  const [savingRemarksId, setSavingRemarksId] = useState(null);
  const [proofDrafts, setProofDrafts] = useState({});
  const [proofLinkInputs, setProofLinkInputs] = useState({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToView, setTaskToView] = useState(null);
  const [expandedInstructionUrl, setExpandedInstructionUrl] = useState(null);
  const [expandedProofUrl, setExpandedProofUrl] = useState(null);
  const [brokenInstructionIds, setBrokenInstructionIds] = useState({});
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const loadTasks = useCallback(async () => {
    if (!session?.id) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await listTasksForUser(session.id);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTasks(data ?? []);
  }, [session?.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Move completed tasks to the bottom
      const completedA = a.status === "completed" ? 1 : 0;
      const completedB = b.status === "completed" ? 1 : 0;
      if (completedA !== completedB) return completedA - completedB;

      // Among non-completed tasks, prioritize by priority flag
      const priA = isTaskPriority(a) ? 1 : 0;
      const priB = isTaskPriority(b) ? 1 : 0;
      if (priB !== priA) return priB - priA;

      // Finally sort by creation date (newest first)
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    });
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
    const q = filters.q.trim().toLowerCase();
    const status = filters.status;
    const program = filters.program;
    const awaitingApproval = filters.awaitingApproval;
    const priorityOnly = filters.priorityOnly;
    const lateOnly = filters.lateOnly;
    const dateField =
      filters.dateBasis === "deadline" ? "deadline" : "task_date";

    return sortedTasks.filter((task) => {
      if (priorityOnly && !isTaskPriority(task)) return false;
      if (lateOnly && !isOverdueTask(task)) return false;

      const meta = parseTaskRemarks(task.remarks);
      if (awaitingApproval && !meta.requestedStatus) return false;
      if (status !== "all" && task.status !== status) return false;
      if (program !== "all" && task.program !== program) return false;
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
        formatActivitiesPreview(task.activities),
        meta.cleanRemarks,
        task.program,
        taskProgramLabel(task.program),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [filters, sortedTasks, dateRange]);

  const hasActiveFilters =
    filters.awaitingApproval ||
    filters.priorityOnly ||
    filters.lateOnly ||
    filters.status !== "all" ||
    filters.program !== "all" ||
    filters.datePeriod !== "all" ||
    !!filters.q.trim();

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
    const list = tasks;
    return {
      total: list.length,
      pending: list.filter((t) => t.status === "pending").length,
      ongoing: list.filter((t) => t.status === "ongoing").length,
      completed: list.filter((t) => t.status === "completed").length,
      onHold: list.filter((t) => t.status === "on_hold").length,
      priority: list.filter((t) => isTaskPriority(t)).length,
      awaitingApproval: list.filter(
        (t) => !!parseTaskRemarks(t.remarks).requestedStatus,
      ).length,
      late: list.filter((t) => isOverdueTask(t)).length,
    };
  }, [tasks]);

  const codeName = session?.code_name?.trim();

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

  const remarksForTask = (task) => {
    const saved = parseTaskRemarks(task.remarks).cleanRemarks;
    return remarksDrafts[task.id] ?? saved;
  };

  const taskForView = (task) => {
    const meta = parseTaskRemarks(task.remarks);
    const { instructionImageUrl } = parseTaskActivities(task.activities);
    return {
      ...task,
      cleanRemarks: remarksForTask(task).trim() || meta.cleanRemarks,
      requestedStatus: meta.requestedStatus,
      proofUrl: meta.proofUrl,
      rejectionRemarks: meta.rejectionRemarks,
      rejectedStatus: meta.rejectedStatus,
      instructionImageUrl: isInstructionImageUrl(instructionImageUrl)
        ? instructionImageUrl
        : null,
      responsibleLabels: codeName ? [codeName] : ["—"],
    };
  };

  const proofForTask = (task) => {
    const saved = parseTaskRemarks(task.remarks).proofUrl;
    if (proofDrafts[task.id]) return proofDrafts[task.id];
    if (!saved) return null;
    return {
      preview: saved,
      saved: true,
      type: isImageProofUrl(saved) ? "image" : "link",
      link: isImageProofUrl(saved) ? "" : saved,
    };
  };

  const proofLinkForTask = (task) => {
    if (proofLinkInputs[task.id] !== undefined) return proofLinkInputs[task.id];
    const proof = proofForTask(task);
    if (proof?.type === "link" && proof.link) return proof.link;
    if (proof?.saved && proof.preview && !isImageProofUrl(proof.preview)) {
      return proof.preview;
    }
    return "";
  };

  const handleProofChange = (task, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_INPUT_BYTES) {
      toast.error("Photo must be 20 MB or smaller.");
      event.target.value = "";
      return;
    }

    setProofDrafts((prev) => {
      const existing = prev[task.id];
      if (existing?.preview && existing.type === "image" && !existing.saved) {
        URL.revokeObjectURL(existing.preview);
      }
      return {
        ...prev,
        [task.id]: {
          file,
          preview: URL.createObjectURL(file),
          saved: false,
          type: "image",
        },
      };
    });
    setProofLinkInputs((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
  };

  const handleProofLinkChange = (task, value) => {
    setProofLinkInputs((prev) => ({ ...prev, [task.id]: value }));
    const normalized = normalizeProofLink(value);
    if (!normalized) {
      setProofDrafts((prev) => {
        const existing = prev[task.id];
        if (existing?.type !== "link") return prev;
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      return;
    }
    setProofDrafts((prev) => {
      const existing = prev[task.id];
      if (existing?.preview && existing.type === "image" && !existing.saved) {
        URL.revokeObjectURL(existing.preview);
      }
      return {
        ...prev,
        [task.id]: {
          link: normalized,
          preview: normalized,
          saved: false,
          type: "link",
        },
      };
    });
  };

  const clearProofDraft = (task) => {
    setProofDrafts((prev) => {
      const existing = prev[task.id];
      if (existing?.preview && existing.type === "image" && !existing.saved) {
        URL.revokeObjectURL(existing.preview);
      }
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
    setProofLinkInputs((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
  };

  const openEdit = (task) => {
    setTaskToEdit({
      ...task,
      existing_remarks: task.remarks,
    });
    setEditModalOpen(true);
  };

  const closeEdit = () => {
    setEditModalOpen(false);
    setTaskToEdit(null);
  };

  const handleSaveRemarks = async (task) => {
    const cleanRemarks = remarksForTask(task).trim();
    const saved = parseTaskRemarks(task.remarks).cleanRemarks.trim();

    if (cleanRemarks === saved) {
      toast.error("No changes to save.");
      return;
    }

    setSavingRemarksId(task.id);
    const { error } = await updateTaskRemarks(task.id, {
      cleanRemarks,
      existingRemarks: task.remarks,
    });
    setSavingRemarksId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Remarks saved. Admin can see your update.");
    setRemarksDrafts((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
    loadTasks();
  };

  const handleRequestStatus = async (task) => {
    const meta = parseTaskRemarks(task.remarks);
    const { requestedStatus: pendingRequest } = meta;
    const selectedStatus =
      requestDrafts[task.id] ?? pendingRequest ?? task.status;
    const cleanRemarks = remarksForTask(task).trim();

    if (!selectedStatus) {
      toast.error("Please choose a status.");
      return;
    }

    if (selectedStatus === task.status && !pendingRequest) {
      toast.error("Selected status is the same as current status.");
      return;
    }

    let proofUrl = meta.proofUrl;
    const proofDraft = proofDrafts[task.id];
    const linkFromInput = normalizeProofLink(proofLinkForTask(task));

    // Proof is optional — photo, link, or none are all allowed for completed.
    setRequestingId(task.id);

    if (proofDraft?.file) {
      const { url, error: uploadError, originalSize, compressedSize } =
        await uploadTaskCompletionProof(proofDraft.file);

      if (uploadError) {
        setRequestingId(null);
        toast.error(uploadError.message ?? "Failed to upload proof photo.");
        return;
      }

      proofUrl = url;

      if (
        originalSize &&
        compressedSize &&
        compressedSize < originalSize
      ) {
        toast.success(
          `Photo compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}`,
          { duration: 4000 },
        );
      }
    } else if (proofDraft?.type === "link" && proofDraft.link) {
      proofUrl = proofDraft.link;
    } else if (selectedStatus === "completed" && linkFromInput) {
      proofUrl = linkFromInput;
    }

    const { error } = await requestTaskStatusChange(task.id, {
      requestedStatus: selectedStatus,
      remarks: cleanRemarks,
      groupKey: meta.groupKey,
      existingRemarks: task.remarks,
      proofUrl,
    });
    setRequestingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      pendingRequest
        ? "Status request updated. Awaiting admin approval."
        : "Status change request sent for admin approval.",
    );
    setRemarksDrafts((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
    clearProofDraft(task);
    loadTasks();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 bg-gradient-to-b from-slate-50/80 via-transparent to-blue-50/40 pb-10 sm:space-y-8">
        {/* Hero */}
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 px-6 py-8 shadow-2xl shadow-blue-900/30 sm:px-8 sm:py-10">
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

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                PSTO Calendar · My workspace
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100/90">
                  {getGreeting()}
                  {codeName ? (
                    <span className="text-white">{`, ${codeName}`}</span>
                  ) : null}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  Your task command center
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-blue-100/85 sm:text-base">
                  Track assignments, update progress, and request status changes —
                  all in one place.{" "}
                  <span className="text-white/90">{todayLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!loading && stats.priority > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-50 ring-1 ring-rose-300/30">
                    {stats.priority} priority
                  </span>
                ) : null}
                {!loading && stats.awaitingApproval > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-50 ring-1 ring-amber-300/30">
                    {stats.awaitingApproval} awaiting approval
                  </span>
                ) : null}
                {!loading && stats.onHold > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                    {stats.onHold} on hold
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col lg:items-end">
              <ProgressRing percent={completionPercent} loading={loading} />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  disabled={!session?.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg shadow-blue-950/20 transition hover:bg-blue-50 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="ut-animate-in ut-delay-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total tasks"
            value={loading ? "…" : stats.total}
            accent="slate"
            sublabel="Assigned to you"
          />
          <StatCard
            label="Pending"
            value={loading ? "…" : stats.pending}
            accent="blue"
            sublabel="Not started yet"
          />
          <StatCard
            label="Ongoing"
            value={loading ? "…" : stats.ongoing}
            accent="amber"
            sublabel="In progress"
          />
          <StatCard
            label="Completed"
            value={loading ? "…" : stats.completed}
            accent="emerald"
            sublabel="Marked done"
          />
          <StatCard
            label="Priority"
            value={loading ? "…" : stats.priority}
            accent="rose"
            sublabel="Needs attention"
          />
        </div>

        {/* Task table */}
        <section className="ut-animate-in ut-delay-2 rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25">
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
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Task board
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {loading
                    ? "Syncing your assignments…"
                    : `${filteredTasks.length} shown · ${tasks.length} total`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              disabled={!session?.id}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
            >
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
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add task
            </button>
          </div>

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
                      : "Find tasks by date, status, or keyword"}
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
          <div className="border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
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
                    placeholder="Search agenda, activities, remarks…"
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

                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        lateOnly: !prev.lateOnly,
                      }))
                    }
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto ${
                      filters.lateOnly
                        ? "border-red-200 bg-red-50 text-red-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Late only
                    {!loading && stats.late > 0 ? (
                      <span className="ml-1.5 tabular-nums opacity-80">
                        ({stats.late})
                      </span>
                    ) : null}
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
                    Tip: combine search, status, and date range.
                  </span>
                )}
              </div>
            </div>
          </div>
          ) : null}

          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain bg-slate-50/30 p-2 sm:p-3 [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr>
                  <th className="w-[9%] whitespace-nowrap rounded-l-xl bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white sm:px-4">
                    Date
                  </th>
                  <th className="w-[16%] whitespace-nowrap bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white sm:px-4">
                    Agenda
                  </th>
                  <th className="w-[18%] whitespace-nowrap bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white sm:px-4">
                    Activities
                  </th>
                  <th className="w-[11%] whitespace-nowrap bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white sm:px-4">
                    Deadline
                  </th>
                  <th className="w-[9%] whitespace-nowrap bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white sm:px-4">
                    Status
                  </th>
                  <th className="w-[18%] whitespace-nowrap bg-slate-900 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-white sm:px-4">
                    Remarks
                  </th>
                  <th className="w-[19%] whitespace-nowrap rounded-r-xl bg-slate-900 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white sm:px-4">
                    Request
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          Your board is ready
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Create your first task or wait for an admin assignment.
                          Everything you need to track progress lives here.
                        </p>
                        {session?.id ? (
                          <button
                            type="button"
                            onClick={() => setAddModalOpen(true)}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
                          >
                            Create first task
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration variant="filter" />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          No matches found
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Try a different keyword or clear your filters to see
                          the full list again.
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
                  filteredTasks.map((task) => {
                    const taskMeta = parseTaskRemarks(task.remarks);
                    const { instructionImageUrl } = parseTaskActivities(task.activities);
                    const showInstructionImage =
                      isInstructionImageUrl(instructionImageUrl) &&
                      !brokenInstructionIds[task.id];
                    const pendingRequest = taskMeta.requestedStatus;
                    const selectedRequestStatus =
                      requestDrafts[task.id] ??
                      pendingRequest ??
                      task.status;
                    const proof = proofForTask(task);
                    const showProofUpload =
                      selectedRequestStatus === "completed";
                    const overdue = isOverdueTask(task);
                    const showExtraRow =
                      showProofUpload ||
                      Boolean(pendingRequest) ||
                      Boolean(!pendingRequest && taskMeta.rejectionRemarks);

                    return (
                      <Fragment key={task.id}>
                        <tr
                          className={`group transition-all duration-200 ${completedRowClass(selectedRequestStatus)} ${
                            overdue
                              ? "[&_td]:!border-rose-200/90 [&_td:first-child]:border-l-[3px] [&_td:first-child]:!border-l-rose-500"
                              : ""
                          }`}
                        >
                          <td
                            className={`whitespace-nowrap border border-r-0 border-slate-200/80 bg-white px-3 py-3 font-semibold text-slate-900 shadow-sm sm:px-4 ${
                              showExtraRow ? "rounded-tl-xl" : "rounded-l-xl"
                            }`}
                          >
                            {formatDate(task.task_date)}
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 text-slate-800 shadow-sm sm:px-4">
                            <div className="flex min-w-0 flex-col gap-1.5">
                              {isTaskPriority(task) ? (
                                <span className="inline-flex w-fit rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800 ring-1 ring-inset ring-rose-600/15">
                                  Priority
                                </span>
                              ) : null}
                              <span className="line-clamp-2 break-words" title={task.agenda}>
                                {task.agenda}
                              </span>
                            </div>
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 text-slate-600 shadow-sm sm:px-4">
                            <div className="flex min-w-0 flex-col gap-2">
                              <span
                                className="line-clamp-2 break-words"
                                title={formatActivitiesPreview(task.activities)}
                              >
                                {formatActivitiesPreview(task.activities) || "—"}
                              </span>
                              {showInstructionImage ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedInstructionUrl(instructionImageUrl)
                                  }
                                  className="block w-fit max-w-full overflow-hidden rounded-lg ring-2 ring-sky-200/80 transition hover:ring-sky-400"
                                >
                                  <img
                                    src={instructionImageUrl}
                                    alt="Task instruction from admin"
                                    className="h-14 w-auto max-w-full object-cover"
                                    onError={() =>
                                      setBrokenInstructionIds((prev) => ({
                                        ...prev,
                                        [task.id]: true,
                                      }))
                                    }
                                  />
                                </button>
                              ) : null}
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setTaskToView(taskForView(task))}
                                  className="w-fit rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEdit(task)}
                                  disabled={
                                    savingRemarksId === task.id ||
                                    requestingId === task.id
                                  }
                                  className="w-fit rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-4">
                            <div className="flex flex-col gap-1.5">
                              <span
                                className={
                                  overdue
                                    ? "font-semibold text-rose-800"
                                    : "text-slate-800"
                                }
                              >
                                {formatTaskDeadline(
                                  task.deadline,
                                  task.deadline_time,
                                )}
                              </span>
                              {overdue ? (
                                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800 ring-1 ring-inset ring-rose-600/15">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Late
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(task.status)}`}
                            >
                              {statusLabel(task.status)}
                            </span>
                          </td>
                          <td className="border-y border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-4">
                            <div className="min-w-0 space-y-2">
                              <textarea
                                rows={2}
                                value={remarksForTask(task)}
                                onChange={(e) =>
                                  setRemarksDrafts((prev) => ({
                                    ...prev,
                                    [task.id]: e.target.value,
                                  }))
                                }
                                disabled={
                                  savingRemarksId === task.id ||
                                  requestingId === task.id
                                }
                                placeholder="Progress notes…"
                                className="w-full min-w-0 resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRemarks(task)}
                                disabled={
                                  savingRemarksId === task.id ||
                                  requestingId === task.id
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingRemarksId === task.id
                                  ? "Saving..."
                                  : "Save remarks"}
                              </button>
                            </div>
                          </td>
                          <td
                            className={`border border-l-0 border-slate-200/80 bg-white px-3 py-3 text-right shadow-sm sm:px-4 ${
                              showExtraRow ? "rounded-tr-xl" : "rounded-r-xl"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <select
                                value={selectedRequestStatus}
                                onChange={(e) =>
                                  setRequestDrafts((prev) => ({
                                    ...prev,
                                    [task.id]: e.target.value,
                                  }))
                                }
                                disabled={requestingId === task.id}
                                className={`max-w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                  selectedRequestStatus === "completed"
                                    ? "border-emerald-800 bg-emerald-100 text-emerald-950 focus:border-emerald-900"
                                    : "border-slate-300 bg-white text-slate-700 focus:border-blue-500"
                                }`}
                              >
                                {TASK_STATUSES.map(({ value, label }) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRequestStatus(task)}
                                disabled={requestingId === task.id}
                                className="shrink-0 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {requestingId === task.id
                                  ? "Sending..."
                                  : "Request"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {showExtraRow ? (
                          <tr
                            className={`transition-all duration-200 ${completedRowClass(selectedRequestStatus)}`}
                          >
                            <td
                              colSpan={7}
                              className="rounded-b-xl border border-t-0 border-slate-200/80 bg-white px-3 py-3 shadow-sm sm:px-4"
                            >
                              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
                                {showProofUpload ? (
                                  <div className="w-full min-w-0 flex-1 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2.5 sm:min-w-[16rem]">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                                      Proof of completion
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-emerald-800/75">
                                      Optional — photo or link
                                    </p>
                                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                                      {proof?.type === "image" && proof?.preview ? (
                                        <div className="w-full min-w-0 space-y-1 sm:max-w-[10rem]">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedProofUrl(proof.preview)
                                            }
                                            className="block w-full overflow-hidden rounded-md border border-emerald-200 transition hover:border-emerald-400"
                                            aria-label="View proof of completion"
                                          >
                                            <img
                                              src={proof.preview}
                                              alt="Proof preview"
                                              className="h-20 w-full object-cover"
                                            />
                                          </button>
                                          {!proof.saved ? (
                                            <button
                                              type="button"
                                              onClick={() => clearProofDraft(task)}
                                              disabled={requestingId === task.id}
                                              className="text-[10px] font-semibold text-emerald-800 underline-offset-2 hover:underline disabled:opacity-50"
                                            >
                                              Remove photo
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                      {proof?.type === "link" && proof?.preview ? (
                                        <div className="w-full min-w-0 space-y-1 sm:max-w-sm">
                                          <a
                                            href={proof.preview}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block break-all rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-emerald-800 underline-offset-2 hover:underline"
                                          >
                                            {proof.preview}
                                          </a>
                                          {!proof.saved ? (
                                            <button
                                              type="button"
                                              onClick={() => clearProofDraft(task)}
                                              disabled={requestingId === task.id}
                                              className="text-[10px] font-semibold text-emerald-800 underline-offset-2 hover:underline disabled:opacity-50"
                                            >
                                              Remove link
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                      <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
                                        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-emerald-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-50/80">
                                          {proof?.type === "image" && proof?.preview
                                            ? "Change photo"
                                            : "Upload photo"}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            disabled={requestingId === task.id}
                                            onChange={(e) =>
                                              handleProofChange(task, e)
                                            }
                                          />
                                        </label>
                                        <input
                                          type="url"
                                          inputMode="url"
                                          placeholder="Or paste link…"
                                          value={proofLinkForTask(task)}
                                          disabled={requestingId === task.id}
                                          onChange={(e) =>
                                            handleProofLinkChange(
                                              task,
                                              e.target.value,
                                            )
                                          }
                                          className="w-full min-w-0 rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/40 disabled:opacity-50"
                                          aria-label="Proof link"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {pendingRequest ? (
                                  <p
                                    className={`text-xs ${
                                      pendingRequest === "completed"
                                        ? "font-semibold text-emerald-900"
                                        : "text-amber-800"
                                    }`}
                                  >
                                    Pending admin approval:{" "}
                                    {statusLabel(pendingRequest)}
                                  </p>
                                ) : null}

                                {!pendingRequest && taskMeta.rejectionRemarks ? (
                                  <div className="w-full min-w-0 rounded-lg border border-rose-200/90 bg-rose-50/80 p-2 sm:max-w-md">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-900">
                                      Request rejected
                                      {taskMeta.rejectedStatus
                                        ? `: ${statusLabel(taskMeta.rejectedStatus)}`
                                        : ""}
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-rose-950 whitespace-pre-wrap">
                                      {taskMeta.rejectionRemarks}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );

                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddUserTaskModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadTasks}
        currentUserId={session?.id}
      />

      <EditUserTaskModal
        isOpen={editModalOpen}
        task={taskToEdit}
        onClose={closeEdit}
        onSuccess={loadTasks}
        currentUserId={session?.id}
      />

      <ViewTaskModal
        isOpen={!!taskToView}
        task={taskToView}
        onClose={() => setTaskToView(null)}
      />

      {expandedInstructionUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setExpandedInstructionUrl(null)}
          aria-label="Close instruction image preview"
        >
          <img
            src={expandedInstructionUrl}
            alt="Task instruction from admin"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}

      {expandedProofUrl ? (
        isImageProofUrl(expandedProofUrl) ? (
          <button
            type="button"
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-slate-950/80 p-4"
            onClick={() => setExpandedProofUrl(null)}
            aria-label="Close proof image preview"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Proof of completion
            </p>
            <img
              src={expandedProofUrl}
              alt="Proof of completion"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-xs text-slate-400">Click anywhere outside to close</p>
          </button>
        ) : (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setExpandedProofUrl(null)}
              aria-label="Close proof link preview"
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Proof of completion
              </p>
              <a
                href={expandedProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block break-all text-sm font-semibold text-sky-700 underline-offset-2 hover:underline"
              >
                {expandedProofUrl}
              </a>
              <button
                type="button"
                onClick={() => setExpandedProofUrl(null)}
                className="mt-4 w-full rounded-xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )
      ) : null}
    </Layout>
  );
};

export default UserTask;
