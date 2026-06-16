import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddCtoModal from "../../components/Modals/AdminModals/AddCtoModal";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  StatCard,
  TableSkeleton,
} from "../../components/User/UserWorkspaceUI";
import {
  deleteCtoEntry,
  formatCtoDate,
  formatDuration,
  getLatestCtoBalance,
  listCtoEntries,
  listCtoProfiles,
} from "../../utils/cto";

const profileLabel = (profile) =>
  profile?.code_name?.trim() ||
  profile?.name?.trim() ||
  profile?.email?.trim() ||
  (profile?.id ? `User #${profile.id}` : "—");

const AddCto = () => {
  const [profiles, setProfiles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [latestBalance, setLatestBalance] = useState({ hours: 0, minutes: 0 });
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const { data, error } = await listCtoProfiles();
    setLoadingProfiles(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setProfiles(data ?? []);
  }, []);

  const loadEntries = useCallback(async (profileId) => {
    if (!profileId) {
      setEntries([]);
      setLatestBalance({ hours: 0, minutes: 0 });
      return;
    }

    setLoadingEntries(true);
    const [{ data, error }, balanceResult] = await Promise.all([
      listCtoEntries({ profileId }),
      getLatestCtoBalance(profileId),
    ]);
    setLoadingEntries(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (balanceResult.error) {
      toast.error(balanceResult.error.message);
    }

    setEntries(data ?? []);
    setLatestBalance(balanceResult.data ?? { hours: 0, minutes: 0 });
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    loadEntries(selectedProfileId);
  }, [selectedProfileId, loadEntries]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => String(p.id) === String(selectedProfileId)) ?? null,
    [profiles, selectedProfileId],
  );

  const stats = useMemo(
    () => ({
      people: profiles.length,
      entries: entries.length,
      currentBalance: latestBalance,
    }),
    [profiles.length, entries.length, latestBalance],
  );

  const handleDelete = async (entry) => {
    if (!window.confirm("Delete this CTO entry? This cannot be undone.")) {
      return;
    }

    setDeletingId(entry.id);
    const { error } = await deleteCtoEntry(entry.id);
    setDeletingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Entry deleted.");
    loadEntries(selectedProfileId);
  };

  const handleEntryAdded = () => {
    loadEntries(selectedProfileId);
  };

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

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="ut-animate-in overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-teal-50/40 p-6 shadow-xl shadow-slate-300/20 ring-1 ring-slate-900/[0.04] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">{todayLabel}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {getGreeting()}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Manage compensatory time off per person. Each profile has its own
                CTO ledger linked from the team directory.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  loadProfiles();
                  loadEntries(selectedProfileId);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                disabled={!profiles.length}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:from-teal-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add CTO entry
              </button>
            </div>
          </div>
        </section>

        <div className="ut-animate-in ut-delay-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Team members"
            value={loadingProfiles ? "…" : stats.people}
            accent="slate"
            sublabel="Profiles with CTO records"
          />
          <StatCard
            label="Entries shown"
            value={loadingEntries ? "…" : stats.entries}
            accent="emerald"
            sublabel={
              selectedProfile
                ? profileLabel(selectedProfile)
                : "Select a person below"
            }
          />
          <StatCard
            label="Current balance"
            value={
              loadingEntries || !selectedProfileId
                ? "…"
                : formatDuration(
                    stats.currentBalance.hours,
                    stats.currentBalance.minutes,
                  )
            }
            accent="emerald"
            sublabel="Latest running balance"
          />
        </div>

        <section className="ut-animate-in ut-delay-2 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
          <PanelHeader
            iconGradient="bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25"
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
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="CTO ledger"
            subtitle={
              selectedProfile
                ? `${profileLabel(selectedProfile)} · ${entries.length} entries`
                : "Choose a person to view their CTO records"
            }
            action={
              <div className="min-w-[220px]">
                <label htmlFor="cto-person-filter" className="sr-only">
                  Select person
                </label>
                <select
                  id="cto-person-filter"
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  disabled={loadingProfiles}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                >
                  <option value="">Select person…</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profileLabel(profile)}
                    </option>
                  ))}
                </select>
              </div>
            }
          />

          <div className="overflow-x-auto bg-slate-50/30 p-2 sm:p-3">
            <table className="w-full min-w-[1100px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap rounded-l-xl bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                    Date
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                    Particulars
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                    Overtime
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                    Offset date
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                    Offset
                  </th>
                  <th className="whitespace-nowrap bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                    Balance
                  </th>
                  <th className="whitespace-nowrap rounded-r-xl bg-slate-900 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {!selectedProfileId ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          Select a person
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Each team member has a separate CTO ledger linked to
                          their profile.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : loadingEntries ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8">
                      <TableSkeleton rows={4} />
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20">
                      <div className="mx-auto flex max-w-md flex-col items-center text-center">
                        <EmptyIllustration />
                        <p className="mt-6 text-lg font-bold text-slate-900">
                          No CTO entries yet
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Add the first record for {profileLabel(selectedProfile)}.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddModalOpen(true)}
                          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:from-teal-700 hover:to-emerald-700"
                        >
                          Add first entry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="rounded-l-xl bg-white px-4 py-4 font-medium text-slate-900 ring-1 ring-slate-200/80">
                        {formatCtoDate(entry.entryDate)}
                      </td>
                      <td className="max-w-xs bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                        <p className="line-clamp-3 whitespace-pre-wrap">
                          {entry.particulars}
                        </p>
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                        {formatDuration(entry.overtimeHours, entry.overtimeMinutes)}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                        {formatCtoDate(entry.offsetDate)}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                        {formatDuration(entry.offsetHours, entry.offsetMinutes)}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-4 font-semibold text-emerald-800 ring-1 ring-slate-200/80">
                        {formatDuration(entry.balanceHours, entry.balanceMinutes)}
                      </td>
                      <td className="rounded-r-xl bg-white px-4 py-4 text-right ring-1 ring-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {deletingId === entry.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddCtoModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleEntryAdded}
        profiles={profiles}
        defaultProfileId={selectedProfileId}
        previousBalance={latestBalance}
      />
    </Layout>
  );
};

export default AddCto;
