import { useCallback, useEffect, useState } from "react";
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
      return "bg-emerald-100 text-emerald-800";
    case "ongoing":
      return "bg-blue-100 text-blue-800";
    case "on_hold":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tasks assigned to you
            {session?.code_name ? ` (${session.code_name})` : ""}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Agenda
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Activities
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Deadline
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading tasks...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No tasks assigned to you yet.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-800">
                        {formatDate(task.task_date)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-800">
                        {task.agenda}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-slate-600">
                        {task.activities}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {formatDate(task.deadline)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(task.status)}`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                        {task.remarks || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserTask;
