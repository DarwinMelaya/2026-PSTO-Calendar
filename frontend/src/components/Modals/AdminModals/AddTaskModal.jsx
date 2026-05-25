import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  TASK_STATUSES,
  createTask,
  listAssignableProfiles,
} from "../../../utils/task";

const TASK_PROGRAMS = [
  { value: "GIA", label: "GIA" },
  { value: "SSCP", label: "SSCP" },
  { value: "CEST", label: "CEST" },
  { value: "SETUP", label: "SETUP" },
  { value: "Scholarship", label: "Scholarship" },
  { value: "Other", label: "Other" },
];

const initialForm = {
  taskDate: "",
  agenda: "",
  activities: "",
  deadline: "",
  responsibleId: [],
  program: "GIA",
  status: "pending",
  isPriority: false,
  remarks: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const AddTaskModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState(initialForm);
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(true);
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

  useEffect(() => {
    if (isOpen) {
      loadAssignees();
    }
  }, [isOpen, loadAssignees]);

  if (!isOpen) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setPriority = (e) =>
    setForm((prev) => ({ ...prev, isPriority: e.target.checked }));

  const toggleResponsibleId = (id) => {
    const value = String(id);
    const values = form.responsibleId.includes(value)
      ? form.responsibleId.filter((item) => item !== value)
      : [...form.responsibleId, value];
    setForm((prev) => ({ ...prev, responsibleId: values }));
  };

  const handleClose = () => {
    if (submitting) return;
    setForm(initialForm);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const {
      taskDate,
      agenda,
      activities,
      deadline,
      responsibleId,
      program,
      status,
      isPriority,
      remarks,
    } = form;

    if (!agenda.trim()) {
      toast.error("Agenda is required.");
      return;
    }

    if (!responsibleId.length) {
      toast.error("At least one person responsible is required.");
      return;
    }

    if (deadline && taskDate && deadline < taskDate) {
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
      program,
      status,
      isPriority,
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

    toast.success(
      responsibleId.length > 1
        ? `Tasks created for ${responsibleId.length} assignees.`
        : "Task created successfully.",
    );
    setForm(initialForm);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-task-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Add task
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a new task and assign it to a user by code name
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="modal-task-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Date
              </label>
              <input
                id="modal-task-date"
                type="date"
                required
                value={form.taskDate}
                onChange={setField("taskDate")}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="modal-task-deadline"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Deadline{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="modal-task-deadline"
                type="date"
                min={form.taskDate || undefined}
                value={form.deadline}
                onChange={setField("deadline")}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="modal-task-program"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Program
              </label>
              <select
                id="modal-task-program"
                required
                value={form.program}
                onChange={setField("program")}
                className={inputClass}
              >
                {TASK_PROGRAMS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="modal-task-agenda"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Agenda
              </label>
              <input
                id="modal-task-agenda"
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
                htmlFor="modal-task-activities"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Activities{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="modal-task-activities"
                rows={3}
                value={form.activities}
                onChange={setField("activities")}
                placeholder="Describe the activities"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="modal-task-responsible"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Persons responsible
              </label>
              <div
                id="modal-task-responsible"
                className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-300 p-3"
              >
                {loadingAssignees ? (
                  <p className="text-sm text-slate-500">Loading code names...</p>
                ) : assignees.length === 0 ? (
                  <p className="text-sm text-slate-500">No users with code name</p>
                ) : (
                  assignees.map((profile) => (
                    <label
                      key={profile.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.responsibleId.includes(String(profile.id))}
                        onChange={() => toggleResponsibleId(profile.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{profile.code_name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Select one or more users.
              </p>
            </div>

            <div>
              <label
                htmlFor="modal-task-status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="modal-task-status"
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

            <div className="flex items-end sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 w-full sm:w-auto">
                <input
                  type="checkbox"
                  checked={form.isPriority}
                  onChange={setPriority}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    Priority task
                  </span>
                  <span className="block text-xs text-slate-500">
                    Mark as high priority for assignees
                  </span>
                </span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="modal-task-remarks"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Remarks
              </label>
              <textarea
                id="modal-task-remarks"
                rows={2}
                value={form.remarks}
                onChange={setField("remarks")}
                placeholder="Optional remarks"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting || loadingAssignees || assignees.length === 0
              }
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
