import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  collectDescendantIds,
  createOrgChartEntry,
  EMPLOYMENT_TYPES,
  updateOrgChartEntry,
  uploadOrgChartPhoto,
} from "../../../utils/orgChart";

const initialForm = {
  name: "",
  position: "",
  responsibilities: "",
  employmentType: "regular",
  parentId: "",
  sortOrder: "0",
  photoUrl: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const AddOrgChartModal = ({
  isOpen,
  onClose,
  onSuccess,
  editEntry = null,
  entries = [],
}) => {
  const isEditMode = Boolean(editEntry);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && editEntry) {
      setForm({
        name: editEntry.name ?? "",
        position: editEntry.position ?? "",
        responsibilities: editEntry.responsibilities ?? "",
        employmentType: editEntry.employmentType ?? "regular",
        parentId: editEntry.parentId != null ? String(editEntry.parentId) : "",
        sortOrder: String(editEntry.sortOrder ?? 0),
        photoUrl: editEntry.photoUrl ?? "",
      });
    } else {
      setForm(initialForm);
    }
  }, [isOpen, isEditMode, editEntry]);

  const parentOptions = useMemo(() => {
    if (!isEditMode || !editEntry) return entries;
    const blocked = collectDescendantIds(entries, editEntry.id);
    return entries.filter((entry) => !blocked.has(String(entry.id)));
  }, [entries, isEditMode, editEntry]);

  if (!isOpen) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    const { url, error } = await uploadOrgChartPhoto(file);
    setUploading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setForm((prev) => ({ ...prev, photoUrl: url ?? "" }));
  };

  const handleClose = () => {
    if (loading || uploading) return;
    setForm(initialForm);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;

    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    if (!form.position.trim()) {
      toast.error("Position is required.");
      return;
    }

    setLoading(true);

    const { error } = isEditMode
      ? await updateOrgChartEntry(editEntry.id, form)
      : await createOrgChartEntry(form);

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEditMode ? "Entry updated." : "Entry added.");
    setForm(initialForm);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="org-chart-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="org-chart-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              {isEditMode ? "Edit org chart entry" : "Add org chart entry"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Photo, name, position, and responsibilities.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading || uploading}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {form.photoUrl ? (
                <img
                  src={form.photoUrl}
                  alt="Personnel"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-medium text-slate-400">
                  No photo
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? "Uploading…" : "Upload photo"}
              </label>
              {form.photoUrl && (
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                  className="block text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="org-chart-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="org-chart-name"
              type="text"
              required
              value={form.name}
              onChange={setField("name")}
              placeholder="e.g. BERNARDO T. CARINGAL or VACANT"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="org-chart-position"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Position
            </label>
            <input
              id="org-chart-position"
              type="text"
              required
              value={form.position}
              onChange={setField("position")}
              placeholder="e.g. Provincial Science and Technology Director"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="org-chart-responsibilities"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Responsibilities
            </label>
            <textarea
              id="org-chart-responsibilities"
              rows={4}
              value={form.responsibilities}
              onChange={setField("responsibilities")}
              placeholder="e.g. TSD and FAD; Focal Digital Transformation Sector"
              className={`${inputClass} resize-y`}
            />
          </div>

          <div>
            <label
              htmlFor="org-chart-parent"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Reports to
            </label>
            <select
              id="org-chart-parent"
              value={form.parentId}
              onChange={setField("parentId")}
              className={inputClass}
            >
              <option value="">None (top of chart)</option>
              {parentOptions.map((entry) => (
                <option key={entry.id} value={String(entry.id)}>
                  {entry.name} — {entry.position}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="org-chart-employment"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Employment type
              </label>
              <select
                id="org-chart-employment"
                value={form.employmentType}
                onChange={setField("employmentType")}
                className={inputClass}
              >
                {EMPLOYMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="org-chart-sort"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Sort order
              </label>
              <input
                id="org-chart-sort"
                type="number"
                value={form.sortOrder}
                onChange={setField("sortOrder")}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Left-to-right placement among co-workers on the same level.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || uploading}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : isEditMode ? "Save changes" : "Add entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrgChartModal;
