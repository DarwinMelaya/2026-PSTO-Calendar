import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import { getSession } from "../../utils/session";
import { TASK_STATUSES, listTasksForUser } from "../../utils/task";

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

const UserTask = () => {
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
    const list = tasks;
    return {
      total: list.length,
      pending: list.filter((t) => t.status === "pending").length,
      ongoing: list.filter((t) => t.status === "ongoing").length,
      completed: list.filter((t) => t.status === "completed").length,
      onHold: list.filter((t) => t.status === "on_hold").length,
    };
  }, [tasks]);

  const codeName = session?.code_name?.trim();

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              My workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              My tasks
            </h1>
            <p className="max-w-xl text-base text-slate-600 leading-relaxed">
              View tasks assigned to you
              {codeName ? (
                <span className="font-semibold text-slate-800">
                  {` · Code name: ${codeName}`}
                </span>
              ) : (
                ""
              )}
              .
            </p>
          </div>
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
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Assigned to you
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading
                  ? "Loading your task list…"
                  : `${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${stats.onHold} on hold`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
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
                    Status
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
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
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
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
                          No tasks assigned yet
                        </p>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          When an admin assigns you a task, it will appear here
                          with its deadline and status.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
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
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(task.status)}`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-5 py-4 text-slate-600 sm:px-6">
                        <span className="line-clamp-2" title={task.remarks}>
                          {task.remarks || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default UserTask;
