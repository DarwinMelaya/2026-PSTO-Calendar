import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import PasswordInput from "../../components/Auth/PasswordInput";
import { getProfileById, updateProfile } from "../../utils/profile";
import { getSession, setSession } from "../../utils/session";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const UserProfile = () => {
  const session = getSession();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    codeName: "",
    password: "",
    confirmPassword: "",
  });

  const loadProfile = useCallback(async () => {
    if (!session?.id) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const { data, error } = await getProfileById(session.id);
    setLoadingProfile(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data) {
      toast.error("Profile not found.");
      return;
    }

    setForm({
      email: data.email ?? "",
      name: data.name ?? "",
      codeName: data.code_name ?? "",
      password: "",
      confirmPassword: "",
    });
  }, [session?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving || !session?.id) return;

    const { email, name, codeName, password, confirmPassword } = form;

    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }

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

    setSaving(true);

    const { data, error } = await updateProfile({
      id: session.id,
      email: email.trim(),
      name: name.trim() || null,
      codeName: codeName.trim(),
      role: session.role,
      password: password.trim() || undefined,
    });

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("This email is already registered.");
        return;
      }
      toast.error(error.message);
      return;
    }

    if (data) {
      setSession(data);
    }

    setForm((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));

    toast.success("Profile updated successfully.");
  };

  if (!session?.id) {
    return (
      <Layout>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            You must be logged in to view your profile.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My profile
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Update your email, name, code name, or password.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loadingProfile ? (
            <p className="text-sm text-slate-500">Loading profile…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={setField("email")}
                  disabled={saving}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={setField("name")}
                  disabled={saving}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-codeName"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Code name
                </label>
                <input
                  id="profile-codeName"
                  type="text"
                  required
                  value={form.codeName}
                  onChange={setField("codeName")}
                  disabled={saving}
                  placeholder="Your display code name"
                  className={inputClass}
                />
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h2 className="text-sm font-semibold text-slate-900">
                  Change password
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Leave blank to keep your current password.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="profile-password"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      New password
                    </label>
                    <PasswordInput
                      id="profile-password"
                      value={form.password}
                      onChange={setField("password")}
                      placeholder="At least 6 characters"
                      disabled={saving}
                      required={false}
                      minLength={0}
                      inputClassName="rounded-xl"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-confirmPassword"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Confirm new password
                    </label>
                    <PasswordInput
                      id="profile-confirmPassword"
                      value={form.confirmPassword}
                      onChange={setField("confirmPassword")}
                      placeholder="Re-enter new password"
                      disabled={saving}
                      required={false}
                      minLength={0}
                      inputClassName="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={loadProfile}
                  disabled={saving || loadingProfile}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving || loadingProfile}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
