import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  computeBalance,
  createCtoRequest,
  formatDuration,
  normalizeHoursField,
  normalizeMinutesField,
  toTotalMinutes,
} from "../../../utils/cto";

const initialForm = {
  entryDate: "",
  particulars: "",
  overtimeHours: "0",
  overtimeMinutes: "0",
  offsetDate: "",
  offsetHours: "0",
  offsetMinutes: "0",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

const sectionClass =
  "rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3";

const UserCtoRequestModal = ({ isOpen, onClose, onSuccess, profileId }) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...initialForm,
      entryDate: new Date().toISOString().slice(0, 10),
    });
  }, [isOpen]);

  const suggestedBalance = useMemo(
    () =>
      computeBalance({
        overtimeHours: form.overtimeHours,
        overtimeMinutes: form.overtimeMinutes,
        offsetHours: form.offsetHours,
        offsetMinutes: form.offsetMinutes,
      }),
    [
      form.overtimeHours,
      form.overtimeMinutes,
      form.offsetHours,
      form.offsetMinutes,
    ],
  );

  if (!isOpen) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setNumericField = (field) => (e) => {
    const raw = e.target.value;
    if (raw === "" || /^\d+$/.test(raw)) {
      setForm((prev) => ({ ...prev, [field]: raw }));
    }
  };

  const handleClose = () => {
    if (loading) return;
    setForm(initialForm);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !profileId) return;

    const {
      entryDate,
      particulars,
      overtimeHours,
      overtimeMinutes,
      offsetDate,
      offsetHours,
      offsetMinutes,
    } = form;

    if (!entryDate) {
      toast.error("Date is required.");
      return;
    }

    if (!particulars.trim()) {
      toast.error("Particulars is required.");
      return;
    }

    if (Number(overtimeMinutes) >= 60 || Number(offsetMinutes) >= 60) {
      toast.error("Minutes must be less than 60.");
      return;
    }

    const hasOvertime = toTotalMinutes(overtimeHours, overtimeMinutes) > 0;
    if (!hasOvertime) {
      toast.error("Enter overtime hours or minutes.");
      return;
    }

    const hasOffset =
      toTotalMinutes(offsetHours, offsetMinutes) > 0 || Boolean(offsetDate);
    if (hasOffset && !offsetDate) {
      toast.error("Offset date is required when offset time is recorded.");
      return;
    }

    setLoading(true);

    const { data, error } = await createCtoRequest({
      profileId,
      entryDate,
      particulars,
      overtimeHours: normalizeHoursField(overtimeHours),
      overtimeMinutes: normalizeMinutesField(overtimeMinutes),
      offsetDate: offsetDate || null,
      offsetHours: normalizeHoursField(offsetHours),
      offsetMinutes: normalizeMinutesField(offsetMinutes),
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("CTO request submitted. Awaiting admin approval.");
    setForm(initialForm);
    onSuccess(data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-cto-request-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2
            id="user-cto-request-modal-title"
            className="text-xl font-bold text-slate-900"
          >
            Submit CTO request
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your entry will be reviewed by an admin before it appears in your
            CTO ledger.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="user-cto-date"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Date
                </label>
                <input
                  id="user-cto-date"
                  type="date"
                  value={form.entryDate}
                  onChange={setField("entryDate")}
                  className={inputClass}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="user-cto-particulars"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Particulars
                </label>
                <textarea
                  id="user-cto-particulars"
                  value={form.particulars}
                  onChange={setField("particulars")}
                  rows={3}
                  placeholder="Activity or reason for overtime"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-slate-800">Overtime</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="user-cto-ot-hours"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Hours
                  </label>
                  <input
                    id="user-cto-ot-hours"
                    type="number"
                    min="0"
                    value={form.overtimeHours}
                    onChange={setNumericField("overtimeHours")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="user-cto-ot-minutes"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Minutes
                  </label>
                  <input
                    id="user-cto-ot-minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={form.overtimeMinutes}
                    onChange={setNumericField("overtimeMinutes")}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className={sectionClass}>
              <h3 className="text-sm font-semibold text-slate-800">Offset (optional)</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="user-cto-offset-date"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Date
                  </label>
                  <input
                    id="user-cto-offset-date"
                    type="date"
                    value={form.offsetDate}
                    onChange={setField("offsetDate")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="user-cto-offset-hours"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Hours
                  </label>
                  <input
                    id="user-cto-offset-hours"
                    type="number"
                    min="0"
                    value={form.offsetHours}
                    onChange={setNumericField("offsetHours")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="user-cto-offset-minutes"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Minutes
                  </label>
                  <input
                    id="user-cto-offset-minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={form.offsetMinutes}
                    onChange={setNumericField("offsetMinutes")}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <p className="rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-teal-800">
              Estimated balance after approval:{" "}
              <span className="font-semibold">
                {formatDuration(suggestedBalance.hours, suggestedBalance.minutes)}
              </span>
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit for approval"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCtoRequestModal;
