import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddUserModal from "../../components/Modals/AdminModals/AddUserModal";
import EditModal from "../../components/Modals/AdminModals/EditModal";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  ProgressRing,
  StatCard,
  ListSkeleton,
} from "../../components/User/UserWorkspaceUI";
import { exportUsersToPdf } from "../../utils/exportUsersPdf";
import { deleteProfile, listProfiles } from "../../utils/profile";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const roleBadgeClass = (role) => {
  if (role === "admin") {
    return "bg-violet-50 text-violet-800 ring-violet-600/15";
  }
  if (role === "viewer") {
    return "bg-sky-50 text-sky-800 ring-sky-600/15";
  }
  return "bg-slate-100 text-slate-700 ring-slate-600/10";
};

function initials(user) {
  const base = user.name?.trim() || user.email?.trim() || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

const AddUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const blob = [
        u.name,
        u.email,
        u.code_name,
        u.role,
        u.created_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [users, searchQuery]);

  const stats = useMemo(() => {
    const list = users;
    return {
      total: list.length,
      admins: list.filter((u) => u.role === "admin").length,
      staff: list.filter((u) => u.role === "user").length,
      viewers: list.filter((u) => u.role === "viewer").length,
    };
  }, [users]);

  const adminPercent = useMemo(() => {
    if (!stats.total) return 0;
    return Math.round((stats.admins / stats.total) * 100);
  }, [stats.admins, stats.total]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

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

  const handleExportPdf = () => {
    if (loading) return;
    if (users.length === 0) {
      toast.error("No users to export.");
      return;
    }

    setExportingPdf(true);
    try {
      exportUsersToPdf({ users, stats });
      toast.success("PDF downloaded.");
    } catch (err) {
      toast.error(err?.message ?? "Failed to export PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 bg-gradient-to-b from-slate-50/80 via-transparent to-violet-50/30 pb-10 sm:space-y-8">
        {/* Hero */}
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 px-6 py-8 shadow-2xl shadow-violet-900/30 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-violet-50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-300" />
                </span>
                PSTO Calendar · Team directory
              </div>
              <div>
                <p className="text-sm font-medium text-violet-100/90">
                  {getGreeting()}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  User management
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-violet-100/85 sm:text-base">
                  Invite teammates, assign roles, and keep profiles aligned with
                  task assignments.{" "}
                  <span className="text-white/90">{todayLabel}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!loading && stats.admins > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-400/25 px-3 py-1 text-xs font-semibold text-violet-50 ring-1 ring-violet-300/30">
                    {stats.admins} administrator
                    {stats.admins === 1 ? "" : "s"}
                  </span>
                ) : null}
                {!loading && stats.staff > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                    {stats.staff} standard account
                    {stats.staff === 1 ? "" : "s"}
                  </span>
                ) : null}
                {!loading && searchQuery ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-50 ring-1 ring-cyan-300/30">
                    {filteredUsers.length} shown
                  </span>
                ) : null}
              </div>
              <label className="relative block max-w-xl">
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, code name, role…"
                  className="w-full rounded-xl border border-white/20 bg-white/95 py-3 pl-10 pr-10 text-sm text-slate-800 shadow-lg outline-none placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-white/40"
                />
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </label>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col lg:items-end">
              <ProgressRing percent={adminPercent} loading={loading} />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-lg shadow-violet-950/20 transition hover:bg-violet-50 hover:shadow-xl"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Add user
                </button>
                <button
                  type="button"
                  onClick={loadUsers}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
                >
                  <svg
                    className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="ut-animate-in ut-delay-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total users"
            value={loading ? "…" : stats.total}
            accent="slate"
            sublabel="Organization members"
          />
          <StatCard
            label="Administrators"
            value={loading ? "…" : stats.admins}
            accent="violet"
            sublabel="Full access"
          />
          <StatCard
            label="Standard accounts"
            value={loading ? "…" : stats.staff}
            accent="blue"
            sublabel="Task assignees"
          />
          <StatCard
            label="Viewers"
            value={loading ? "…" : stats.viewers}
            accent="sky"
            sublabel="Read-only access"
          />
        </div>

        {/* Directory */}
        <section className="ut-animate-in ut-delay-2 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
          <PanelHeader
            iconGradient="bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.813-3.926M18 12a6 6 0 11-12 0 6 6 0 0112 0zm-7.5-3c-.967 0-1.911.238-2.75.682v6.616c.839.444 1.783.682 2.75.682s1.911-.238 2.75-.682V9.682C13.411 9.238 12.467 9 11.5 9z"
                />
              </svg>
            }
            title="Directory"
            subtitle={
              loading
                ? "Fetching accounts…"
                : `${filteredUsers.length} shown · ${users.length} total`
            }
            action={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={loading || exportingPdf || users.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 01-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  {exportingPdf ? "Exporting…" : "Export PDF"}
                </button>
                {!loading && users.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                    Live list
                  </span>
                ) : null}
              </div>
            }
          />

          <div className="overflow-x-auto bg-slate-50/30 p-2 sm:p-3">
            <table className="w-full min-w-[880px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap rounded-l-xl bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    User
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Code name
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Role
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Joined
                  </th>
                  <th className="whitespace-nowrap rounded-r-xl bg-slate-900 px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-white sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8">
                      <ListSkeleton rows={4} />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          No users yet
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Add your first account to unlock assignments and
                          calendar access for your team.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddModalOpen(true)}
                          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 hover:from-violet-700 hover:to-indigo-700"
                        >
                          Add first user
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration variant="filter" />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          No matches found
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Try a different search term.
                        </p>
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="mt-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-violet-700 hover:to-indigo-700"
                        >
                          Clear search
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="group">
                      <td className="rounded-l-xl border border-r-0 border-slate-200/80 bg-white px-5 py-4 shadow-sm transition group-hover:shadow-md sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-50 text-xs font-bold text-violet-800 ring-1 ring-violet-200/80"
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
                      <td className="border-y border-slate-200/80 bg-white px-5 py-4 shadow-sm sm:px-6">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5">
                          {user.code_name?.trim() || "—"}
                        </span>
                      </td>
                      <td className="border-y border-slate-200/80 bg-white px-5 py-4 shadow-sm sm:px-6">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${roleBadgeClass(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-y border-slate-200/80 bg-white px-5 py-4 text-slate-600 shadow-sm sm:px-6">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="whitespace-nowrap rounded-r-xl border border-l-0 border-slate-200/80 bg-white px-5 py-4 text-right shadow-sm sm:px-6">
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
