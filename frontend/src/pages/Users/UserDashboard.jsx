import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import { getSession } from "../../utils/session";
import { listTasksForUser, TASK_STATUSES } from "../../utils/task";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const daysBetween = (a, b) => Math.floor((a - b) / (1000 * 60 * 60 * 24));

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

const UserDashboard = () => {
  const session = getSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
    };
  }, [tasks]);

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
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              My workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Dashboard
            </h1>
            <p className="max-w-xl text-base text-slate-600 leading-relaxed">
              Quick view of your tasks, statuses, and upcoming deadlines.
            </p>
          </div>
          <button
            type="button"
            onClick={loadTasks}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total tasks"
            value={loading ? "…" : stats.total}
            accent="slate"
          />
          <StatCard
            label="Pending"
            value={loading ? "…" : stats.pending}
            accent="blue"
          />
          <StatCard
            label="Ongoing"
            value={loading ? "…" : stats.ongoing}
            accent="amber"
          />
          <StatCard
            label="Completed"
            value={loading ? "…" : stats.completed}
            accent="emerald"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Near due deadlines
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {loading
                ? "Loading…"
                : `Next ${dueSoon.windowDays} days · excludes completed`}
              {!loading && stats.onHold ? (
                <span className="font-medium">{` · ${stats.onHold} on hold`}</span>
              ) : null}
            </p>
          </div>

          <div className="space-y-3 p-5 sm:p-6">
            {loading ? (
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
                    key={t.id}
                    className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {t.agenda}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-600/15">
                            {statusLabel(t.status)}
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
      </div>
    </Layout>
  );
};

export default UserDashboard;
