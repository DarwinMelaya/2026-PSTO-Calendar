import {
  TASK_STATUSES,
  formatTaskDeadline,
} from "../../../utils/task";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

const DetailBlock = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <div className="mt-1.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
      {children}
    </div>
  </div>
);

const ViewTaskModal = ({ isOpen, onClose, task }) => {
  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-task-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2
              id="view-task-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Task details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(task.task_date)}
              {" · "}
              {formatTaskDeadline(task.deadline)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <DetailBlock label="Agenda">{task.agenda || "—"}</DetailBlock>
          <DetailBlock label="Activities">
            {task.activities || "—"}
          </DetailBlock>
          <DetailBlock label="Remarks">{task.cleanRemarks || "—"}</DetailBlock>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Owner
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(task.responsibleLabels ?? ["—"]).map((label, idx) => (
                  <span
                    key={`${label}-${idx}`}
                    className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {statusLabel(task.status)}
                {task.requestedStatus
                  ? ` · Requested: ${statusLabel(task.requestedStatus)}`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto sm:px-6"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewTaskModal;
