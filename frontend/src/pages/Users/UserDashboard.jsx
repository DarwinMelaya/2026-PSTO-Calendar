import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  ListSkeleton,
  ProgressRing,
  StatCard,
} from "../../components/User/UserWorkspaceUI";
import FollowUpAlertModal from "../../components/Notifications/FollowUpAlertModal";
import { useFollowUpAlerts } from "../../hooks/useFollowUpAlerts";
import { getSession } from "../../utils/session";
import {
  formatTaskDeadline,
  isTaskPriority,
  listTasksForUser,
  parseTaskRemarks,
  TASK_STATUSES,
} from "../../utils/task";

const daysBetween = (a, b) => Math.floor((a - b) / (1000 * 60 * 60 * 24));

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

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

const UserDashboard = () => {
  const session = getSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    activeFollowUp,
    pendingFollowUpCount,
    acknowledging,
    acknowledgeFollowUp,
  } = useFollowUpAlerts(session?.id);

  const codeName = session?.code_name?.trim();

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

  const stats = useMemo(() => {
    const list = tasks ?? [];
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
    };
  }, [tasks]);

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

  const dueSoon = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const windowDays = 7;
    const end = new Date(today);
    end.setDate(end.getDate() + windowDays);

    const list = (tasks ?? [])
      .filter((t) => t.status !== "completed" && t.deadline)
      .map((t) => ({
        ...t,
        deadlineDate: new Date(`${t.deadline}T00:00:00`),
      }))
      .filter((t) => !Number.isNaN(t.deadlineDate.getTime()))
      .filter((t) => t.deadlineDate <= end)
      .sort((a, b) => a.deadlineDate - b.deadlineDate)
      .slice(0, 6);

    return { windowDays, items: list, today };
  }, [tasks]);

  return (
    <Layout>
      <FollowUpAlertModal
        notification={activeFollowUp}
        pendingCount={pendingFollowUpCount}
        acknowledging={acknowledging}
        onAcknowledge={acknowledgeFollowUp}
      />

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
                PSTO Calendar · Dashboard
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100/90">
                  {getGreeting()}
                  {codeName ? (
                    <span className="text-white">{`, ${codeName}`}</span>
                  ) : null}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  Your dashboard overview
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-blue-100/85 sm:text-base">
                  See task counts, completion progress, and what&apos;s due soon
                  — at a glance.{" "}
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
                {!loading && dueSoon.items.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-50 ring-1 ring-cyan-300/30">
                    {dueSoon.items.length} due within {dueSoon.windowDays} days
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col lg:items-end">
              <ProgressRing percent={completionPercent} loading={loading} />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:flex-col">
                <Link
                  to="/user-task"
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
                      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z"
                    />
                  </svg>
                  Open task board
                </Link>
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

        {/* Deadlines */}
        <section className="ut-animate-in ut-delay-2 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/80 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25">
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
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Near due deadlines
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {loading
                    ? "Checking upcoming dates…"
                    : `Next ${dueSoon.windowDays} days · excludes completed`}
                </p>
              </div>
            </div>
            <Link
              to="/user-task"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg"
            >
              Manage tasks
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>

          <div className="bg-slate-50/40 p-5 sm:p-6">
            {loading ? (
              <ListSkeleton rows={4} />
            ) : dueSoon.items.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <EmptyIllustration variant="deadline" />
                <p className="mt-6 text-lg font-bold text-slate-900">
                  You&apos;re all caught up
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  No deadlines in the next {dueSoon.windowDays} days. Open your
                  task board to plan ahead or add new work.
                </p>
                <Link
                  to="/user-task"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-700"
                >
                  Go to task board
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {dueSoon.items.map((t) => {
                  const diffDays = daysBetween(t.deadlineDate, dueSoon.today);
                  const urgency = urgencyStyle(diffDays);

                  return (
                    <article
                      key={t.id}
                      className={`group rounded-2xl border border-slate-200/90 border-l-4 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${urgency.border}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${urgency.iconBg}`}
                        >
                          <svg
                            className="h-6 w-6"
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
                            <p className="font-semibold text-slate-900 group-hover:text-blue-700">
                              {t.agenda}
                            </p>
                            <span
                              className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${urgency.badge}`}
                            >
                              {urgency.label}
                            </span>
                          </div>
                          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(t.status)}`}
                            >
                              {statusLabel(t.status)}
                            </span>
                            {isTaskPriority(t) ? (
                              <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800 ring-1 ring-inset ring-rose-600/15">
                                Priority
                              </span>
                            ) : null}
                            <span className="font-medium text-slate-700">
                              {formatTaskDeadline(t.deadline, t.deadline_time)}
                            </span>
                          </p>
                          {t.activities ? (
                            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                              {t.activities}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default UserDashboard;
