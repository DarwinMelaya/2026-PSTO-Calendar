import supabase from "./supabaseClient";
import { compressImage } from "./compressImage";

export const PROJECT_PROGRAMS = [
  { value: "SETUP", label: "SETUP" },
  { value: "GIA", label: "GIA" },
  { value: "SSCP", label: "SSCP" },
  { value: "CEST", label: "CEST" },
];

export const PERIOD_FILTERS = [
  { value: "all", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
];

const PHOTO_BUCKET = "project-timeline-photos";

export const projectProgramLabel = (value) =>
  PROJECT_PROGRAMS.find((p) => p.value === value)?.label ?? value ?? "—";

export const formatEntryDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getPeriodRange = (period) => {
  if (period === "all") return null;

  const now = new Date();
  const today = startOfDay(now);

  if (period === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: startOfDay(start), end: startOfDay(end) };
  }

  if (period === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: startOfDay(start), end: startOfDay(end) };
  }

  if (period === "last_3_months") {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return { start: startOfDay(start), end: today };
  }

  return null;
};

export const isDateInPeriod = (value, period) => {
  const range = getPeriodRange(period);
  if (!range) return true;
  const d = parseDateOnly(value);
  if (!d) return false;
  const t = startOfDay(d).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
};

const photoPathFromUrl = (url) => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
};

export const uploadProjectTimelinePhoto = async (file) => {
  if (!file) {
    return { url: null, error: null, originalSize: null, compressedSize: null };
  }

  const originalSize = file.size;
  let uploadFile = file;

  try {
    uploadFile = await compressImage(file);
  } catch (compressionError) {
    return {
      url: null,
      error: {
        message:
          compressionError?.message ?? "Failed to compress image before upload.",
      },
      originalSize,
      compressedSize: null,
    };
  }

  const safeName = uploadFile.name.replace(/[^\w.\-]+/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, uploadFile, {
      upsert: false,
      contentType: uploadFile.type,
    });

  if (error) {
    return { url: null, error, originalSize, compressedSize: uploadFile.size };
  }

  const { data: urlData } = supabase.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    error: null,
    originalSize,
    compressedSize: uploadFile.size,
  };
};

export const deleteProjectTimelinePhoto = async (photoUrl) => {
  const path = photoPathFromUrl(photoUrl);
  if (!path) return { error: null };

  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  return { error };
};

export const createMonitoringProject = async ({
  program,
  title,
  location,
  createdBy,
}) => {
  const { data, error } = await supabase
    .from("monitoring_projects")
    .insert({
      program,
      title: title.trim(),
      location: location?.trim() || null,
      created_by: createdBy ?? null,
    })
    .select("id, program, title, location, created_by, created_at")
    .single();

  return { data, error };
};

export const updateMonitoringProject = async (
  id,
  { program, title, location },
) => {
  const { data, error } = await supabase
    .from("monitoring_projects")
    .update({
      program,
      title: title.trim(),
      location: location?.trim() || null,
    })
    .eq("id", id)
    .select("id, program, title, location, created_by, created_at")
    .single();

  return { data, error };
};

export const deleteMonitoringProject = async (id) => {
  const { data: entries } = await supabase
    .from("project_timeline_entries")
    .select("photo_url")
    .eq("project_id", id);

  const { error } = await supabase
    .from("monitoring_projects")
    .delete()
    .eq("id", id);

  if (error) {
    return { error };
  }

  for (const entry of entries ?? []) {
    if (entry.photo_url) {
      await deleteProjectTimelinePhoto(entry.photo_url);
    }
  }

  return { error: null };
};

export const listMonitoringProjects = async () => {
  const { data, error } = await supabase
    .from("monitoring_projects")
    .select(
      `
      id,
      program,
      title,
      location,
      created_by,
      created_at,
      project_timeline_entries (
        id,
        entry_date,
        remarks,
        photo_url,
        created_at
      )
    `,
    )
    .order("created_at", { ascending: false });

  return { data, error };
};

export const createTimelineEntry = async ({
  projectId,
  entryDate,
  remarks,
  photoUrl,
}) => {
  const { data, error } = await supabase
    .from("project_timeline_entries")
    .insert({
      project_id: projectId,
      entry_date: entryDate,
      remarks: remarks?.trim() || null,
      photo_url: photoUrl || null,
    })
    .select("id, project_id, entry_date, remarks, photo_url, created_at")
    .single();

  return { data, error };
};

export const updateTimelineEntry = async (
  id,
  { entryDate, remarks, photoUrl },
) => {
  const { data, error } = await supabase
    .from("project_timeline_entries")
    .update({
      entry_date: entryDate,
      remarks: remarks?.trim() || null,
      photo_url: photoUrl || null,
    })
    .eq("id", id)
    .select("id, project_id, entry_date, remarks, photo_url, created_at")
    .single();

  return { data, error };
};

export const deleteTimelineEntry = async (id, { photoUrl } = {}) => {
  const { error } = await supabase
    .from("project_timeline_entries")
    .delete()
    .eq("id", id);

  if (error) {
    return { error };
  }

  if (photoUrl) {
    await deleteProjectTimelinePhoto(photoUrl);
  }

  return { error: null };
};

export const getProjectSummary = (project) => {
  const entries = project?.project_timeline_entries ?? [];
  const sorted = [...entries].sort((a, b) => {
    const da = parseDateOnly(a.entry_date)?.getTime() ?? 0;
    const db = parseDateOnly(b.entry_date)?.getTime() ?? 0;
    if (db !== da) return db - da;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return {
    entryCount: entries.length,
    lastEntryDate: sorted[0]?.entry_date ?? null,
    lastRemarks: sorted[0]?.remarks ?? null,
  };
};

export const sortTimelineEntriesAsc = (entries) =>
  [...(entries ?? [])].sort((a, b) => {
    const da = parseDateOnly(a.entry_date)?.getTime() ?? 0;
    const db = parseDateOnly(b.entry_date)?.getTime() ?? 0;
    if (da !== db) return da - db;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

export const groupEntriesByMonth = (entries) => {
  const groups = [];
  let current = null;

  for (const entry of sortTimelineEntriesAsc(entries)) {
    const d = parseDateOnly(entry.entry_date);
    if (!d) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

    if (!current || current.key !== key) {
      current = { key, label, entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }

  return groups;
};

export const inferEntryStatus = (remarks) => {
  const text = (remarks ?? "").toLowerCase();
  if (
    /problem|issue|delay|concern|failed|error|stuck|cannot|unable|pending|blocked|hindi|walang/.test(
      text,
    )
  ) {
    return "issue";
  }
  if (
    /resolved|fixed|completed|approved|solution|naayos|done|finished|success|implemented|signed/.test(
      text,
    )
  ) {
    return "resolved";
  }
  return "update";
};

export const ENTRY_STATUS_META = {
  issue: {
    label: "Issue",
    dotClass: "bg-amber-500 ring-amber-200",
    badgeClass: "bg-amber-100 text-amber-900 ring-amber-300/60",
    cardBorder: "border-amber-200/80",
  },
  resolved: {
    label: "Resolved",
    dotClass: "bg-emerald-500 ring-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-900 ring-emerald-300/60",
    cardBorder: "border-emerald-200/80",
  },
  update: {
    label: "Update",
    dotClass: "bg-blue-500 ring-blue-200",
    badgeClass: "bg-blue-100 text-blue-900 ring-blue-300/60",
    cardBorder: "border-slate-200/80",
  },
};

export const summarizeMonth = (entries) => {
  const counts = { issue: 0, resolved: 0, update: 0 };
  for (const entry of entries) {
    counts[inferEntryStatus(entry.remarks)] += 1;
  }

  const parts = [];
  if (counts.update) parts.push(`${counts.update} update${counts.update === 1 ? "" : "s"}`);
  if (counts.issue) parts.push(`${counts.issue} issue${counts.issue === 1 ? "" : "s"}`);
  if (counts.resolved) {
    parts.push(`${counts.resolved} resolved`);
  }

  return parts.join(" · ") || `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
};
