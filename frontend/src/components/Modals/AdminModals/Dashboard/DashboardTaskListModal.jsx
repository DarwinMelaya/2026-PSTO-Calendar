import PriorityBadge from "../../../Task/PriorityBadge";
import {
  formatTaskDeadline,
  hasDeadline,
  isTaskPriority,
  TASK_STATUSES,
} from "../../../../utils/task";

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const DashboardTaskListModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  tasks,
  emptyMessage,
  modalId = "dashboard-task-list-modal",
}) => {
  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
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
              id={`${modalId}-title`}
              className="text-xl font-semibold text-slate-900"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
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

        <div className="overflow-y-auto px-6 py-5">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500">{emptyMessage}</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map((t) => {
                const withDeadline = hasDeadline(t.deadline);
                const deadlineDate = withDeadline
                  ? new Date(`${t.deadline}T00:00:00`)
                  : null;
                const isOverdue =
                  t.status !== "completed" &&
                  withDeadline &&
                  deadlineDate &&
                  !Number.isNaN(deadlineDate.getTime()) &&
                  deadlineDate < today;

                return (
                  <li
                    key={t.id}
                    className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isTaskPriority(t) ? (
                          <div className="mb-1.5">
                            <PriorityBadge />
                          </div>
                        ) : null}
                        <p className="font-semibold text-slate-900">{t.agenda}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                            {t.profile?.code_name ?? t.profiles?.code_name ?? "—"}
                          </span>
                          <span>•</span>
                          <span>{formatDate(t.task_date)}</span>
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                        {statusLabel(t.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {t.activities || "—"}
                    </p>
                    {withDeadline || isOverdue || t.requestedStatus ? (
                      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {withDeadline ? (
                          <span className="font-medium">
                            Deadline: {formatTaskDeadline(t.deadline)}
                          </span>
                        ) : null}
                        {isOverdue ? (
                          <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-800 ring-1 ring-inset ring-rose-600/15">
                            Overdue
                          </span>
                        ) : null}
                        {t.requestedStatus ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-900 ring-1 ring-inset ring-amber-600/15">
                            Requested: {statusLabel(t.requestedStatus)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardTaskListModal;
