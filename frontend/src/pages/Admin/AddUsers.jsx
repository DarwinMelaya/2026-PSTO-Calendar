import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import AddUserModal from "../../components/Modals/AdminModals/AddUserModal";
import Layout from "../../components/Layout/Layout";
import { listProfiles } from "../../utils/profile";

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
    ? "bg-purple-100 text-purple-800"
    : "bg-slate-100 text-slate-700";

const AddUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage user accounts in the system
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add user
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Code name
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Role
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No users yet. Click &quot;Add user&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-800">{user.email}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {user.code_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadUsers}
      />
    </Layout>
  );
};

export default AddUsers;
