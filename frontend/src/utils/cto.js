import supabase from "./supabaseClient";

export const toTotalMinutes = (hours, minutes) =>
  (Number(hours) || 0) * 60 + (Number(minutes) || 0);

export const fromTotalMinutes = (total) => {
  const normalized = Number.isFinite(total) ? total : 0;
  const sign = normalized < 0 ? -1 : 1;
  const abs = Math.abs(normalized);
  return {
    hours: sign * Math.floor(abs / 60),
    minutes: abs % 60,
  };
};

export const normalizeMinutesField = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n >= 60) return 59;
  return Math.floor(n);
};

export const normalizeHoursField = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

export const formatDuration = (hours, minutes) => {
  const h = Number(hours) || 0;
  const m = Number(minutes) || 0;
  if (h === 0 && m === 0) return "0h";
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export const computeBalance = ({
  overtimeHours = 0,
  overtimeMinutes = 0,
  offsetHours = 0,
  offsetMinutes = 0,
}) => {
  const total =
    toTotalMinutes(overtimeHours, overtimeMinutes) -
    toTotalMinutes(offsetHours, offsetMinutes);
  return fromTotalMinutes(Math.max(0, total));
};

export const formatCtoDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const mapRow = (row) => ({
  id: row.id,
  profileId: row.profile_id,
  entryDate: row.entry_date,
  particulars: row.particulars,
  overtimeHours: row.overtime_hours,
  overtimeMinutes: row.overtime_minutes,
  offsetDate: row.offset_date,
  offsetHours: row.offset_hours,
  offsetMinutes: row.offset_minutes,
  balanceHours: row.balance_hours,
  balanceMinutes: row.balance_minutes,
  createdAt: row.created_at,
  profile: row.profiles ?? null,
});

const toDbPayload = ({
  profileId,
  entryDate,
  particulars,
  overtimeHours,
  overtimeMinutes,
  offsetDate,
  offsetHours,
  offsetMinutes,
  balanceHours,
  balanceMinutes,
}) => ({
  profile_id: Number(profileId),
  entry_date: entryDate,
  particulars: particulars.trim(),
  overtime_hours: normalizeHoursField(overtimeHours),
  overtime_minutes: normalizeMinutesField(overtimeMinutes),
  offset_date: offsetDate || null,
  offset_hours: normalizeHoursField(offsetHours),
  offset_minutes: normalizeMinutesField(offsetMinutes),
  balance_hours: Number(balanceHours) || 0,
  balance_minutes: normalizeMinutesField(balanceMinutes),
});

export const listCtoProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, code_name, email")
    .order("code_name", { ascending: true });

  return { data, error };
};

export const listCtoEntries = async ({ profileId } = {}) => {
  let query = supabase
    .from("cto_entries")
    .select(
      "id, profile_id, entry_date, particulars, overtime_hours, overtime_minutes, offset_date, offset_hours, offset_minutes, balance_hours, balance_minutes, created_at, profiles ( id, name, code_name )",
    )
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (profileId) {
    query = query.eq("profile_id", Number(profileId));
  }

  const { data, error } = await query;
  return { data: (data ?? []).map(mapRow), error };
};

export const getLatestCtoBalance = async (profileId) => {
  const { data, error } = await supabase
    .from("cto_entries")
    .select("balance_hours, balance_minutes")
    .eq("profile_id", Number(profileId))
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: { hours: 0, minutes: 0 }, error };
  if (!data) return { data: { hours: 0, minutes: 0 }, error: null };

  return {
    data: {
      hours: data.balance_hours ?? 0,
      minutes: data.balance_minutes ?? 0,
    },
    error: null,
  };
};

export const createCtoEntry = async (payload) => {
  const { data, error } = await supabase
    .from("cto_entries")
    .insert(toDbPayload(payload))
    .select(
      "id, profile_id, entry_date, particulars, overtime_hours, overtime_minutes, offset_date, offset_hours, offset_minutes, balance_hours, balance_minutes, created_at",
    )
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const deleteCtoEntry = async (id) => {
  const { error } = await supabase
    .from("cto_entries")
    .delete()
    .eq("id", Number(id));
  return { error };
};

/**
 * Recomputes the balance for every entry.
 * Balance rule per entry: balance = overtime - offset (no running total)
 */
export const recomputeBalances = (entries) => {
  return entries.map((entry) => {
    const total =
      toTotalMinutes(entry.overtimeHours, entry.overtimeMinutes) -
      toTotalMinutes(entry.offsetHours, entry.offsetMinutes);
    const { hours, minutes } = fromTotalMinutes(Math.max(0, total));
    return { ...entry, balanceHours: hours, balanceMinutes: minutes };
  });
};

/**
 * After any mutation (add / delete) update every stored balance_hours /
 * balance_minutes for the given profile so the DB stays consistent too.
 */
export const syncBalancesForProfile = async (profileId) => {
  // 1. Fetch all entries for this profile in chronological order
  const { data, error } = await supabase
    .from("cto_entries")
    .select(
      "id, overtime_hours, overtime_minutes, offset_hours, offset_minutes",
    )
    .eq("profile_id", Number(profileId))
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) return { error };

  // 2. Walk through entries and build corrected balances
  const updates = data.map((row) => {
    const total =
      toTotalMinutes(row.overtime_hours, row.overtime_minutes) -
      toTotalMinutes(row.offset_hours, row.offset_minutes);
    const { hours, minutes } = fromTotalMinutes(Math.max(0, total));
    return { id: row.id, balance_hours: hours, balance_minutes: minutes };
  });

  // 3. Upsert (update) each row — do it sequentially to preserve order
  for (const update of updates) {
    const { error: updErr } = await supabase
      .from("cto_entries")
      .update({
        balance_hours: update.balance_hours,
        balance_minutes: update.balance_minutes,
      })
      .eq("id", update.id);
    if (updErr) return { error: updErr };
  }

  return { error: null };
};
