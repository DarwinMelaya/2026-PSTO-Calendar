import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const thGroup =
  "border border-slate-300 px-2 py-2 text-[9px] font-bold uppercase leading-tight tracking-wide text-center whitespace-normal break-words";
const thCol =
  "border border-slate-300 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide whitespace-normal break-words leading-tight text-center";
const tdBase =
  "border border-slate-200 px-2 py-1.5 text-xs text-slate-800 align-middle overflow-hidden";
const tdCheck =
  "border border-slate-200 px-1 py-1.5 text-xs align-middle overflow-hidden text-center";
const tdWrap =
  "border border-slate-200 px-2 py-1.5 text-xs text-slate-800 align-top overflow-hidden whitespace-normal break-words leading-snug";
const stickyLeftCell = (idx) =>
  idx % 2 === 0 ? "bg-white" : "bg-slate-50";
const stickyRightCell = (idx) =>
  idx % 2 === 0 ? "bg-white" : "bg-slate-50";

const CellText = ({ children, title, className = "" }) => (
  <span className={`block truncate ${className}`} title={title ?? (typeof children === "string" ? children : undefined)}>
    {children}
  </span>
);

const COL_WIDTHS = [
  120, 56, 100, 120, 130, 200, 130, 100, 100,
  100, 100, 52, 52, 56, 56, 64, 64, 48, 72,
  56, 72, 96, 96, 96, 110, 48, 48, 64,
  72, 72, 72, 72, 64, 64, 90, 90, 160, 52, 110, 88,
];
const TABLE_MIN_WIDTH = COL_WIDTHS.reduce((sum, width) => sum + width, 0);
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const DEFAULT_ROWS_PER_PAGE = 25;

/** Extract trailing digits from project no. (e.g. "MAR-GIA - 078" → 78). */
const getProjectNoSortValue = (projectNo) => {
  if (!projectNo?.trim()) return -1;
  const match = String(projectNo).match(/(\d+)\s*$/);
  return match ? Number.parseInt(match[1], 10) : -1;
};

const compareProjectNoDesc = (a, b) => {
  const diff = getProjectNoSortValue(b.project_no) - getProjectNoSortValue(a.project_no);
  if (diff !== 0) return diff;
  return String(b.project_no ?? "").localeCompare(String(a.project_no ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

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

/** Confirmation modal for checkbox toggles */
const ToggleConfirmModal = ({ open, field, nextValue, onConfirm, onCancel }) => {
  if (!open) return null;

  const action = nextValue ? "mark as checked" : "uncheck";
  const fieldLabel = field
    ? field
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              nextValue ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            }`}
          >
            {nextValue ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Confirm change</p>
            <p className="mt-0.5 text-xs text-slate-500 capitalize">
              {fieldLabel}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-700">
          Are you sure you want to <strong>{action}</strong> this field?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              nextValue
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {nextValue ? "Confirm check" : "Confirm uncheck"}
          </button>
        </div>
      </div>
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
  const [toggleConfirm, setToggleConfirm] = useState(null); // { record, field, nextValue }
  const [tablePage, setTablePage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const tableScrollRef = useRef(null);

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
    const filtered = records.filter((r) => {
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
    return [...filtered].sort(compareProjectNoDesc);
  }, [records, searchQuery, yearFilter]);

  const tablePageCount = Math.max(
    1,
    Math.ceil(filteredRecords.length / rowsPerPage),
  );

  const paginatedRecords = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, tablePage, rowsPerPage]);

  const tableRangeStart =
    filteredRecords.length === 0 ? 0 : (tablePage - 1) * rowsPerPage + 1;
  const tableRangeEnd = Math.min(tablePage * rowsPerPage, filteredRecords.length);

  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, yearFilter, rowsPerPage]);

  useEffect(() => {
    if (tablePage > tablePageCount) {
      setTablePage(tablePageCount);
    }
  }, [tablePage, tablePageCount]);

  useEffect(() => {
    tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tablePage]);

  const scrollTableBy = (direction) => {
    const el = tableScrollRef.current;
    if (!el) return;
    const step = Math.max(el.clientHeight * 0.75, 120);
    el.scrollBy({ top: direction * step, behavior: "smooth" });
  };

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

  const handleToggle = (record, field) => {
    if (togglingKey) return;
    setToggleConfirm({ record, field, nextValue: !record[field] });
  };

  const confirmToggle = async () => {
    if (!toggleConfirm) return;
    const { record, field, nextValue } = toggleConfirm;
    const key = `${record.id}:${field}`;
    setToggleConfirm(null);
    setTogglingKey(key);
    const { data, error } = await toggleAllProjectsMonitoringField(record.id, field, nextValue);
    setTogglingKey(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecords((prev) => prev.map((r) => (r.id === record.id ? data : r)));
  };

  const cancelToggle = () => setToggleConfirm(null);

  const renderCheck = (record, field) => (
    <td key={field} className={tdCheck}>
      <CheckCell
        checked={Boolean(record[field])}
        toggling={togglingKey === `${record.id}:${field}`}
        onToggle={() => handleToggle(record, field)}
      />
    </td>
  );

  const renderTextCell = (value, { wrap = false, className = "" } = {}) => {
    const display =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value);
    if (wrap) {
      return (
        <td className={`${tdWrap} ${className}`} title={display !== "—" ? display : undefined}>
          {display}
        </td>
      );
    }
    return (
      <td className={`${tdBase} ${className}`}>
        <CellText title={display !== "—" ? display : undefined}>{display}</CellText>
      </td>
    );
  };

  return (
    <Layout>
      <div className="min-w-0 space-y-6 pb-8">
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

        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
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
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="Rows per page"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} rows / page
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
            <div className="relative">
              <div
                ref={tableScrollRef}
                className="isolate w-0 min-w-full max-h-[calc(100vh-6rem)] overflow-x-auto overflow-y-auto overscroll-x-contain border-t border-slate-200 bg-[#f8fafc] scroll-smooth"
              >
              <table
                className="w-full table-fixed border-separate border-spacing-0 text-left"
                style={{ minWidth: TABLE_MIN_WIDTH }}
              >
                <colgroup>
                  {COL_WIDTHS.map((width, i) => (
                    <col key={i} style={{ width }} />
                  ))}
                </colgroup>
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th colSpan={9} className={`${thGroup} ${groupColors.basic}`}>
                      Project details
                    </th>
                    <th colSpan={2} className={`${thGroup} ${groupColors.extension}`}>
                      Extension
                    </th>
                    <th colSpan={2} className={`${thGroup} ${groupColors.realignment} min-w-[160px]`}>
                      With approved request for realignment
                    </th>
                    <th colSpan={6} className={`${thGroup} ${groupColors.interventions}`}>
                      Interventions
                    </th>
                    <th colSpan={1} className={`${thGroup} ${groupColors.liquidation}`}>
                      Liquidation
                    </th>
                    <th colSpan={5} className={`${thGroup} ${groupColors.documents}`}>
                      Documents
                    </th>
                    <th colSpan={3} className={`${thGroup} ${groupColors.reports}`}>
                      Status reports
                    </th>
                    <th colSpan={6} className={`${thGroup} ${groupColors.status}`}>
                      Completion status
                    </th>
                    <th colSpan={5} className={`${thGroup} ${groupColors.refs}`}>
                      References
                    </th>
                    <th
                      rowSpan={2}
                      className={`${thCol} ${groupColors.actions} sticky right-0 z-40 w-[88px] min-w-[88px] max-w-[88px] bg-slate-800 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.25)]`}
                    >
                      Actions
                    </th>
                  </tr>
                  <tr>
                    <th className={`${thCol} ${groupColors.basic} sticky left-0 z-40 w-[120px] min-w-[120px] max-w-[120px] bg-emerald-700 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.25)]`}>
                      No.
                    </th>
                    <th className={`${thCol} ${groupColors.basic} w-[56px]`}>Year</th>
                    <th className={`${thCol} ${groupColors.basic} w-[100px]`}>FIRM</th>
                    <th className={`${thCol} ${groupColors.basic} w-[120px]`}>Total amount</th>
                    <th className={`${thCol} ${groupColors.basic} w-[130px]`}>Downloaded funds</th>
                    <th className={`${thCol} ${groupColors.basic} w-[200px]`}>Project title</th>
                    <th className={`${thCol} ${groupColors.basic} w-[130px]`}>Proponent</th>
                    <th className={`${thCol} ${groupColors.basic} w-[100px]`}>Start</th>
                    <th className={`${thCol} ${groupColors.basic} w-[100px]`}>End</th>
                    <th className={`${thCol} ${groupColors.extension} w-[100px]`}>Req. ext.</th>
                    <th className={`${thCol} ${groupColors.extension} w-[100px]`}>Ext. date</th>
                    <th className={`${thCol} ${groupColors.realignment} w-[52px]`}>1st</th>
                    <th className={`${thCol} ${groupColors.realignment} w-[52px]`}>2nd</th>
                    <th className={`${thCol} ${groupColors.interventions} w-[56px]`}>Equip.</th>
                    <th className={`${thCol} ${groupColors.interventions} w-[56px]`}>MOOE</th>
                    <th className={`${thCol} ${groupColors.interventions} w-[64px]`}>Training</th>
                    <th className={`${thCol} ${groupColors.interventions} w-[64px]`}>Consult.</th>
                    <th className={`${thCol} ${groupColors.interventions} w-[48px]`}>P&L</th>
                    <th className={`${thCol} ${groupColors.interventions} w-[72px]`}>LAB/Others</th>
                    <th className={`${thCol} ${groupColors.liquidation} w-[56px]`}>PSTO</th>
                    <th className={`${thCol} ${groupColors.documents} w-[72px]`}>Recv./Appr.</th>
                    <th className={`${thCol} ${groupColors.documents} w-[96px]`}>LDDAP</th>
                    <th className={`${thCol} ${groupColors.documents} w-[96px]`}>MOA</th>
                    <th className={`${thCol} ${groupColors.documents} w-[96px]`}>RTEC</th>
                    <th className={`${thCol} ${groupColors.documents} w-[110px]`}>Cash program</th>
                    <th className={`${thCol} ${groupColors.reports} w-[48px]`}>1st</th>
                    <th className={`${thCol} ${groupColors.reports} w-[48px]`}>2nd</th>
                    <th className={`${thCol} ${groupColors.reports} w-[64px]`}>Terminal</th>
                    <th className={`${thCol} ${groupColors.status} w-[72px]`}>Completed</th>
                    <th className={`${thCol} ${groupColors.status} w-[72px]`}>Terminated</th>
                    <th className={`${thCol} ${groupColors.status} w-[72px]`}>Condonation</th>
                    <th className={`${thCol} ${groupColors.status} w-[72px]`}>Letter ext.</th>
                    <th className={`${thCol} ${groupColors.status} w-[64px]`}>Donated</th>
                    <th className={`${thCol} ${groupColors.status} w-[64px]`}>Impact</th>
                    <th className={`${thCol} ${groupColors.refs} w-[90px]`}>PAR No.</th>
                    <th className={`${thCol} ${groupColors.refs} w-[90px]`}>PTR No.</th>
                    <th className={`${thCol} ${groupColors.refs} w-[160px]`}>Remarks</th>
                    <th className={`${thCol} ${groupColors.refs} w-[52px]`}>COO</th>
                    <th className={`${thCol} ${groupColors.refs} w-[110px]`}>Google Drive</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record, idx) => (
                    <tr
                      key={record.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td
                        className={`${tdBase} sticky left-0 z-10 font-semibold text-emerald-800 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.12)] ${stickyLeftCell(idx)}`}
                      >
                        <CellText className="text-emerald-800" title={record.project_no || undefined}>
                          {record.project_no || "—"}
                        </CellText>
                      </td>
                      {renderTextCell(record.year)}
                      {renderTextCell(record.firm)}
                      <td className={`${tdBase} tabular-nums`}>
                        <CellText title={formatCurrency(record.total_amount)}>
                          {formatCurrency(record.total_amount)}
                        </CellText>
                      </td>
                      <td className={`${tdBase} tabular-nums`}>
                        <CellText title={formatCurrency(record.downloaded_funds_to_beneficiary)}>
                          {formatCurrency(record.downloaded_funds_to_beneficiary)}
                        </CellText>
                      </td>
                      {renderTextCell(record.project_title, { wrap: true, className: "font-medium" })}
                      {renderTextCell(record.proponent)}
                      {renderTextCell(formatShortDate(record.start_date))}
                      {renderTextCell(formatShortDate(record.end_date))}
                      {renderTextCell(formatMonthYear(record.extension_request_3mo))}
                      {renderTextCell(formatMonthYear(record.extension_date))}
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
                      {renderTextCell(formatShortDate(record.lddap_date))}
                      {renderTextCell(formatShortDate(record.moa_date))}
                      {renderTextCell(formatShortDate(record.rtec_date))}
                      {renderTextCell(record.cash_program)}
                      {renderCheck(record, "status_report_1st")}
                      {renderCheck(record, "status_report_2nd")}
                      {renderCheck(record, "terminal_report")}
                      {renderCheck(record, "completed")}
                      {renderCheck(record, "terminated")}
                      {renderCheck(record, "condonation")}
                      {renderCheck(record, "with_letter_of_extension")}
                      {renderCheck(record, "donated")}
                      {renderCheck(record, "impact_assessment")}
                      {renderTextCell(record.par_no)}
                      {renderTextCell(record.ptr_no)}
                      {renderTextCell(record.remarks, { wrap: true })}
                      {renderCheck(record, "with_coo")}
                      <td className={tdWrap}>
                        <DriveLinks value={record.google_drive_links} />
                      </td>
                      <td
                        className={`${tdCheck} sticky right-0 z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.12)] ${stickyRightCell(idx)}`}
                      >
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

              <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex flex-col gap-1.5 sm:bottom-4 sm:right-4">
                <button
                  type="button"
                  onClick={() => scrollTableBy(-1)}
                  className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-slate-50"
                  title="Scroll up"
                  aria-label="Scroll table up"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollTableBy(1)}
                  className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-slate-50"
                  title="Scroll down"
                  aria-label="Scroll table down"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-600">
                  Showing{" "}
                  <span className="font-semibold text-slate-900">
                    {tableRangeStart}–{tableRangeEnd}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {filteredRecords.length}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTablePage(1)}
                    disabled={tablePage <= 1}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    type="button"
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    disabled={tablePage <= 1}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm font-medium text-slate-600">
                    Page {tablePage} of {tablePageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTablePage((p) => Math.min(tablePageCount, p + 1))}
                    disabled={tablePage >= tablePageCount}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={() => setTablePage(tablePageCount)}
                    disabled={tablePage >= tablePageCount}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToggleConfirmModal
        open={!!toggleConfirm}
        field={toggleConfirm?.field}
        nextValue={toggleConfirm?.nextValue}
        onConfirm={confirmToggle}
        onCancel={cancelToggle}
      />

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
