import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  PROJECT_PROGRAMS,
  updateMonitoringProject,
} from "../../../utils/projectTimeline";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const EditMonitoringProjectModal = ({ isOpen, project, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    program: "CEST",
    title: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!project) return;
    setForm({
      program: project.program ?? "CEST",
      title: project.title ?? "",
      location: project.location ?? "",
    });
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!form.title.trim()) {
      toast.error("Project title is required.");
      return;
    }

    setLoading(true);
    const { error } = await updateMonitoringProject(project.id, form);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Project updated.");
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-monitoring-project-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="edit-monitoring-project-title"
          className="text-xl font-bold text-slate-900"
        >
          Edit project
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="edit-mp-program"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Program
            </label>
            <select
              id="edit-mp-program"
              value={form.program}
              onChange={setField("program")}
              className={inputClass}
              required
            >
              {PROJECT_PROGRAMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-mp-title"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Project title
            </label>
            <input
              id="edit-mp-title"
              type="text"
              value={form.title}
              onChange={setField("title")}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-mp-location"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Location
            </label>
            <input
              id="edit-mp-location"
              type="text"
              value={form.location}
              onChange={setField("location")}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMonitoringProjectModal;
