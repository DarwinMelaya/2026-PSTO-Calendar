import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddUserModal from "../../components/Modals/AdminModals/AddUserModal";
import EditModal from "../../components/Modals/AdminModals/EditModal";
import Layout from "../../components/Layout/Layout";
import { deleteProfile, listProfiles } from "../../utils/profile";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const roleBadgeClass = (role) =>
  role === "admin"
    ? "bg-violet-50 text-violet-800 ring-violet-600/15"
    : "bg-slate-100 text-slate-700 ring-slate-600/10";

function initials(user) {
  const base = user.name?.trim() || user.email?.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

function StatCard({ label, value, accent }) {
  const accents = {
    slate: "from-slate-50 to-white ring-slate-200/80",
    violet: "from-violet-50/80 to-white ring-violet-200/60",
    blue: "from-blue-50/80 to-white ring-blue-200/60",
  };
  return (
    <div
      className={`rounded-xl bg-gradient-to-br p-4 shadow-sm ring-1 ${accents[accent] ?? accents.slate}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

const AddUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listProfiles();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setUsers(data ?? []);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    const list = users;
    return {
      total: list.length,
      admins: list.filter((u) => u.role === "admin").length,
      staff: list.filter((u) => u.role !== "admin").length,
    };
  }, [users]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setEditingUser(null);
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Delete user "${user.email}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(user.id);

    const { error } = await deleteProfile(user.id);

    setDeletingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("User deleted successfully.");
    loadUsers();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Admin
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Users
            </h1>
            <p className="max-w-xl text-base text-slate-600 leading-relaxed">
              Invite teammates, assign roles, and keep profile details aligned
              with your calendar workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add user
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total users"
            value={loading ? "…" : stats.total}
            accent="slate"
          />
          <StatCard
            label="Administrators"
            value={loading ? "…" : stats.admins}
            accent="violet"
          />
          <StatCard
            label="Standard accounts"
            value={loading ? "…" : stats.staff}
            accent="blue"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-900/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Directory
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading
                  ? "Fetching accounts…"
                  : `${users.length} member${users.length === 1 ? "" : "s"} in your organization`}
              </p>
            </div>
            {!loading && users.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                Live list
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    User
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Code name
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Role
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Joined
                  </th>
                  <th className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div
                          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
                          aria-hidden
                        />
                        <p className="text-sm font-medium text-slate-600">
                          Loading users…
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                          <svg
                            className="h-7 w-7"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.813-3.926M18 12a6 6 0 11-12 0 6 6 0 0112 0zm-7.5-3c-.967 0-1.911.238-2.75.682v6.616c.839.444 1.783.682 2.75.682s1.911-.238 2.75-.682V9.682C13.411 9.238 12.467 9 11.5 9z"
                            />
                          </svg>
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-900">
                          No users yet
                        </p>
                        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                          Add your first account to unlock assignments and
                          calendar access for your team.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddModalOpen(true)}
                          className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
                        >
                          Add first user
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50/90"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-xs font-bold text-slate-700 ring-1 ring-slate-200/80"
                            aria-hidden
                          >
                            {initials(user)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {user.name?.trim() || "No name"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                          {user.code_name?.trim() || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${roleBadgeClass(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 sm:px-6">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(user)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === user.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddUserModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadUsers}
      />

      <EditModal
        isOpen={editModalOpen}
        user={editingUser}
        onClose={handleCloseEdit}
        onSuccess={loadUsers}
      />
    </Layout>
  );
};

export default AddUsers;
