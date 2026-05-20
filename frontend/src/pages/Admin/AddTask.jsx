import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import {
  TASK_STATUSES,
  createTask,
  listAssignableProfiles,
  listTasks,
} from "../../utils/task";

const initialForm = {
  taskDate: "",
  agenda: "",
  activities: "",
  deadline: "",
  responsibleId: "",
  status: "pending",
  remarks: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

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
  const [form, setForm] = useState(initialForm);
  const [assignees, setAssignees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAssignees = useCallback(async () => {
    setLoadingAssignees(true);
    const { data, error } = await listAssignableProfiles();
    setLoadingAssignees(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAssignees(data ?? []);
  }, []);

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
    loadAssignees();
    loadTasks();
  }, [loadAssignees, loadTasks]);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const resetForm = () => setForm(initialForm);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const {
      taskDate,
      agenda,
      activities,
      deadline,
      responsibleId,
      status,
      remarks,
    } = form;

    if (!agenda.trim()) {
      toast.error("Agenda is required.");
      return;
    }

    if (!activities.trim()) {
      toast.error("Activities is required.");
      return;
    }

    if (!responsibleId) {
      toast.error("Person responsible is required.");
      return;
    }

    if (deadline < taskDate) {
      toast.error("Deadline cannot be before the task date.");
      return;
    }

    setSubmitting(true);

    const { error } = await createTask({
      taskDate,
      agenda,
      activities,
      deadline,
      responsibleId,
      status,
      remarks,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === "23503") {
        toast.error("Selected person responsible is no longer valid.");
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.success("Task created successfully.");
    resetForm();
    loadTasks();
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Add Task</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new task and assign it to a user by code name
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Date
              </label>
              <input
                id="task-date"
                type="date"
                required
                value={form.taskDate}
                onChange={setField("taskDate")}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="task-deadline"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Deadline
              </label>
              <input
                id="task-deadline"
                type="date"
                required
                min={form.taskDate || undefined}
                value={form.deadline}
                onChange={setField("deadline")}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="task-agenda"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Agenda
              </label>
              <input
                id="task-agenda"
                type="text"
                required
                value={form.agenda}
                onChange={setField("agenda")}
                placeholder="Task agenda"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="task-activities"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Activities
              </label>
              <textarea
                id="task-activities"
                required
                rows={3}
                value={form.activities}
                onChange={setField("activities")}
                placeholder="Describe the activities"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="task-responsible"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Person responsible
              </label>
              <select
                id="task-responsible"
                required
                value={form.responsibleId}
                onChange={setField("responsibleId")}
                disabled={loadingAssignees || assignees.length === 0}
                className={inputClass}
              >
                <option value="">
                  {loadingAssignees
                    ? "Loading code names..."
                    : assignees.length === 0
                      ? "No users with code name"
                      : "Select code name"}
                </option>
                {assignees.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.code_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="task-status"
                required
                value={form.status}
                onChange={setField("status")}
                className={inputClass}
              >
                {TASK_STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="task-remarks"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Remarks
              </label>
              <textarea
                id="task-remarks"
                rows={2}
                value={form.remarks}
                onChange={setField("remarks")}
                placeholder="Optional remarks"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={
                submitting || loadingAssignees || assignees.length === 0
              }
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>

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
                      No tasks yet. Create one using the form above.
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
    </Layout>
  );
};

export default AddTask;
