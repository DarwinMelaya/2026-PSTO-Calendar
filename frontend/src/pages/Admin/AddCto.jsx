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
  listCtoEntries,
  listCtoProfiles,
  recomputeBalances,
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

/**
 * Horizontal bar chart — all profiles ranked by total CTO balance.
 * Clicking a bar selects that person in the ledger below.
 */

const WORK_HOURS_PER_DAY = 8; // standard 8-hour workday

/**
 * Converts total minutes into a human-readable string that includes days
 * when the balance is >= 1 workday (8 hrs).
 * Examples: 500 min → "1d 2h 20m", 90 min → "1h 30m", 30 min → "30m"
 */
const formatDurationWithDays = (totalMinutes) => {
  if (!totalMinutes) return "0h";
  const minutesPerDay = WORK_HOURS_PER_DAY * 60;
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

// Custom tooltip shown on hover
const CtoBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dayLabel = formatDurationWithDays(d.totalMinutes);
  const isDays = d.totalMinutes >= WORK_HOURS_PER_DAY * 60;
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
  const { chartData, idMap } = useMemo(() => {
    const sorted = [...profiles]
      .map((p) => {
        const b = allBalances[String(p.id)] ?? { hours: 0, minutes: 0 };
        const totalMinutes = b.hours * 60 + b.minutes;
        return {
          id: p.id,
          name: profileLabel(p),
          totalMinutes,
          label: formatDuration(b.hours, b.minutes),           // e.g. "10h 30m"
          labelDays: formatDurationWithDays(totalMinutes),      // e.g. "1d 2h 30m"
        };
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Map name → id for the custom tick click handler
    const map = {};
    sorted.forEach((d) => { map[d.name] = d.id; });

    return { chartData: sorted, idMap: map };
  }, [profiles, allBalances]);

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
        subtitle="Ranked by total balance — click a bar or name to view their ledger"
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
                content={<CtoBarTooltip />}
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

    // Group by profileId and sum up balances per person
    const map = {};
    for (const entry of recomputeBalances(data ?? [])) {
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
  }, [loadProfiles, loadAllBalances]);

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
                  loadAllBalances();
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
            sublabel="Total of all entry balances"
          />
        </div>

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
                  ))
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
    </Layout>
  );
};

export default AddCto;
