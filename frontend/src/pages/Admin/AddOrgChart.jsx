import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddOrgChartModal from "../../components/Modals/AdminModals/AddOrgChartModal";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  StatCard,
} from "../../components/User/UserWorkspaceUI";
import {
  buildOrgTree,
  deleteOrgChartEntry,
  listOrgChart,
} from "../../utils/orgChart";

const bandClass = (type) =>
  type === "contractual"
    ? "bg-sky-400 text-slate-900"
    : "bg-amber-400 text-slate-900";

const PhotoFrame = ({ entry }) => {
  const isVacant = (entry.name || "").trim().toUpperCase() === "VACANT";

  if (entry.photoUrl) {
    return (
      <img
        src={entry.photoUrl}
        alt={entry.name}
        className="h-40 w-full bg-white object-cover object-top"
      />
    );
  }

  return (
    <div className="flex h-40 w-full items-center justify-center bg-white">
      {isVacant ? (
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Vacant
        </span>
      ) : (
        <svg
          className="h-14 w-14 text-slate-200"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z" />
        </svg>
      )}
    </div>
  );
};

const OrgNodeCard = ({ entry, onEdit, onDelete, isDeleting }) => (
  <div className="group relative w-52 overflow-hidden rounded-sm border border-slate-300 bg-[#f8f7f3] shadow-sm transition hover:shadow-lg">
    <PhotoFrame entry={entry} />

    <p className="border-t border-slate-200 px-2 py-1.5 text-center text-[11px] font-bold uppercase leading-tight tracking-tight text-slate-900">
      {entry.name}
    </p>

    <p
      className={`px-2 py-1 text-center text-[10px] font-bold leading-tight ${bandClass(entry.employmentType)}`}
    >
      {entry.position}
    </p>

    {entry.responsibilities ? (
      <p className="px-2 py-1.5 text-[9px] leading-snug text-slate-600">
        {entry.responsibilities}
      </p>
    ) : null}

    <div className="pointer-events-none absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
      <button
        type="button"
        onClick={() => onEdit(entry)}
        disabled={isDeleting}
        className="rounded border border-slate-300 bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onDelete(entry)}
        disabled={isDeleting}
        className="rounded border border-red-200 bg-white/95 px-2 py-1 text-[10px] font-bold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-50"
      >
        {isDeleting ? "…" : "Del"}
      </button>
    </div>
  </div>
);

const TreeNode = ({ node, onEdit, onDelete, deletingId }) => {
  const children = node.children ?? [];

  return (
    <li className="relative flex flex-col items-center px-3">
      <OrgNodeCard
        entry={node}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={deletingId === node.id}
      />

      {children.length > 0 && (
        <>
          <span className="h-8 w-px bg-slate-400" aria-hidden />
          <ul className="flex items-start justify-center">
            {children.map((child, i) => (
              <li key={child.id} className="relative pt-8">
                <span
                  className="absolute left-1/2 top-0 h-8 w-px bg-slate-400"
                  aria-hidden
                />
                {children.length > 1 && (
                  <span
                    className={`absolute top-0 h-px bg-slate-400 ${
                      i === 0
                        ? "left-1/2 right-0"
                        : i === children.length - 1
                          ? "left-0 right-1/2"
                          : "left-0 right-0"
                    }`}
                    aria-hidden
                  />
                )}
                <ul className="flex">
                  <TreeNode
                    node={child}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    deletingId={deletingId}
                  />
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  );
};

const SkeletonChart = () => (
  <div className="flex flex-col items-center gap-8 py-6">
    <div className="h-64 w-52 animate-pulse rounded-sm bg-slate-100" />
    <div className="flex gap-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-64 w-52 animate-pulse rounded-sm bg-slate-100"
        />
      ))}
    </div>
  </div>
);

const AddOrgChart = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listOrgChart();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries(data ?? []);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const tree = useMemo(() => buildOrgTree(entries), [entries]);

  const regularCount = useMemo(
    () => entries.filter((e) => e.employmentType === "regular").length,
    [entries],
  );
  const contractualCount = useMemo(
    () => entries.filter((e) => e.employmentType === "contractual").length,
    [entries],
  );

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

  const openAdd = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };
  const openEdit = (entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Delete "${entry.name}" (${entry.position})? Anyone reporting to them moves to the top of the chart.`,
    );
    if (!confirmed) return;
    setDeletingId(entry.id);
    const { error } = await deleteOrgChartEntry(entry.id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Entry deleted.");
    loadEntries();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 bg-gradient-to-b from-slate-50/80 via-transparent to-sky-50/30 pb-12 sm:space-y-8">
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-900 px-6 py-8 shadow-2xl shadow-blue-900/30 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                PSTO Calendar · Org Chart
              </div>
              <div>
                <p className="text-sm font-medium text-sky-100/90">
                  {getGreeting()}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Organizational chart
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-sky-100/85 sm:text-base">
                  Photo, name, position, and responsibilities per person —
                  arranged by reporting line.
                </p>
              </div>
              <p className="text-xs font-medium text-sky-200/80">{todayLabel}</p>
            </div>

            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xs lg:grid-cols-1">
              <StatCard
                label="Total personnel"
                value={loading ? "…" : String(entries.length)}
                sublabel="In org chart"
                accent="sky"
              />
              <StatCard
                label="Regular / Contractual"
                value={loading ? "…" : `${regularCount} / ${contractualCount}`}
                sublabel="Employment split"
                accent="amber"
              />
            </div>
          </div>
        </section>

        <section className="ut-animate-in ut-delay-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
          <PanelHeader
            iconGradient="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25"
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
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.98 5.98 0 00-.34-1.99m-12 .66a5.98 5.98 0 01-.34-1.99m0 0A5.869 5.869 0 0112 14.25c1.993 0 3.815.784 5.16 2.06"
                />
              </svg>
            }
            title="PSTO-Marinduque chart"
            subtitle="Hover a card to edit or delete. Set “Reports to” to place a person under someone."
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadEntries}
                  disabled={loading}
                  title="Refresh"
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40"
                >
                  <svg
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-blue-700 active:scale-95"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Add personnel
                </button>
              </div>
            }
          />

          <div className="p-5 sm:p-6">
            {loading && <SkeletonChart />}

            {!loading && entries.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <EmptyIllustration variant="empty" />
                <p className="mt-6 text-lg font-bold text-slate-900">
                  No org chart entries yet
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                  Start with the Provincial Director, then add everyone else
                  reporting under them.
                </p>
                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-blue-700"
                >
                  Add first personnel
                </button>
              </div>
            )}

            {!loading && entries.length > 0 && (
              <div className="overflow-x-auto pb-4">
                <div className="min-w-max px-4">
                  <div className="text-center">
                    <h2 className="text-3xl font-extrabold uppercase tracking-tight text-slate-900 sm:text-4xl">
                      PSTO-Marinduque
                    </h2>
                    <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                      Organizational Chart
                    </p>
                  </div>

                  <ul className="mt-10 flex items-start justify-center">
                    {tree.map((root) => (
                      <TreeNode
                        key={root.id}
                        node={root}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        deletingId={deletingId}
                      />
                    ))}
                  </ul>

                  <div className="mt-10 flex items-center justify-center gap-8">
                    <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <span className="h-3.5 w-6 bg-amber-400" aria-hidden />
                      Regular Personnel
                    </span>
                    <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                      <span className="h-3.5 w-6 bg-sky-400" aria-hidden />
                      Contractual
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <AddOrgChartModal
        isOpen={modalOpen}
        editEntry={editingEntry}
        entries={entries}
        onClose={closeModal}
        onSuccess={loadEntries}
      />
    </Layout>
  );
};

export default AddOrgChart;
