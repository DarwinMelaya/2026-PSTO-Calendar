import { compressImage } from "./compressImage";
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

export const CTO_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
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
  status: row.status ?? CTO_STATUSES.APPROVED,
  rejectionReason: row.rejection_reason ?? null,
  reviewedAt: row.reviewed_at ?? null,
  createdAt: row.created_at,
  profile: row.profiles ?? null,
  imageUrl: row.image_url ?? null,
  remarks: row.remarks ?? null,
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
  status,
  imageUrl,
  remarks,
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
  ...(status ? { status } : {}),
  image_url: imageUrl ?? null,
  remarks: remarks?.trim() || null,
});

const CTO_ENTRY_SELECT =
  "id, profile_id, entry_date, particulars, overtime_hours, overtime_minutes, offset_date, offset_hours, offset_minutes, balance_hours, balance_minutes, status, rejection_reason, reviewed_at, created_at, image_url, remarks";

// ─── CTO Image Storage ────────────────────────────────────────────────────────
const CTO_IMAGE_BUCKET = "cto-attachments";

/** Returns the storage path from a full public URL, or null. */
const ctoImagePathFromUrl = (url) => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${CTO_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
};

/**
 * Uploads a file to the cto-attachments bucket.
 * Compresses before upload. Returns { url, error }.
 */
export const uploadCtoImage = async (file) => {
  if (!file) return { url: null, error: null };

  let uploadFile = file;
  try {
    uploadFile = await compressImage(file);
  } catch (err) {
    return { url: null, error: { message: err?.message ?? "Failed to compress image." } };
  }

  const safeName = uploadFile.name.replace(/[^\w.\-]+/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(CTO_IMAGE_BUCKET)
    .upload(path, uploadFile, { upsert: false, contentType: uploadFile.type });

  if (error) return { url: null, error };

  const { data: urlData } = supabase.storage
    .from(CTO_IMAGE_BUCKET)
    .getPublicUrl(data.path);

  return { url: urlData?.publicUrl ?? null, error: null };
};

/**
 * Removes a previously-uploaded CTO image from storage.
 */
export const deleteCtoImage = async (url) => {
  const path = ctoImagePathFromUrl(url);
  if (!path) return { error: null };
  const { error } = await supabase.storage.from(CTO_IMAGE_BUCKET).remove([path]);
  return { error };
};

export const listCtoProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, code_name, email")
    .order("code_name", { ascending: true });

  return { data, error };
};

export const listCtoEntries = async ({
  profileId,
  status,
  statuses,
  includeAllStatuses = false,
} = {}) => {
  let query = supabase
    .from("cto_entries")
    .select(
      `${CTO_ENTRY_SELECT}, profiles ( id, name, code_name )`,
    )
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (profileId) {
    query = query.eq("profile_id", Number(profileId));
  }

  if (status) {
    query = query.eq("status", status);
  } else if (statuses?.length) {
    query = query.in("status", statuses);
  } else if (!includeAllStatuses) {
    query = query.eq("status", CTO_STATUSES.APPROVED);
  }

  const { data, error } = await query;
  return { data: (data ?? []).map(mapRow), error };
};

export const listPendingCtoEntries = async () =>
  listCtoEntries({ status: CTO_STATUSES.PENDING, includeAllStatuses: true });

export const getLatestCtoBalance = async (profileId) => {
  const { data, error } = await supabase
    .from("cto_entries")
    .select("balance_hours, balance_minutes")
    .eq("profile_id", Number(profileId))
    .eq("status", CTO_STATUSES.APPROVED)
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
    .insert(
      toDbPayload({
        ...payload,
        status: payload.status ?? CTO_STATUSES.APPROVED,
      }),
    )
    .select(CTO_ENTRY_SELECT)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const createCtoRequest = async (payload) => {
  const balance = computeBalance(payload);
  return createCtoEntry({
    ...payload,
    balanceHours: balance.hours,
    balanceMinutes: balance.minutes,
    status: CTO_STATUSES.PENDING,
  });
};

export const updateCtoEntry = async (id, payload) => {
  const { data, error } = await supabase
    .from("cto_entries")
    .update(toDbPayload(payload))
    .eq("id", Number(id))
    .select(CTO_ENTRY_SELECT)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const approveCtoEntry = async (id) => {
  const { data: existing, error: fetchError } = await supabase
    .from("cto_entries")
    .select(CTO_ENTRY_SELECT)
    .eq("id", Number(id))
    .single();

  if (fetchError) return { data: null, error: fetchError };
  if (existing.status !== CTO_STATUSES.PENDING) {
    return {
      data: null,
      error: { message: "This entry is no longer pending approval." },
    };
  }

  const balance = computeBalance({
    overtimeHours: existing.overtime_hours,
    overtimeMinutes: existing.overtime_minutes,
    offsetHours: existing.offset_hours,
    offsetMinutes: existing.offset_minutes,
  });

  const { data, error } = await supabase
    .from("cto_entries")
    .update({
      status: CTO_STATUSES.APPROVED,
      balance_hours: balance.hours,
      balance_minutes: balance.minutes,
      rejection_reason: null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
    .select(CTO_ENTRY_SELECT)
    .single();

  if (error) return { data: null, error };

  await syncBalancesForProfile(existing.profile_id);
  return { data: data ? mapRow(data) : null, error: null };
};

export const rejectCtoEntry = async (id, rejectionReason) => {
  const { data, error } = await supabase
    .from("cto_entries")
    .update({
      status: CTO_STATUSES.REJECTED,
      rejection_reason: rejectionReason.trim(),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
    .eq("status", CTO_STATUSES.PENDING)
    .select(CTO_ENTRY_SELECT)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const deleteCtoEntry = async (id) => {
  // Fetch the entry first so we can clean up its image from storage
  const { data: existing } = await supabase
    .from("cto_entries")
    .select("image_url")
    .eq("id", Number(id))
    .maybeSingle();

  const { error } = await supabase
    .from("cto_entries")
    .delete()
    .eq("id", Number(id));

  if (!error && existing?.image_url) {
    // Best-effort cleanup — don't block on storage errors
    await deleteCtoImage(existing.image_url).catch(() => {});
  }

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
  // 1. Fetch approved entries for this profile in chronological order
  const { data, error } = await supabase
    .from("cto_entries")
    .select(
      "id, overtime_hours, overtime_minutes, offset_hours, offset_minutes",
    )
    .eq("profile_id", Number(profileId))
    .eq("status", CTO_STATUSES.APPROVED)
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
