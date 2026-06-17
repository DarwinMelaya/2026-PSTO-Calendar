import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  createAdminLink,
  updateAdminLink,
} from "../../../utils/adminLinks";

const initialForm = {
  name: "",
  url: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const AdminLinkModal = ({
  isOpen,
  onClose,
  onSuccess,
  editLink = null,
}) => {
  const isEditMode = Boolean(editLink);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && editLink) {
      setForm({
        name: editLink.name ?? "",
        url: editLink.url ?? "",
      });
    } else {
      setForm(initialForm);
    }
  }, [isOpen, isEditMode, editLink]);

  if (!isOpen) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleClose = () => {
    if (loading) return;
    setForm(initialForm);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const { name, url } = form;

    if (!name.trim()) {
      toast.error("Name of link is required.");
      return;
    }

    if (!url.trim()) {
      toast.error("Link URL is required.");
      return;
    }

    setLoading(true);

    const { error } = isEditMode
      ? await updateAdminLink(editLink.id, { name, url })
      : await createAdminLink({ name, url });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEditMode ? "Link updated." : "Link added.");
    setForm(initialForm);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-link-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="admin-link-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              {isEditMode ? "Edit link" : "Add link"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? "Update the link name or URL"
                : "Save a named link for quick access"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="admin-link-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Name of link
            </label>
            <input
              id="admin-link-name"
              type="text"
              required
              value={form.name}
              onChange={setField("name")}
              placeholder="e.g. DOST Region 10 Portal"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="admin-link-url"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Link
            </label>
            <input
              id="admin-link-url"
              type="url"
              required
              value={form.url}
              onChange={setField("url")}
              placeholder="https://example.com"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              You can paste a full URL or just the domain (https:// is added automatically).
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : isEditMode ? "Save changes" : "Add link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLinkModal;
