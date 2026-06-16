import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  computeBalance,
  createCtoEntry,
  formatDuration,
  normalizeHoursField,
  normalizeMinutesField,
  toTotalMinutes,
  updateCtoEntry,
} from "../../../utils/cto";

const initialForm = {
  profileId: "",
  entryDate: "",
  particulars: "",
  overtimeHours: "0",
  overtimeMinutes: "0",
  offsetDate: "",
  offsetHours: "0",
  offsetMinutes: "0",
  balanceHours: "0",
  balanceMinutes: "0",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const sectionClass =
  "rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3";

/**
 * Dual-mode modal: Add (editEntry = null) or Edit (editEntry = existing entry).
 */
const AddCtoModal = ({
  isOpen,
  onClose,
  onSuccess,
  profiles = [],
  defaultProfileId = "",
  editEntry = null, // pass a mapped entry object to switch to edit mode
}) => {
  const isEditMode = Boolean(editEntry);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [balanceTouched, setBalanceTouched] = useState(false);

  // Populate form when opening
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && editEntry) {
      setForm({
        profileId: String(editEntry.profileId),
        entryDate: editEntry.entryDate ?? "",
        particulars: editEntry.particulars ?? "",
        overtimeHours: String(editEntry.overtimeHours ?? 0),
        overtimeMinutes: String(editEntry.overtimeMinutes ?? 0),
        offsetDate: editEntry.offsetDate ?? "",
        offsetHours: String(editEntry.offsetHours ?? 0),
        offsetMinutes: String(editEntry.offsetMinutes ?? 0),
        balanceHours: String(editEntry.balanceHours ?? 0),
        balanceMinutes: String(editEntry.balanceMinutes ?? 0),
      });
      setBalanceTouched(true); // keep stored balance in edit mode until user resets
    } else {
      setForm({
        ...initialForm,
        profileId: defaultProfileId ? String(defaultProfileId) : "",
        entryDate: new Date().toISOString().slice(0, 10),
      });
      setBalanceTouched(false);
    }
  }, [isOpen, isEditMode, editEntry, defaultProfileId]);

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

  useEffect(() => {
    if (!isOpen || balanceTouched) return;
    setForm((prev) => ({
      ...prev,
      balanceHours: String(suggestedBalance.hours),
      balanceMinutes: String(suggestedBalance.minutes),
    }));
  }, [isOpen, balanceTouched, suggestedBalance.hours, suggestedBalance.minutes]);

  if (!isOpen) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setNumericField = (field) => (e) => {
    const raw = e.target.value;
    if (raw === "" || /^\d+$/.test(raw)) {
      setForm((prev) => ({ ...prev, [field]: raw }));
    }
  };

  const handleBalanceChange = (field) => (e) => {
    setBalanceTouched(true);
    const raw = e.target.value;
    if (raw === "" || /^-?\d+$/.test(raw)) {
      setForm((prev) => ({ ...prev, [field]: raw }));
    }
  };

  const handleClose = () => {
    if (loading) return;
    setForm(initialForm);
    setBalanceTouched(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const {
      profileId,
      entryDate,
      particulars,
      overtimeHours,
      overtimeMinutes,
      offsetDate,
      offsetHours,
      offsetMinutes,
      balanceHours,
      balanceMinutes,
    } = form;

    if (!profileId) {
      toast.error("Select a person.");
      return;
    }

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

    if (Number(balanceMinutes) >= 60 || Number(balanceMinutes) < 0) {
      toast.error("Balance minutes must be between 0 and 59.");
      return;
    }

    const hasOffset =
      toTotalMinutes(offsetHours, offsetMinutes) > 0 || Boolean(offsetDate);
    if (hasOffset && !offsetDate) {
      toast.error("Offset date is required when offset time is recorded.");
      return;
    }

    const payload = {
      profileId,
      entryDate,
      particulars,
      overtimeHours: normalizeHoursField(overtimeHours),
      overtimeMinutes: normalizeMinutesField(overtimeMinutes),
      offsetDate: offsetDate || null,
      offsetHours: normalizeHoursField(offsetHours),
      offsetMinutes: normalizeMinutesField(offsetMinutes),
      balanceHours: Number(balanceHours) || 0,
      balanceMinutes: normalizeMinutesField(balanceMinutes),
    };

    setLoading(true);

    let data, error;

    if (isEditMode) {
      ({ data, error } = await updateCtoEntry(editEntry.id, payload));
    } else {
      ({ data, error } = await createCtoEntry(payload));
    }

    setLoading(false);

    if (error) {
      if (error.code === "23503") {
        toast.error("Selected person was not found.");
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.success(isEditMode ? "Entry updated." : "CTO entry added.");
    setForm(initialForm);
    setBalanceTouched(false);
    onSuccess(data);
    onClose();
  };

  const profileLabel = (profile) =>
    profile.code_name?.trim() ||
    profile.name?.trim() ||
    profile.email?.trim() ||
    `User #${profile.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-cto-modal-title"
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
            id="add-cto-modal-title"
            className="text-xl font-bold text-slate-900"
          >
            {isEditMode ? "Edit CTO entry" : "Add CTO entry"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isEditMode
              ? "Update the overtime, offset, and balance for this entry."
              : "Record overtime, offset, and running balance for one person."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="cto-profile"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Person
              </label>
              <select
                id="cto-profile"
                value={form.profileId}
                onChange={setField("profileId")}
                className={inputClass}
                required
                disabled={isEditMode} // profile can't change on edit
              >
                <option value="">Select person…</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profileLabel(profile)}
                  </option>
                ))}
              </select>
              {isEditMode && (
                <p className="mt-1 text-xs text-slate-400">
                  Person cannot be changed on an existing entry.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cto-date"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Date
                </label>
                <input
                  id="cto-date"
                  type="date"
                  value={form.entryDate}
                  onChange={setField("entryDate")}
                  className={inputClass}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="cto-particulars"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Particulars
                </label>
                <textarea
                  id="cto-particulars"
                  value={form.particulars}
                  onChange={setField("particulars")}
                  rows={3}
                  placeholder="Activity or reason for this entry"
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
                    htmlFor="cto-ot-hours"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Hours
                  </label>
                  <input
                    id="cto-ot-hours"
                    type="number"
                    min="0"
                    value={form.overtimeHours}
                    onChange={setNumericField("overtimeHours")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cto-ot-minutes"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Minutes
                  </label>
                  <input
                    id="cto-ot-minutes"
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
              <h3 className="text-sm font-semibold text-slate-800">Offset</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label
                    htmlFor="cto-offset-date"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Date
                  </label>
                  <input
                    id="cto-offset-date"
                    type="date"
                    value={form.offsetDate}
                    onChange={setField("offsetDate")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cto-offset-hours"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Hours
                  </label>
                  <input
                    id="cto-offset-hours"
                    type="number"
                    min="0"
                    value={form.offsetHours}
                    onChange={setNumericField("offsetHours")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cto-offset-minutes"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Minutes
                  </label>
                  <input
                    id="cto-offset-minutes"
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

            <div className={sectionClass}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800">Balance</h3>
                {!balanceTouched ? (
                  <span className="text-xs text-slate-500">
                    Auto: {formatDuration(suggestedBalance.hours, suggestedBalance.minutes)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBalanceTouched(false)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Use auto balance
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cto-balance-hours"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Hours
                  </label>
                  <input
                    id="cto-balance-hours"
                    type="number"
                    value={form.balanceHours}
                    onChange={handleBalanceChange("balanceHours")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cto-balance-minutes"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Minutes
                  </label>
                  <input
                    id="cto-balance-minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={form.balanceMinutes}
                    onChange={handleBalanceChange("balanceMinutes")}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Balance = Overtime − Offset
              </p>
            </div>
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
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? isEditMode ? "Saving…" : "Adding…"
                : isEditMode ? "Save changes" : "Add entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCtoModal;
