import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import UserCtoRequestModal from "../../components/Modals/UserModals/UserCtoRequestModal";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  StatCard,
  TableSkeleton,
} from "../../components/User/UserWorkspaceUI";
import {
  CTO_STATUSES,
  deleteCtoEntry,
  formatCtoDate,
  formatDuration,
  listCtoEntries,
  recomputeBalances,
} from "../../utils/cto";
import { getSession } from "../../utils/session";

const statusBadge = (status) => {
  switch (status) {
    case CTO_STATUSES.PENDING:
      return "bg-amber-50 text-amber-800 ring-amber-600/15";
    case CTO_STATUSES.REJECTED:
      return "bg-rose-50 text-rose-800 ring-rose-600/15";
    default:
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/15";
  }
};

const statusLabel = (status) => {
  switch (status) {
    case CTO_STATUSES.PENDING:
      return "Pending approval";
    case CTO_STATUSES.REJECTED:
      return "Rejected";
    default:
      return "Approved";
  }
};

const UserCto = () => {
  const session = getSession();
  const profileId = session?.id;

  const [approvedEntries, setApprovedEntries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadApproved = useCallback(async () => {
    if (!profileId) {
      setApprovedEntries([]);
      setLoadingApproved(false);
      return;
    }

    setLoadingApproved(true);
    const { data, error } = await listCtoEntries({
      profileId,
      status: CTO_STATUSES.APPROVED,
    });
    setLoadingApproved(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setApprovedEntries(recomputeBalances(data ?? []));
  }, [profileId]);

  const loadRequests = useCallback(async () => {
    if (!profileId) {
      setRequests([]);
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    const { data, error } = await listCtoEntries({
      profileId,
      statuses: [CTO_STATUSES.PENDING, CTO_STATUSES.REJECTED],
      includeAllStatuses: true,
    });
    setLoadingRequests(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRequests(data ?? []);
  }, [profileId]);

  const refresh = useCallback(() => {
    loadApproved();
    loadRequests();
  }, [loadApproved, loadRequests]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const balance = useMemo(() => {
    const totalMinutes = approvedEntries.reduce(
      (sum, e) =>
        sum +
        (Number(e.balanceHours) || 0) * 60 +
        (Number(e.balanceMinutes) || 0),
      0,
    );
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    };
  }, [approvedEntries]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === CTO_STATUSES.PENDING).length,
    [requests],
  );

  const handleCancelRequest = async (entry) => {
    if (entry.status !== CTO_STATUSES.PENDING) return;
    if (!window.confirm("Cancel this pending CTO request?")) return;

    setCancellingId(entry.id);
    const { error } = await deleteCtoEntry(entry.id);
    setCancellingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Request cancelled.");
    refresh();
  };

  const handleDeleteApproved = async (entry) => {
    if (!window.confirm("Delete this approved CTO entry? This cannot be undone.")) return;

    setDeletingId(entry.id);
    const { error } = await deleteCtoEntry(entry.id);
    setDeletingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Entry deleted.");
    refresh();
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

  const codeName = session?.code_name?.trim() || session?.name?.trim();

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="ut-animate-in overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-teal-50/40 p-6 shadow-xl shadow-slate-300/20 ring-1 ring-slate-900/[0.04] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">{todayLabel}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {getGreeting()}
                {codeName ? `, ${codeName}` : ""}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                View your approved CTO balance and submit overtime requests for
                admin approval.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                disabled={!profileId}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:from-teal-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit CTO request
              </button>
            </div>
          </div>
        </section>

        <div className="ut-animate-in ut-delay-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Current balance"
            value={
              loadingApproved
                ? "…"
                : formatDuration(balance.hours, balance.minutes)
            }
            accent="emerald"
            sublabel="Approved entries only"
          />
          <StatCard
            label="Approved entries"
            value={loadingApproved ? "…" : approvedEntries.length}
            accent="slate"
            sublabel="In your CTO ledger"
          />
          <StatCard
            label="Pending requests"
            value={loadingRequests ? "…" : pendingCount}
            accent="amber"
            sublabel="Awaiting admin review"
          />
        </div>

        {(requests.length > 0 || loadingRequests) && (
          <section className="ut-animate-in ut-delay-1 overflow-hidden rounded-3xl border border-amber-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04]">
            <PanelHeader
              iconGradient="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/25"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="My requests"
              subtitle="Pending and rejected submissions"
            />

            <div className="overflow-x-auto bg-slate-50/30 p-2 sm:p-3">
              {loadingRequests ? (
                <div className="px-6 py-8">
                  <TableSkeleton rows={2} />
                </div>
              ) : (
                <table className="w-full min-w-[800px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr>
                      <th className="rounded-l-xl bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                        Status
                      </th>
                      <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                        Date
                      </th>
                      <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                        Particulars
                      </th>
                      <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                        Overtime
                      </th>
                      <th className="rounded-r-xl bg-slate-900 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((entry) => (
                      <tr key={entry.id}>
                        <td className="rounded-l-xl bg-white px-4 py-4 ring-1 ring-slate-200/80">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusBadge(entry.status)}`}
                          >
                            {statusLabel(entry.status)}
                          </span>
                          {entry.status === CTO_STATUSES.REJECTED &&
                            entry.rejectionReason && (
                              <p className="mt-2 text-xs text-rose-600">
                                {entry.rejectionReason}
                              </p>
                            )}
                        </td>
                        <td className="bg-white px-4 py-4 font-medium text-slate-900 ring-1 ring-slate-200/80">
                          {formatCtoDate(entry.entryDate)}
                        </td>
                        <td className="max-w-xs bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                          <p className="line-clamp-3 whitespace-pre-wrap">
                            {entry.particulars}
                          </p>
                        </td>
                        <td className="whitespace-nowrap bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                          {formatDuration(
                            entry.overtimeHours,
                            entry.overtimeMinutes,
                          )}
                        </td>
                        <td className="rounded-r-xl bg-white px-4 py-4 text-right ring-1 ring-slate-200/80">
                          {entry.status === CTO_STATUSES.PENDING ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(entry)}
                              disabled={cancellingId === entry.id}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {cancellingId === entry.id
                                ? "Cancelling…"
                                : "Cancel"}
                            </button>
                          ) : entry.status === CTO_STATUSES.REJECTED ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteApproved(entry)}
                              disabled={deletingId === entry.id}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deletingId === entry.id ? "Deleting…" : "Delete"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        <section className="ut-animate-in ut-delay-2 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
          <PanelHeader
            iconGradient="bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="My CTO ledger"
            subtitle={`${approvedEntries.length} approved ${approvedEntries.length === 1 ? "entry" : "entries"}`}
          />

          <div className="overflow-x-auto bg-slate-50/30 p-2 sm:p-3">
            {loadingApproved ? (
              <div className="px-6 py-8">
                <TableSkeleton rows={4} />
              </div>
            ) : approvedEntries.length === 0 ? (
              <div className="px-6 py-20">
                <div className="mx-auto flex max-w-md flex-col items-center text-center">
                  <EmptyIllustration />
                  <p className="mt-6 text-lg font-bold text-slate-900">
                    No approved CTO entries yet
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Submit a request and an admin will review it before it
                    appears here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:from-teal-700 hover:to-emerald-700"
                  >
                    Submit first request
                  </button>
                </div>
              </div>
            ) : (
              <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr>
                    <th className="rounded-l-xl bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                      Date
                    </th>
                    <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                      Particulars
                    </th>
                    <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                      Overtime
                    </th>
                    <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                      Offset date
                    </th>
                    <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                      Offset
                    </th>
                    <th className="bg-slate-900 px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-white">
                      Balance
                    </th>
                    <th className="rounded-r-xl bg-slate-900 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {approvedEntries.map((entry) => (
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
                        {formatDuration(
                          entry.overtimeHours,
                          entry.overtimeMinutes,
                        )}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                        {formatCtoDate(entry.offsetDate)}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-4 text-slate-700 ring-1 ring-slate-200/80">
                        {formatDuration(entry.offsetHours, entry.offsetMinutes)}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-4 font-semibold text-emerald-800 ring-1 ring-slate-200/80">
                        {formatDuration(
                          entry.balanceHours,
                          entry.balanceMinutes,
                        )}
                      </td>
                      <td className="rounded-r-xl bg-white px-4 py-4 text-right ring-1 ring-slate-200/80">
                        <button
                          type="button"
                          onClick={() => handleDeleteApproved(entry)}
                          disabled={deletingId === entry.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {deletingId === entry.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <UserCtoRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={refresh}
        profileId={profileId}
      />
    </Layout>
  );
};

export default UserCto;
