import { useState } from "react";
import toast from "react-hot-toast";
import PasswordInput from "../../Auth/PasswordInput";
import { createProfile, ROLE_OPTIONS } from "../../../utils/profile";

const initialForm = {
  email: "",
  name: "",
  codeName: "",
  password: "",
  confirmPassword: "",
  role: "user",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
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

    const { email, name, codeName, password, confirmPassword, role } = form;

    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (!codeName.trim()) {
      toast.error("Code name is required.");
      return;
    }

    setLoading(true);

    const { error } = await createProfile({
      email: email.trim(),
      name: name.trim(),
      codeName: codeName.trim(),
      password,
      role,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("This email is already registered.");
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.success("User created successfully.");
    setForm(initialForm);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-user-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-user-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Add user
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a new user account
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
              htmlFor="modal-user-email"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="modal-user-email"
              type="email"
              required
              value={form.email}
              onChange={setField("email")}
              placeholder="user@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="modal-user-name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Name
            </label>
            <input
              id="modal-user-name"
              type="text"
              required
              value={form.name}
              onChange={setField("name")}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="modal-user-codeName"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Code name
            </label>
            <input
              id="modal-user-codeName"
              type="text"
              required
              value={form.codeName}
              onChange={setField("codeName")}
              placeholder="Display code name"
              className={inputClass}
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">
              Role
            </span>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    form.role === value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="modal-user-role"
                    value={value}
                    checked={form.role === value}
                    onChange={setField("role")}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="modal-user-password"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Password
            </label>
            <PasswordInput
              id="modal-user-password"
              value={form.password}
              onChange={setField("password")}
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label
              htmlFor="modal-user-confirmPassword"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Confirm password
            </label>
            <PasswordInput
              id="modal-user-confirmPassword"
              value={form.confirmPassword}
              onChange={setField("confirmPassword")}
              placeholder="Re-enter password"
            />
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
              {loading ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
