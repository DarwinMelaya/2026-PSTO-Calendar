import { useEffect, useState } from "react";
import { formatCtoDate, formatDuration } from "../../../utils/cto";

const profileLabel = (entry) =>
  entry?.profile?.code_name?.trim() ||
  entry?.profile?.name?.trim() ||
  (entry?.profileId ? `User #${entry.profileId}` : "—");

const CtoRejectModal = ({
  isOpen,
  entry,
  onClose,
  onConfirm,
  submitting = false,
}) => {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (isOpen) setRemarks("");
  }, [isOpen, entry?.id]);

  if (!isOpen || !entry) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onConfirm?.(remarks.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cto-reject-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={submitting ? undefined : onClose}
        aria-label="Close modal"
        disabled={submitting}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-6 py-5">
          <h2
            id="cto-reject-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            Reject CTO request
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {profileLabel(entry)} · {formatCtoDate(entry.entryDate)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-800">
            {entry.particulars}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Overtime:{" "}
            {formatDuration(entry.overtimeHours, entry.overtimeMinutes)}
          </p>
        </div>

        <div className="px-6 py-5">
          <label
            htmlFor="cto-reject-remarks"
            className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Reason for rejection
          </label>
          <textarea
            id="cto-reject-remarks"
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={submitting}
            required
            placeholder="Explain what needs to be corrected…"
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !remarks.trim()}
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Rejecting…" : "Reject request"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CtoRejectModal;
