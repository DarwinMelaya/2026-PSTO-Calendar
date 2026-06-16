import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import SubTasksField from "../../Task/SubTasksField";
import {
  formatFileSize,
  MAX_UPLOAD_INPUT_BYTES,
} from "../../../utils/compressImage";
import {
  TASK_STATUSES,
  deadlineForForm,
  deadlineTimeForForm,
  deleteTaskInstructionImage,
  listAssignableProfiles,
  normalizeSubTasks,
  parseTaskActivities,
  parseTaskRemarks,
  updateTask,
  uploadTaskInstructionImage,
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
  subTasks: [],
  deadline: "",
  deadlineTime: "",
  responsibleId: [],
  program: "GIA",
  status: "pending",
  isPriority: false,
  remarks: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function taskToForm(task) {
  if (!task) return initialForm;
  const { cleanActivities, subTasks, instructionImageUrl } = parseTaskActivities(
    task.activities,
  );
  const { cleanRemarks } = parseTaskRemarks(task.existing_remarks ?? task.remarks);
  return {
    taskDate: task.task_date ?? "",
    agenda: task.agenda ?? "",
    activities: cleanActivities,
    subTasks,
    instructionImageUrl,
    deadline: deadlineForForm(task.deadline),
    deadlineTime: deadlineTimeForForm(task.deadline_time),
    responsibleId: Array.isArray(task.responsible_ids)
      ? task.responsible_ids.map((id) => String(id))
      : task.responsible_id != null
        ? [String(task.responsible_id)]
        : [],
    program: task.program ?? "Other",
    status: task.status ?? "pending",
    isPriority: Boolean(task.is_priority),
    remarks: cleanRemarks,
  };
}

const EditTaskModal = ({ isOpen, onClose, onSuccess, task }) => {
  const [form, setForm] = useState(initialForm);
  const [assignees, setAssignees] = useState([]);
  const [loadingAssignees, setLoadingAssignees] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef(null);

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
      setForm(taskToForm(task));
      setPhotoFile(null);
      setPhotoPreview(null);
      setRemovePhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [isOpen, loadAssignees, task]);

  const assigneeOptions = useMemo(() => {
    const list = [...assignees];
    const rids = Array.isArray(task?.responsible_ids)
      ? task.responsible_ids
      : task?.responsible_id != null
        ? [task.responsible_id]
        : [];
    for (const rid of rids) {
      if (!list.some((p) => Number(p.id) === Number(rid))) {
        list.unshift({
          id: rid,
          code_name: `(profile #${rid})`,
        });
      }
    }
    return list;
  }, [assignees, task]);

  if (!isOpen || !task) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleDeadlineChange = (e) => {
    const deadline = e.target.value;
    setForm((prev) => ({
      ...prev,
      deadline,
      // If deadline is cleared, also clear deadline time to keep the form consistent.
      deadlineTime: deadline ? prev.deadlineTime : "",
    }));
  };

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
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > MAX_UPLOAD_INPUT_BYTES) {
      toast.error("Photo must be 20 MB or smaller.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentPhotoPreview =
    photoPreview ??
    (!removePhoto && form.instructionImageUrl ? form.instructionImageUrl : null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const {
      taskDate,
      agenda,
      activities,
      subTasks,
      deadline,
      deadlineTime,
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

    let instructionImageUrl = removePhoto ? null : form.instructionImageUrl;

    if (photoFile) {
      const { url, error: uploadError, originalSize, compressedSize } =
        await uploadTaskInstructionImage(photoFile);
      if (uploadError) {
        setSubmitting(false);
        toast.error(uploadError.message ?? "Failed to upload instruction image.");
        return;
      }
      if (
        form.instructionImageUrl &&
        form.instructionImageUrl !== url
      ) {
        await deleteTaskInstructionImage(form.instructionImageUrl);
      }
      instructionImageUrl = url;
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
    } else if (removePhoto && form.instructionImageUrl) {
      await deleteTaskInstructionImage(form.instructionImageUrl);
    }

    const { error } = await updateTask(task.id, {
      taskDate,
      agenda,
      activities,
      subTasks: normalizeSubTasks(subTasks),
      instructionImageUrl,
      deadline,
      deadlineTime,
      responsibleId,
      program,
      status,
      isPriority,
      remarks,
      taskIds: task.task_ids,
      groupKey: task.group_key,
      existingRemarks: task.existing_remarks,
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
        ? `Task saved and assigned to ${responsibleId.length} users.`
        : "Task updated successfully.",
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
      aria-labelledby="edit-task-modal-title"
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
              id="edit-task-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Edit task
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update task details and assignment
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
                htmlFor="edit-modal-task-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Date
              </label>
              <input
                id="edit-modal-task-date"
                type="date"
                required
                value={form.taskDate}
                onChange={setField("taskDate")}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="edit-modal-task-deadline"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Deadline{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="edit-modal-task-deadline"
                type="date"
                min={form.taskDate || undefined}
                value={form.deadline}
                onChange={handleDeadlineChange}
                className={inputClass}
              />

              <label
                htmlFor="edit-modal-task-deadline-time"
                className="mt-2 mb-1.5 block text-sm font-medium text-slate-700"
              >
                Deadline time{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="edit-modal-task-deadline-time"
                type="time"
                step={900}
                value={form.deadlineTime}
                onChange={setField("deadlineTime")}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="edit-modal-task-program"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Program
              </label>
              <select
                id="edit-modal-task-program"
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
                htmlFor="edit-modal-task-agenda"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Agenda
              </label>
              <input
                id="edit-modal-task-agenda"
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
                htmlFor="edit-modal-task-activities"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Activities{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="edit-modal-task-activities"
                rows={3}
                value={form.activities}
                onChange={setField("activities")}
                placeholder="General activity notes (optional)"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <p className="mb-1.5 block text-sm font-medium text-slate-700">
                Sub-tasks{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </p>
              <SubTasksField
                subTasks={form.subTasks}
                onChange={(subTasks) =>
                  setForm((prev) => ({ ...prev, subTasks }))
                }
                disabled={submitting}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="edit-modal-task-instruction-image"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Instruction image{" "}
                <span className="font-normal text-slate-400">
                  (optional — attach a photo to show what to do)
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="edit-modal-task-instruction-image"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={submitting}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {currentPhotoPreview ? (
                <div className="mt-3 flex items-start gap-3">
                  <img
                    src={currentPhotoPreview}
                    alt="Instruction preview"
                    className="h-24 w-auto max-w-full rounded-lg border border-slate-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={submitting}
                    className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="edit-modal-task-responsible"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Persons responsible
              </label>
              <div
                id="edit-modal-task-responsible"
                className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-300 p-3"
              >
                {loadingAssignees ? (
                  <p className="text-sm text-slate-500">Loading code names...</p>
                ) : assigneeOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">No users with code name</p>
                ) : (
                  assigneeOptions.map((profile) => (
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
                htmlFor="edit-modal-task-status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>
              <select
                id="edit-modal-task-status"
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
                htmlFor="edit-modal-task-remarks"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Remarks
              </label>
              <textarea
                id="edit-modal-task-remarks"
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
                submitting ||
                loadingAssignees ||
                assigneeOptions.length === 0
              }
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
