import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import AddTaskModal from "../../components/Modals/AdminModals/AddTaskModal";
import Layout from "../../components/Layout/Layout";
import { TASK_STATUSES, listTasks } from "../../utils/task";

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

const AddTask = () => {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

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

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage tasks assigned to users by code name
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add task
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent tasks
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
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
                    Person responsible
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
                {loadingTasks ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading tasks...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No tasks yet. Click &quot;Add task&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-800">
                        {formatDate(task.task_date)}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-slate-800">
                        {task.agenda}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">
                        {task.activities}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {formatDate(task.deadline)}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {task.profiles?.code_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(task.status)}`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">
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

      <AddTaskModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadTasks}
      />
    </Layout>
  );
};

export default AddTask;
