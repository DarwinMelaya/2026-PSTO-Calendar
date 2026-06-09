import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiBell } from "react-icons/fi";
import { parseFollowUpNotification } from "../../utils/notification";

const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const FollowUpAlertModal = ({
  notification,
  pendingCount = 0,
  onAcknowledge,
  acknowledging = false,
}) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const { agenda, senderLabel, message } = parseFollowUpNotification(notification);

  const handleViewTasks = async () => {
    await onAcknowledge?.();
    navigate("/user-task");
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-alert-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-2xl shadow-violet-900/20">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 px-6 py-6 text-white">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-violet-400/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
              <FiBell className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-50 ring-1 ring-rose-300/30">
                <FiAlertCircle className="h-3.5 w-3.5" aria-hidden />
                Follow-up required
              </span>
              <h2
                id="follow-up-alert-title"
                className="mt-3 text-xl font-bold tracking-tight"
              >
                {notification.title || "Overdue task follow-up"}
              </h2>
              <p className="mt-1 text-sm text-violet-100/90">
                {senderLabel
                  ? `${senderLabel} is requesting an update on your overdue task.`
                  : "Your administrator is requesting an update on your overdue task."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {agenda ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Task
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">{agenda}</p>
            </div>
          ) : null}

          <p className="text-sm leading-relaxed text-slate-600">{message}</p>

          <p className="text-xs text-slate-400">
            Received {formatWhen(notification.created_at)}
            {pendingCount > 0 ? (
              <span className="font-medium text-violet-600">
                {" "}
                · {pendingCount} more follow-up{pendingCount === 1 ? "" : "s"} waiting
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onAcknowledge}
            disabled={acknowledging}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {acknowledging ? "Saving…" : "Acknowledge"}
          </button>
          <button
            type="button"
            onClick={handleViewTasks}
            disabled={acknowledging}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-600/25 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            View my tasks
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpAlertModal;
