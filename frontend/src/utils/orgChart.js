import { compressImage } from "./compressImage";
import supabase from "./supabaseClient";

export const EMPLOYMENT_TYPES = [
  { value: "regular", label: "Regular Personnel" },
  { value: "contractual", label: "Contractual" },
];

const SELECT_COLS =
  "id, name, position, responsibilities, employment_type, photo_url, parent_id, sort_order, created_at, updated_at";

const mapRow = (row) => ({
  id: row.id,
  name: row.name,
  position: row.position,
  responsibilities: row.responsibilities ?? "",
  employmentType: row.employment_type ?? "regular",
  photoUrl: row.photo_url ?? "",
  parentId: row.parent_id ?? null,
  sortOrder: row.sort_order ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const trimOrEmpty = (value) => (typeof value === "string" ? value.trim() : "");

const toDbPayload = ({
  name,
  position,
  responsibilities,
  employmentType,
  photoUrl,
  parentId,
  sortOrder,
}) => ({
  name: name.trim(),
  position: position.trim(),
  responsibilities: trimOrEmpty(responsibilities) || null,
  employment_type: employmentType === "contractual" ? "contractual" : "regular",
  photo_url: trimOrEmpty(photoUrl) || null,
  parent_id:
    parentId === null || parentId === undefined || parentId === ""
      ? null
      : Number(parentId),
  sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
  updated_at: new Date().toISOString(),
});

/** Nests a flat list into a tree. Entries with a missing parent become roots. */
export const buildOrgTree = (entries) => {
  const byId = new Map(
    entries.map((entry) => [String(entry.id), { ...entry, children: [] }]),
  );
  const roots = [];

  for (const node of byId.values()) {
    const parent =
      node.parentId != null ? byId.get(String(node.parentId)) : null;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes) => {
    nodes.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
};

/** Ids of an entry and everything under it — invalid choices for a parent. */
export const collectDescendantIds = (entries, rootId) => {
  const blocked = new Set([String(rootId)]);
  let grew = true;

  while (grew) {
    grew = false;
    for (const entry of entries) {
      const key = String(entry.id);
      if (blocked.has(key)) continue;
      if (entry.parentId != null && blocked.has(String(entry.parentId))) {
        blocked.add(key);
        grew = true;
      }
    }
  }

  return blocked;
};

// ─── Photo storage ────────────────────────────────────────────────────────────
const PHOTO_BUCKET = "org-chart-photos";

const photoPathFromUrl = (url) => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
};

export const uploadOrgChartPhoto = async (file) => {
  if (!file) return { url: null, error: null };

  let uploadFile = file;
  try {
    uploadFile = await compressImage(file, {
      maxWidth: 800,
      maxHeight: 800,
      maxSizeBytes: 200 * 1024,
    });
  } catch (err) {
    return {
      url: null,
      error: { message: err?.message ?? "Failed to compress image." },
    };
  }

  const safeName = uploadFile.name.replace(/[^\w.\-]+/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, uploadFile, { upsert: false, contentType: uploadFile.type });

  if (error) return { url: null, error };

  const { data: urlData } = supabase.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(data.path);

  return { url: urlData?.publicUrl ?? null, error: null };
};

export const deleteOrgChartPhoto = async (url) => {
  const path = photoPathFromUrl(url);
  if (!path) return { error: null };
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  return { error };
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export const listOrgChart = async () => {
  const { data, error } = await supabase
    .from("org_chart")
    .select(SELECT_COLS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return { data: (data ?? []).map(mapRow), error };
};

export const createOrgChartEntry = async (fields) => {
  const { data, error } = await supabase
    .from("org_chart")
    .insert(toDbPayload(fields))
    .select(SELECT_COLS)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const updateOrgChartEntry = async (id, fields) => {
  const { data, error } = await supabase
    .from("org_chart")
    .update(toDbPayload(fields))
    .eq("id", Number(id))
    .select(SELECT_COLS)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const deleteOrgChartEntry = async (id) => {
  const { error } = await supabase
    .from("org_chart")
    .delete()
    .eq("id", Number(id));

  return { error };
};
