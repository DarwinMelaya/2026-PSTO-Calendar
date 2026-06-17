import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AddCtoModal from "../../components/Modals/AdminModals/AddCtoModal";
import CtoRejectModal from "../../components/Modals/AdminModals/CtoRejectModal";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  StatCard,
  TableSkeleton,
} from "../../components/User/UserWorkspaceUI";
import {
  approveCtoEntry,
  deleteCtoEntry,
  formatCtoDate,
  formatDuration,
  listCtoEntries,
  listCtoProfiles,
  listPendingCtoEntries,
  recomputeBalances,
  rejectCtoEntry,
} from "../../utils/cto";

/**
 * Searchable person picker — replaces a plain <select> with a text input
 * that filters the list as you type and lets you click to select.
 */
const PersonPicker = ({ profiles, value, onChange, disabled }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = profiles.find((p) => String(p.id) === String(value)) ?? null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter((p) =>
      profileLabel(p).toLowerCase().includes(q),
    );
  }, [query, profiles]);

  const handleSelect = (profile) => {
    onChange(String(profile.id));
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative min-w-[240px]">
      {/* Trigger / input */}
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 py-2.5 shadow-sm transition ${
          open
            ? "border-teal-500 ring-2 ring-teal-500/20"
            : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {open ? (
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search name…"
            className="flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
        ) : (
          <span
            className={`flex-1 truncate text-sm font-medium ${
              selected ? "text-slate-800" : "text-slate-400"
            }`}
          >
            {selected ? profileLabel(selected) : "Select person…"}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {selected && !open && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-300/30 ring-1 ring-slate-900/[0.04]">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">No match found</li>
          ) : (
            filtered.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(profile)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-teal-50 ${
                    String(profile.id) === String(value)
                      ? "bg-teal-50 font-semibold text-teal-700"
                      : "text-slate-700"
                  }`}
                >
                  {/* Avatar initial */}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-xs font-bold text-white">
                    {profileLabel(profile).charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{profileLabel(profile)}</span>
                  {String(profile.id) === String(value) && (
                    <svg
                      className="ml-auto h-4 w-4 shrink-0 text-teal-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

const profileLabel = (profile) =>
  profile?.code_name?.trim() ||
  profile?.name?.trim() ||
  profile?.email?.trim() ||
  (profile?.id ? `User #${profile.id}` : "—");

// ─── CTO expiry constants & helpers ──────────────────────────────────────────
const EXPIRY_WARN_DAYS   = 60; // start warning 60 days before expiry (2 months)

/** Returns the expiry Date for a given entryDate string (YYYY-MM-DD). */
const getCtoExpiry = (entryDate) => {
  const d = new Date(`${entryDate}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

/** Days remaining until expiry — negative means already expired. */
const daysUntilExpiry = (entryDate) => {
  const expiry = getCtoExpiry(entryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

/**
 * Converts total minutes into a human-readable string that includes days
 * when the balance is >= 1 workday.
 * Examples (8h/day): 500 min → "1d 2h 20m", 90 min → "1h 30m", 30 min → "30m"
 */
const formatDurationWithDays = (totalMinutes, workHoursPerDay = 8) => {
  if (!totalMinutes) return "0h";
  const minutesPerDay = workHoursPerDay * 60;
  const days = Math.floor(totalMinutes / minutesPerDay);
  const rem = totalMinutes % minutesPerDay;
  const hours = Math.floor(rem / 60);
  const minutes = rem % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ") || "0h";
};
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Alert panel — shows all entries expiring within EXPIRY_WARN_DAYS days
 * or already expired, sorted most-urgent first.
 */
const CtoExpiryAlert = ({ expiringEntries, profiles, onSelect, loading }) => {
  if (loading) return null;
  if (!expiringEntries.length) return null;

  const expired  = expiringEntries.filter((e) => e.daysLeft < 0);
  const expiring = expiringEntries.filter((e) => e.daysLeft >= 0);

  return (
    <section className="ut-animate-in overflow-hidden rounded-3xl border border-rose-200/80 bg-rose-50/60 shadow-lg shadow-rose-100/40 ring-1 ring-rose-900/[0.06]">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-rose-200/60 bg-rose-50 px-5 py-4 sm:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-400/30">
          <svg className="h-4.5 w-4.5 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-rose-900">
            CTO Expiry Alert
            <span className="ml-2 inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
              {expiringEntries.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-rose-700">
            CTO entries expire 1 year from their entry date.
            {expired.length > 0 && ` ${expired.length} already expired.`}
            {expiring.length > 0 && ` ${expiring.length} expiring within ${EXPIRY_WARN_DAYS} days (2 months).`}
          </p>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-rose-100/70 px-5 py-1 sm:px-6">
        {expiringEntries.map((e) => {
          const isExpired = e.daysLeft < 0;
          const isUrgent  = e.daysLeft >= 0 && e.daysLeft <= 7;
          return (
            <div key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              {/* Status badge */}
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isExpired
                  ? "bg-rose-100 text-rose-800"
                  : isUrgent
                  ? "bg-orange-100 text-orange-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {isExpired
                  ? `Expired ${Math.abs(e.daysLeft)}d ago`
                  : e.daysLeft === 0
                  ? "Expires today"
                  : `${e.daysLeft}d left`}
              </span>

              {/* Person name */}
              <button
                type="button"
                onClick={() => onSelect(String(e.profileId))}
                className="text-sm font-semibold text-rose-900 hover:underline"
              >
                {e.personName}
              </button>

              {/* Entry details */}
              <span className="text-xs text-rose-600">
                Entry: {formatCtoDate(e.entryDate)}
              </span>
              <span className="text-xs text-rose-500">
                Expires: {formatCtoDate(e.expiryDateStr)}
              </span>
              {e.balanceMinutes + e.balanceHours * 60 > 0 && (
                <span className="text-xs font-semibold text-rose-700">
                  Balance: {formatDuration(e.balanceHours, e.balanceMinutes)}
                </span>
              )}

              {/* Particulars snippet */}
              {e.particulars && (
                <span className="truncate max-w-xs text-xs text-rose-400 italic">
                  "{e.particulars.slice(0, 60)}{e.particulars.length > 60 ? "…" : ""}"
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/**
 * Horizontal bar chart — all profiles ranked by total CTO balance.
 * Clicking a bar selects that person in the ledger below.
 */

// Custom tooltip shown on hover
const CtoBarTooltip = ({ active, payload, workHoursPerDay }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dayLabel = formatDurationWithDays(d.totalMinutes, workHoursPerDay);
  const isDays = d.totalMinutes >= workHoursPerDay * 60;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl text-xs">
      <p className="font-bold text-slate-800">{d.name}</p>
      <p className="mt-1 text-base font-bold text-emerald-700">{dayLabel}</p>
      {isDays && (
        <p className="text-slate-500">{d.label} total</p>
      )}
      <p className="mt-0.5 text-slate-400">{d.totalMinutes} min</p>
    </div>
  );
};

// Custom Y-axis tick that renders the person's name
const NameTick = ({ x, y, payload, selectedId, onClick, idMap }) => {
  const profileId = idMap[payload.value];
  const isSelected = String(profileId) === String(selectedId);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={12}
        fontWeight={isSelected ? 700 : 500}
        fill={isSelected ? "#0d9488" : "#475569"}
        className="cursor-pointer select-none"
        onClick={() => onClick(String(profileId))}
      >
        {payload.value.length > 18 ? payload.value.slice(0, 17) + "…" : payload.value}
      </text>
    </g>
  );
};

const BAR_COLORS = [
  "#059669", "#0d9488", "#3b82f6", "#8b5cf6",
  "#f59e0b", "#f43f5e", "#10b981", "#6366f1",
  "#ec4899", "#64748b",
];

const CtoLeaderboard = ({ profiles, allBalances, loading, onSelect, selectedProfileId }) => {
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);

  const { chartData, idMap } = useMemo(() => {
    const sorted = [...profiles]
      .map((p) => {
        const b = allBalances[String(p.id)] ?? { hours: 0, minutes: 0 };
        const totalMinutes = b.hours * 60 + b.minutes;
        return {
          id: p.id,
          name: profileLabel(p),
          totalMinutes,
          label: formatDuration(b.hours, b.minutes),                           // e.g. "10h 30m"
          labelDays: formatDurationWithDays(totalMinutes, workHoursPerDay),    // e.g. "1d 2h 30m"
        };
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Map name → id for the custom tick click handler
    const map = {};
    sorted.forEach((d) => { map[d.name] = d.id; });

    return { chartData: sorted, idMap: map };
  }, [profiles, allBalances, workHoursPerDay]);

  const chartHeight = Math.max(200, chartData.length * 44);

  // Custom label rendered at the end of each bar
  const BarValueLabel = ({ x, y, width, height, index }) => {
    const d = chartData[index];
    if (!d || d.totalMinutes === 0) return null;
    return (
      <text
        x={x + width + 6}
        y={y + height / 2 + 1}
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={600}
        fill="#475569"
      >
        {d.labelDays}
      </text>
    );
  };

  // Work-hours toggle button
  const WorkHoursToggle = () => (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {[8, 10].map((h) => (
        <button
          key={h}
          type="button"
          onClick={() => setWorkHoursPerDay(h)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            workHoursPerDay === h
              ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200/80"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {h}h/day
        </button>
      ))}
    </div>
  );

  return (
    <section className="ut-animate-in ut-delay-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
      <PanelHeader
        iconGradient="bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/25"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        title="CTO Balance Overview"
        subtitle={`Ranked by total balance — click a bar or name to view their ledger · ${workHoursPerDay}h workday`}
        action={<WorkHoursToggle />}
      />

      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-3.5 w-28 rounded bg-slate-200" />
                <div className="h-6 flex-1 rounded-lg bg-slate-100" style={{ maxWidth: `${80 - i * 14}%` }} />
              </div>
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            No profiles found.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              barSize={22}
              onClick={(e) => {
                if (e?.activePayload?.[0]) {
                  onSelect(String(e.activePayload[0].payload.id));
                }
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tickFormatter={(v) => {
                  const h = Math.floor(v / 60);
                  const m = v % 60;
                  if (h === 0) return `${m}m`;
                  return m === 0 ? `${h}h` : `${h}h ${m}m`;
                }}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={
                  <NameTick
                    selectedId={selectedProfileId}
                    onClick={onSelect}
                    idMap={idMap}
                  />
                }
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CtoBarTooltip workHoursPerDay={workHoursPerDay} />}
                cursor={{ fill: "#f1f5f9" }}
              />
              <Bar
                dataKey="totalMinutes"
                name="Balance"
                radius={[0, 6, 6, 0]}
                label={<BarValueLabel />}
                className="cursor-pointer"
              >
                {chartData.map((d, i) => (
                  <Cell
                    key={d.id}
                    fill={
                      String(d.id) === String(selectedProfileId)
                        ? "#0d9488"
                        : BAR_COLORS[i % BAR_COLORS.length]
                    }
                    opacity={
                      selectedProfileId && String(d.id) !== String(selectedProfileId)
                        ? 0.45
                        : 1
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

const AddCto = () => {
  const [profiles, setProfiles] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [latestBalance, setLatestBalance] = useState({ hours: 0, minutes: 0 });
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editEntry, setEditEntry] = useState(null); // entry being edited, null = add mode
  // allBalances: { [profileId]: { hours, minutes } } — computed once all entries are fetched
  const [allBalances, setAllBalances] = useState({});
  const [loadingAllBalances, setLoadingAllBalances] = useState(false);
  const [expiringEntries, setExpiringEntries] = useState([]);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

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

  const loadAllBalances = useCallback(async () => {
    setLoadingAllBalances(true);
    // Fetch ALL entries (no profile filter) in one query
    const { data, error } = await listCtoEntries();
    setLoadingAllBalances(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const recomputed = recomputeBalances(data ?? []);

    // Group by profileId and sum up balances per person
    const map = {};
    for (const entry of recomputed) {
      const pid = String(entry.profileId);
      if (!map[pid]) map[pid] = 0;
      map[pid] +=
        (Number(entry.balanceHours) || 0) * 60 +
        (Number(entry.balanceMinutes) || 0);
    }

    const result = {};
    for (const [pid, totalMins] of Object.entries(map)) {
      result[pid] = {
        hours: Math.floor(totalMins / 60),
        minutes: totalMins % 60,
      };
    }
    setAllBalances(result);

    // Collect entries expiring within EXPIRY_WARN_DAYS or already expired
    // Only flag entries that still have a non-zero balance (nothing to warn about if fully used)
    const expiring = recomputed
      .filter((entry) => {
        if (!entry.entryDate) return false;
        const remaining = (Number(entry.balanceHours) || 0) * 60 + (Number(entry.balanceMinutes) || 0);
        if (remaining === 0) return false; // no balance left, no need to warn
        const days = daysUntilExpiry(entry.entryDate);
        return days <= EXPIRY_WARN_DAYS; // includes negatives (already expired)
      })
      .map((entry) => {
        const expiry = getCtoExpiry(entry.entryDate);
        return {
          ...entry,
          daysLeft: daysUntilExpiry(entry.entryDate),
          expiryDateStr: expiry.toISOString().slice(0, 10),
          personName: entry.profile
            ? (entry.profile.code_name?.trim() || entry.profile.name?.trim() || `User #${entry.profileId}`)
            : `User #${entry.profileId}`,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft); // most urgent first

    setExpiringEntries(expiring);
  }, []);

  const loadPendingEntries = useCallback(async () => {
    setLoadingPending(true);
    const { data, error } = await listPendingCtoEntries();
    setLoadingPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPendingEntries(data ?? []);
  }, []);

  const loadEntries = useCallback(async (profileId) => {
    if (!profileId) {
      setEntries([]);
      setLatestBalance({ hours: 0, minutes: 0 });
      return;
    }

    setLoadingEntries(true);
    const { data, error } = await listCtoEntries({ profileId });
    setLoadingEntries(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Always recompute balances client-side so the table is accurate even if
    // stored values are stale (e.g. after a delete or an out-of-order insert).
    const recomputed = recomputeBalances(data ?? []);
    setEntries(recomputed);

    const totalMinutes = recomputed.reduce(
      (sum, e) =>
        sum +
        (Number(e.balanceHours) || 0) * 60 +
        (Number(e.balanceMinutes) || 0),
      0,
    );
    setLatestBalance({
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    });
  }, []);

  useEffect(() => {
    loadProfiles();
    loadAllBalances();
    loadPendingEntries();
  }, [loadProfiles, loadAllBalances, loadPendingEntries]);

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

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setAddModalOpen(true);
  };

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
    loadAllBalances();
  };

  const handleEntryAdded = () => {
    loadEntries(selectedProfileId);
    loadAllBalances();
    loadPendingEntries();
  };

  const handleApprovePending = async (entry) => {
    setResolvingId(entry.id);
    const { error } = await approveCtoEntry(entry.id);
    setResolvingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("CTO request approved.");
    loadPendingEntries();
    loadAllBalances();
    if (String(entry.profileId) === String(selectedProfileId)) {
      loadEntries(selectedProfileId);
    }
  };

  const handleRejectPending = async (rejectionReason) => {
    const entry = rejectTarget;
    if (!entry) return;

    setResolvingId(entry.id);
    const { error } = await rejectCtoEntry(entry.id, rejectionReason);
    setResolvingId(null);
    setRejectTarget(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("CTO request rejected.");
    loadPendingEntries();
  };

  const pendingProfileLabel = (entry) =>
    entry.profile
      ? profileLabel(entry.profile)
      : profiles.find((p) => String(p.id) === String(entry.profileId))
        ? profileLabel(
            profiles.find((p) => String(p.id) === String(entry.profileId)),
          )
        : `User #${entry.profileId}`;

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
                  loadAllBalances();
                  loadPendingEntries();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        {pendingEntries.length > 0 || loadingPending ? (
          <section className="ut-animate-in overflow-hidden rounded-3xl border border-amber-200/80 bg-amber-50/40 shadow-lg shadow-amber-100/40 ring-1 ring-amber-900/[0.06]">
            <div className="flex items-start gap-3 border-b border-amber-200/60 bg-amber-50 px-5 py-4 sm:px-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-400/30">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Pending CTO requests
                  {!loadingPending && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                      {pendingEntries.length}
                    </span>
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-amber-800">
                  User-submitted entries awaiting your approval.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto px-5 py-3 sm:px-6">
              {loadingPending ? (
                <TableSkeleton rows={2} />
              ) : (
                <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr>
                      <th className="rounded-l-xl bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">
                        Person
                      </th>
                      <th className="bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">
                        Date
                      </th>
                      <th className="bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">
                        Particulars
                      </th>
                      <th className="bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">
                        Overtime
                      </th>
                      <th className="rounded-r-xl bg-slate-900 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="rounded-l-xl bg-white px-4 py-3 font-semibold text-slate-900 ring-1 ring-slate-200/80">
                          <button
                            type="button"
                            onClick={() => setSelectedProfileId(String(entry.profileId))}
                            className="hover:text-teal-700 hover:underline"
                          >
                            {pendingProfileLabel(entry)}
                          </button>
                        </td>
                        <td className="bg-white px-4 py-3 text-slate-700 ring-1 ring-slate-200/80">
                          {formatCtoDate(entry.entryDate)}
                        </td>
                        <td className="max-w-xs bg-white px-4 py-3 text-slate-700 ring-1 ring-slate-200/80">
                          <p className="line-clamp-2 whitespace-pre-wrap">
                            {entry.particulars}
                          </p>
                        </td>
                        <td className="whitespace-nowrap bg-white px-4 py-3 text-slate-700 ring-1 ring-slate-200/80">
                          {formatDuration(entry.overtimeHours, entry.overtimeMinutes)}
                        </td>
                        <td className="rounded-r-xl bg-white px-4 py-3 text-right ring-1 ring-slate-200/80">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprovePending(entry)}
                              disabled={resolvingId === entry.id}
                              className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {resolvingId === entry.id ? "Saving…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectTarget(entry)}
                              disabled={resolvingId === entry.id}
                              className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : null}

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
            sublabel="Total of all entry balances"
          />
        </div>

        <CtoExpiryAlert
          expiringEntries={expiringEntries}
          profiles={profiles}
          onSelect={setSelectedProfileId}
          loading={loadingAllBalances}
        />

        <CtoLeaderboard
          profiles={profiles}
          allBalances={allBalances}
          loading={loadingProfiles || loadingAllBalances}
          onSelect={setSelectedProfileId}
          selectedProfileId={selectedProfileId}
        />

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
              <PersonPicker
                profiles={profiles}
                value={selectedProfileId}
                onChange={setSelectedProfileId}
                disabled={loadingProfiles}
              />
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
                          {profileLabel(selectedProfile)} hasn't submitted any CTO requests yet.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const days = entry.entryDate ? daysUntilExpiry(entry.entryDate) : null;
                    const isExpired  = days !== null && days < 0;
                    const isExpiring = days !== null && days >= 0 && days <= EXPIRY_WARN_DAYS;
                    const hasBalance = (Number(entry.balanceHours) || 0) * 60 + (Number(entry.balanceMinutes) || 0) > 0;
                    const showExpiry = hasBalance && (isExpired || isExpiring);

                    return (
                    <tr key={entry.id}>
                      <td className="rounded-l-xl bg-white px-4 py-4 font-medium text-slate-900 ring-1 ring-slate-200/80">
                        <div className="flex flex-col gap-1">
                          {formatCtoDate(entry.entryDate)}
                          {showExpiry && (
                            <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isExpired
                                ? "bg-rose-100 text-rose-700"
                                : days <= 7
                                ? "bg-orange-100 text-orange-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {isExpired
                                ? `Expired ${Math.abs(days)}d ago`
                                : days === 0
                                ? "Expires today"
                                : `Expires in ${days}d`}
                            </span>
                          )}
                        </div>
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(entry)}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            disabled={deletingId === entry.id}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingId === entry.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AddCtoModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditEntry(null);
        }}
        onSuccess={handleEntryAdded}
        profiles={profiles}
        defaultProfileId={selectedProfileId}
        editEntry={editEntry}
      />

      <CtoRejectModal
        isOpen={!!rejectTarget}
        entry={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectPending}
        submitting={rejectTarget ? resolvingId === rejectTarget.id : false}
      />
    </Layout>
  );
};

export default AddCto;
