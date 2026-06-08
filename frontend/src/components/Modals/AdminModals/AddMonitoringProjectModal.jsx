import { useState } from "react";
import toast from "react-hot-toast";
import { getSession } from "../../../utils/session";
import {
  PROJECT_PROGRAMS,
  createMonitoringProject,
} from "../../../utils/projectTimeline";

const initialForm = {
  program: "CEST",
  title: "",
  location: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const AddMonitoringProjectModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

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

    const { program, title, location } = form;

    if (!title.trim()) {
      toast.error("Project title is required.");
      return;
    }

    setLoading(true);
    const session = getSession();
    const { data, error } = await createMonitoringProject({
      program,
      title,
      location,
      createdBy: session?.id ?? null,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Project created.");
    setForm(initialForm);
    onSuccess(data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-monitoring-project-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="add-monitoring-project-title"
          className="text-xl font-bold text-slate-900"
        >
          New project
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Add a project under SETUP, GIA, SSCP, or CEST to start logging updates.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="mp-program"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Program
            </label>
            <select
              id="mp-program"
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
              htmlFor="mp-title"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Project title
            </label>
            <input
              id="mp-title"
              type="text"
              value={form.title}
              onChange={setField("title")}
              placeholder="e.g. Automatic Flood Monitoring System for Boac River"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="mp-location"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Location
            </label>
            <input
              id="mp-location"
              type="text"
              value={form.location}
              onChange={setField("location")}
              placeholder="e.g. MarSU-Boac, Brgy. Tanza, Boac, Marinduque"
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
              {loading ? "Saving…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMonitoringProjectModal;
