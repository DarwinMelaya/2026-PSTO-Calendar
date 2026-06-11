import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import AllProjectsMonitoringModal from "../../components/Modals/AdminModals/AllProjectsMonitoringModal";
import {
  EmptyIllustration,
  PanelHeader,
  StatCard,
  TableSkeleton,
} from "../../components/User/UserWorkspaceUI";
import {
  deleteAllProjectsMonitoringRecord,
  formatCurrency,
  formatMonthYear,
  formatShortDate,
  listAllProjectsMonitoring,
  toggleAllProjectsMonitoringField,
} from "../../utils/allProjectsMonitoring";

const thBase =
  "border border-slate-300 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap";
const tdBase =
  "border border-slate-200 px-2 py-1.5 text-xs text-slate-800 align-middle whitespace-nowrap";
const groupColors = {
  basic: "bg-emerald-700 text-white",
  extension: "bg-teal-700 text-white",
  realignment: "bg-cyan-700 text-white",
  interventions: "bg-indigo-700 text-white",
  liquidation: "bg-violet-700 text-white",
  documents: "bg-blue-700 text-white",
  reports: "bg-sky-700 text-white",
  status: "bg-amber-700 text-white",
  refs: "bg-slate-700 text-white",
  actions: "bg-slate-800 text-white",
};

const CheckCell = ({ checked, onToggle, toggling }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={toggling}
    title={checked ? "Checked — click to uncheck" : "Unchecked — click to check"}
    className={`mx-auto flex h-6 w-6 items-center justify-center rounded border transition ${
      checked
        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
        : "border-slate-300 bg-white text-transparent hover:border-slate-400"
    } disabled:opacity-50`}
  >
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  </button>
);

const DriveLinks = ({ value }) => {
  if (!value?.trim()) return <span className="text-slate-400">—</span>;
  const urls = value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));

  if (!urls.length) {
    return <span className="max-w-[140px] truncate" title={value}>{value}</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[140px] truncate text-blue-600 underline-offset-2 hover:underline"
          title={url}
        >
          Open link
        </a>
      ))}
    </div>
  );
};

const AllProjectsMonitoring = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingKey, setTogglingKey] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listAllProjectsMonitoring();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecords(data ?? []);
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const years = useMemo(() => {
    const set = new Set();
    for (const r of records) {
      if (r.year != null) set.add(r.year);
    }
    return [...set].sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      if (yearFilter !== "all" && String(r.year) !== yearFilter) return false;
      if (!q) return true;
      const blob = [
        r.project_no,
        r.year,
        r.firm,
        r.project_title,
        r.proponent,
        r.par_no,
        r.ptr_no,
        r.remarks,
        r.cash_program,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [records, searchQuery, yearFilter]);

  const stats = useMemo(() => {
    const completed = records.filter((r) => r.completed).length;
    const ongoing = records.filter((r) => !r.completed && !r.terminated).length;
    const terminated = records.filter((r) => r.terminated).length;
    return { total: records.length, completed, ongoing, terminated };
  }, [records]);

  const openAdd = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const handleDelete = async (record) => {
    if (deletingId) return;
    const label = record.project_no || record.project_title || "this record";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeletingId(record.id);
    const { error } = await deleteAllProjectsMonitoringRecord(record.id);
    setDeletingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Record deleted.");
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
  };

  const handleToggle = async (record, field) => {
    const key = `${record.id}:${field}`;
    if (togglingKey) return;

    const next = !record[field];
    setTogglingKey(key);
    const { data, error } = await toggleAllProjectsMonitoringField(record.id, field, next);
    setTogglingKey(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecords((prev) => prev.map((r) => (r.id === record.id ? data : r)));
  };

  const renderCheck = (record, field) => (
    <td key={field} className={`${tdBase} text-center`}>
      <CheckCell
        checked={Boolean(record[field])}
        toggling={togglingKey === `${record.id}:${field}`}
        onToggle={() => handleToggle(record, field)}
      />
    </td>
  );

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
          <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 px-5 py-6 sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
              MIMAROPA RSTW
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              All Projects Monitoring
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">
              Excel-style project tracking with funding, interventions, documents, and status reports.
            </p>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
            <StatCard label="Total records" value={stats.total} accent="emerald" />
            <StatCard label="Ongoing" value={stats.ongoing} accent="blue" />
            <StatCard label="Completed" value={stats.completed} accent="sky" />
            <StatCard label="Terminated" value={stats.terminated} accent="rose" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
          <PanelHeader
            title="Monitoring spreadsheet"
            subtitle="Click checkboxes to toggle inline. Use Add record for full entry."
            action={
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add record
              </button>
            }
          />

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="relative min-w-[200px] flex-1">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search project no., title, proponent…"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-500">
              {filteredRecords.length} of {records.length} rows
            </span>
          </div>

          {loading ? (
            <div className="overflow-x-auto p-4">
              <table className="min-w-full">
                <tbody>
                  <TableSkeleton colSpan={12} rows={5} />
                </tbody>
              </table>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <EmptyIllustration variant={searchQuery || yearFilter !== "all" ? "filter" : "empty"} />
              <p className="mt-6 text-lg font-bold text-slate-900">
                {records.length === 0 ? "No monitoring records yet" : "No matches found"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {records.length === 0
                  ? "Add your first project record to populate the spreadsheet."
                  : "Try a different search or year filter."}
              </p>
              {records.length === 0 ? (
                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Add record
                </button>
              ) : null}
            </div>
          ) : (
            <div className="relative max-h-[calc(100vh-18rem)] overflow-auto border-t border-slate-200 bg-[#f8fafc]">
              <table className="min-w-[3200px] border-collapse text-left">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th colSpan={9} className={`${thBase} ${groupColors.basic} text-center`}>
                      Project details
                    </th>
                    <th colSpan={2} className={`${thBase} ${groupColors.extension} text-center`}>
                      Extension
                    </th>
                    <th colSpan={2} className={`${thBase} ${groupColors.realignment} text-center`}>
                      With approved request for realignment
                    </th>
                    <th colSpan={6} className={`${thBase} ${groupColors.interventions} text-center`}>
                      Interventions
                    </th>
                    <th colSpan={1} className={`${thBase} ${groupColors.liquidation} text-center`}>
                      Liquidation
                    </th>
                    <th colSpan={5} className={`${thBase} ${groupColors.documents} text-center`}>
                      Documents
                    </th>
                    <th colSpan={3} className={`${thBase} ${groupColors.reports} text-center`}>
                      Status reports
                    </th>
                    <th colSpan={6} className={`${thBase} ${groupColors.status} text-center`}>
                      Completion status
                    </th>
                    <th colSpan={5} className={`${thBase} ${groupColors.refs} text-center`}>
                      References
                    </th>
                    <th rowSpan={2} className={`${thBase} ${groupColors.actions} sticky right-0 z-30 min-w-[88px]`}>
                      Actions
                    </th>
                  </tr>
                  <tr>
                    <th className={`${thBase} ${groupColors.basic} sticky left-0 z-30 min-w-[120px] bg-emerald-700`}>
                      No.
                    </th>
                    <th className={`${thBase} ${groupColors.basic}`}>Year</th>
                    <th className={`${thBase} ${groupColors.basic}`}>FIRM</th>
                    <th className={`${thBase} ${groupColors.basic} min-w-[110px]`}>Total amount</th>
                    <th className={`${thBase} ${groupColors.basic} min-w-[120px]`}>Downloaded funds</th>
                    <th className={`${thBase} ${groupColors.basic} min-w-[180px]`}>Project title</th>
                    <th className={`${thBase} ${groupColors.basic} min-w-[120px]`}>Proponent</th>
                    <th className={`${thBase} ${groupColors.basic}`}>Start</th>
                    <th className={`${thBase} ${groupColors.basic}`}>End</th>
                    <th className={`${thBase} ${groupColors.extension} min-w-[100px]`}>Req. ext.</th>
                    <th className={`${thBase} ${groupColors.extension}`}>Ext. date</th>
                    <th className={`${thBase} ${groupColors.realignment}`}>1st</th>
                    <th className={`${thBase} ${groupColors.realignment}`}>2nd</th>
                    <th className={`${thBase} ${groupColors.interventions}`}>Equip.</th>
                    <th className={`${thBase} ${groupColors.interventions}`}>MOOE</th>
                    <th className={`${thBase} ${groupColors.interventions}`}>Training</th>
                    <th className={`${thBase} ${groupColors.interventions}`}>Consult.</th>
                    <th className={`${thBase} ${groupColors.interventions}`}>P&L</th>
                    <th className={`${thBase} ${groupColors.interventions}`}>LAB/Others</th>
                    <th className={`${thBase} ${groupColors.liquidation}`}>PSTO</th>
                    <th className={`${thBase} ${groupColors.documents}`}>Recv./Appr.</th>
                    <th className={`${thBase} ${groupColors.documents}`}>LDDAP</th>
                    <th className={`${thBase} ${groupColors.documents}`}>MOA</th>
                    <th className={`${thBase} ${groupColors.documents}`}>RTEC</th>
                    <th className={`${thBase} ${groupColors.documents} min-w-[100px]`}>Cash program</th>
                    <th className={`${thBase} ${groupColors.reports}`}>1st</th>
                    <th className={`${thBase} ${groupColors.reports}`}>2nd</th>
                    <th className={`${thBase} ${groupColors.reports}`}>Terminal</th>
                    <th className={`${thBase} ${groupColors.status}`}>Completed</th>
                    <th className={`${thBase} ${groupColors.status}`}>Terminated</th>
                    <th className={`${thBase} ${groupColors.status}`}>Condonation</th>
                    <th className={`${thBase} ${groupColors.status}`}>Letter ext.</th>
                    <th className={`${thBase} ${groupColors.status}`}>Donated</th>
                    <th className={`${thBase} ${groupColors.status}`}>Impact</th>
                    <th className={`${thBase} ${groupColors.refs}`}>PAR No.</th>
                    <th className={`${thBase} ${groupColors.refs}`}>PTR No.</th>
                    <th className={`${thBase} ${groupColors.refs} min-w-[140px]`}>Remarks</th>
                    <th className={`${thBase} ${groupColors.refs}`}>COO</th>
                    <th className={`${thBase} ${groupColors.refs} min-w-[100px]`}>Google Drive</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, idx) => (
                    <tr
                      key={record.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
                    >
                      <td className={`${tdBase} sticky left-0 z-10 bg-inherit font-semibold text-emerald-800`}>
                        {record.project_no || "—"}
                      </td>
                      <td className={tdBase}>{record.year ?? "—"}</td>
                      <td className={tdBase}>{record.firm || "—"}</td>
                      <td className={`${tdBase} tabular-nums`}>{formatCurrency(record.total_amount)}</td>
                      <td className={`${tdBase} tabular-nums`}>
                        {formatCurrency(record.downloaded_funds_to_beneficiary)}
                      </td>
                      <td className={`${tdBase} max-w-[200px] whitespace-normal font-medium`}>
                        {record.project_title}
                      </td>
                      <td className={tdBase}>{record.proponent || "—"}</td>
                      <td className={tdBase}>{formatShortDate(record.start_date)}</td>
                      <td className={tdBase}>{formatShortDate(record.end_date)}</td>
                      <td className={tdBase}>{formatMonthYear(record.extension_request_3mo)}</td>
                      <td className={tdBase}>{formatMonthYear(record.extension_date)}</td>
                      {renderCheck(record, "realignment_1st")}
                      {renderCheck(record, "realignment_2nd")}
                      {renderCheck(record, "intervention_equipment")}
                      {renderCheck(record, "intervention_mooe")}
                      {renderCheck(record, "intervention_trainings")}
                      {renderCheck(record, "intervention_consultancy")}
                      {renderCheck(record, "intervention_pl")}
                      {renderCheck(record, "intervention_lab_others")}
                      {renderCheck(record, "liquidation_psto")}
                      {renderCheck(record, "received_approved")}
                      <td className={tdBase}>{formatShortDate(record.lddap_date)}</td>
                      <td className={tdBase}>{formatShortDate(record.moa_date)}</td>
                      <td className={tdBase}>{formatShortDate(record.rtec_date)}</td>
                      <td className={tdBase}>{record.cash_program || "—"}</td>
                      {renderCheck(record, "status_report_1st")}
                      {renderCheck(record, "status_report_2nd")}
                      {renderCheck(record, "terminal_report")}
                      {renderCheck(record, "completed")}
                      {renderCheck(record, "terminated")}
                      {renderCheck(record, "condonation")}
                      {renderCheck(record, "with_letter_of_extension")}
                      {renderCheck(record, "donated")}
                      {renderCheck(record, "impact_assessment")}
                      <td className={tdBase}>{record.par_no || "—"}</td>
                      <td className={tdBase}>{record.ptr_no || "—"}</td>
                      <td className={`${tdBase} max-w-[160px] whitespace-normal`} title={record.remarks ?? ""}>
                        {record.remarks || "—"}
                      </td>
                      {renderCheck(record, "with_coo")}
                      <td className={tdBase}>
                        <DriveLinks value={record.google_drive_links} />
                      </td>
                      <td className={`${tdBase} sticky right-0 z-10 bg-inherit`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(record)}
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(record)}
                            disabled={deletingId === record.id}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AllProjectsMonitoringModal
        isOpen={modalOpen}
        record={editingRecord}
        onClose={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={(saved) => {
          setRecords((prev) => {
            const exists = prev.some((r) => r.id === saved.id);
            if (exists) return prev.map((r) => (r.id === saved.id ? saved : r));
            return [saved, ...prev];
          });
        }}
      />
    </Layout>
  );
};

export default AllProjectsMonitoring;
