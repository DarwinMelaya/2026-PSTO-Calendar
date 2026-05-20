import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PasswordInput from "../../Auth/PasswordInput";
import { updateProfile } from "../../../utils/profile";
import { clearSession } from "../../../utils/session";

const ROLES = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const EditModal = ({ isOpen, user, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    codeName: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      email: user.email ?? "",
      codeName: user.code_name ?? "",
      password: "",
      confirmPassword: "",
      role: user.role ?? "user",
    });
  }, [user]);

  if (!isOpen || !user) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleLogout = () => {
    if (loading) return;
    clearSession();
    toast.success("Logged out successfully.");
    onClose();
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const { email, codeName, password, confirmPassword, role } = form;

    if (!codeName.trim()) {
      toast.error("Code name is required.");
      return;
    }

    if (password.trim()) {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
    } else if (confirmPassword.trim()) {
      toast.error("Enter a new password or clear the confirm field.");
      return;
    }

    setLoading(true);

    const { error } = await updateProfile({
      id: user.id,
      email: email.trim(),
      codeName: codeName.trim(),
      role,
      password: password.trim() || undefined,
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

    toast.success("User updated successfully.");
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-modal-title"
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
              id="edit-user-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Edit user
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update account details for {user.email}
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
              htmlFor="edit-user-email"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="edit-user-email"
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
              htmlFor="edit-user-codeName"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Code name
            </label>
            <input
              id="edit-user-codeName"
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
              {ROLES.map(({ value, label }) => (
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
                    name="edit-user-role"
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
              htmlFor="edit-user-password"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              New password{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <PasswordInput
              id="edit-user-password"
              value={form.password}
              onChange={setField("password")}
              placeholder="Leave blank to keep current"
              required={false}
              minLength={0}
            />
          </div>

          <div>
            <label
              htmlFor="edit-user-confirmPassword"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Confirm new password{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <PasswordInput
              id="edit-user-confirmPassword"
              value={form.confirmPassword}
              onChange={setField("confirmPassword")}
              placeholder="Re-enter new password"
              required={false}
              minLength={0}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Log out
            </button>
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
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;
