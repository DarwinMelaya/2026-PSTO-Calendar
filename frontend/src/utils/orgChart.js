import { compressImage } from "./compressImage";
import supabase from "./supabaseClient";

export const EMPLOYMENT_TYPES = [
  { value: "regular", label: "Regular Personnel" },
  { value: "contractual", label: "Contractual" },
];

export const ELEMENT_TYPES = {
  PERSON: "person",
  TEXT: "text",
  LINE: "line",
};

/** Card footprint used by auto-layout and connector anchors. */
export const PERSON_CARD_WIDTH = 208;
export const PERSON_CARD_HEIGHT = 250;

const SELECT_COLS =
  "id, element_type, name, position, responsibilities, employment_type, photo_url, parent_id, from_id, to_id, sort_order, pos_x, pos_y, width, height, text_content, font_size, color, has_arrow, created_at, updated_at";

const mapRow = (row) => ({
  id: row.id,
  elementType: row.element_type ?? ELEMENT_TYPES.PERSON,
  name: row.name ?? "",
  position: row.position ?? "",
  responsibilities: row.responsibilities ?? "",
  employmentType: row.employment_type ?? "regular",
  photoUrl: row.photo_url ?? "",
  parentId: row.parent_id ?? null,
  fromId: row.from_id ?? null,
  toId: row.to_id ?? null,
  sortOrder: row.sort_order ?? 0,
  posX: row.pos_x ?? null,
  posY: row.pos_y ?? null,
  width: row.width ?? null,
  height: row.height ?? null,
  textContent: row.text_content ?? "",
  fontSize: row.font_size ?? null,
  color: row.color ?? "",
  hasArrow: row.has_arrow ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const trimOrEmpty = (value) => (typeof value === "string" ? value.trim() : "");

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Only maps the keys actually present, so partial updates stay partial. */
const toDbPayload = (fields) => {
  const payload = { updated_at: new Date().toISOString() };

  if ("elementType" in fields) payload.element_type = fields.elementType;
  if ("name" in fields) payload.name = trimOrEmpty(fields.name) || null;
  if ("position" in fields)
    payload.position = trimOrEmpty(fields.position) || null;
  if ("responsibilities" in fields)
    payload.responsibilities = trimOrEmpty(fields.responsibilities) || null;
  if ("employmentType" in fields)
    payload.employment_type =
      fields.employmentType === "contractual" ? "contractual" : "regular";
  if ("photoUrl" in fields)
    payload.photo_url = trimOrEmpty(fields.photoUrl) || null;
  if ("parentId" in fields) payload.parent_id = numberOrNull(fields.parentId);
  if ("fromId" in fields) payload.from_id = numberOrNull(fields.fromId);
  if ("toId" in fields) payload.to_id = numberOrNull(fields.toId);
  if ("sortOrder" in fields) payload.sort_order = numberOrNull(fields.sortOrder) ?? 0;
  if ("posX" in fields) payload.pos_x = numberOrNull(fields.posX);
  if ("posY" in fields) payload.pos_y = numberOrNull(fields.posY);
  if ("width" in fields) payload.width = numberOrNull(fields.width);
  if ("height" in fields) payload.height = numberOrNull(fields.height);
  if ("textContent" in fields) payload.text_content = fields.textContent ?? null;
  if ("fontSize" in fields) payload.font_size = numberOrNull(fields.fontSize);
  if ("color" in fields) payload.color = trimOrEmpty(fields.color) || null;
  if ("hasArrow" in fields) payload.has_arrow = Boolean(fields.hasArrow);

  return payload;
};

/** Nests person entries into a tree. Entries with a missing parent become roots. */
export const buildOrgTree = (entries) => {
  const people = entries.filter((e) => e.elementType === ELEMENT_TYPES.PERSON);
  const byId = new Map(
    people.map((entry) => [String(entry.id), { ...entry, children: [] }]),
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

/**
 * Tidy top-down tree coordinates for every person.
 * Returns [{ id, posX, posY }] — siblings are packed left to right.
 */
export const autoLayoutPositions = (
  entries,
  { originX = 80, originY = 120, gapX = 32, gapY = 90 } = {},
) => {
  const roots = buildOrgTree(entries);
  const results = [];
  let cursorX = originX;

  const place = (node, depth) => {
    const posY = originY + depth * (PERSON_CARD_HEIGHT + gapY);

    if (node.children.length === 0) {
      const posX = cursorX;
      cursorX += PERSON_CARD_WIDTH + gapX;
      results.push({ id: node.id, posX, posY });
      return posX;
    }

    const childCenters = node.children.map((child) => place(child, depth + 1));
    const posX =
      (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    results.push({ id: node.id, posX, posY });
    return posX;
  };

  roots.forEach((root) => place(root, 0));

  return results;
};

// ─── Connector geometry ───────────────────────────────────────────────────────

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const centerOf = (rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

/** Middle of each side of a card — where a connector may dock. */
export const sideAnchors = (rect) => ({
  top: { x: rect.x + rect.w / 2, y: rect.y },
  right: { x: rect.x + rect.w, y: rect.y + rect.h / 2 },
  bottom: { x: rect.x + rect.w / 2, y: rect.y + rect.h },
  left: { x: rect.x, y: rect.y + rect.h / 2 },
});

const nearestAnchor = (rect, target) =>
  Object.values(sideAnchors(rect)).reduce((best, anchor) =>
    distance(anchor, target) < distance(best, target) ? anchor : best,
  );

/**
 * Endpoints of a line. Ends attached to a card dock on the side facing the
 * other end, so the connector follows whenever a card is dragged.
 */
export const resolveLineEndpoints = (line, rectById) => {
  const fromRect =
    line.fromId != null ? rectById.get(String(line.fromId)) : null;
  const toRect = line.toId != null ? rectById.get(String(line.toId)) : null;

  const freeStart = { x: line.posX ?? 0, y: line.posY ?? 0 };
  const freeEnd = {
    x: freeStart.x + (line.width ?? 0),
    y: freeStart.y + (line.height ?? 0),
  };

  if (fromRect && toRect) {
    const fromAnchors = sideAnchors(fromRect);
    const toAnchors = sideAnchors(toRect);

    // Keep hierarchy branches on common bottom/top anchors. Multiple targets
    // on one row then overlap into one horizontal trunk with separate arrows.
    if (toRect.y >= fromRect.y + fromRect.h) {
      return { start: fromAnchors.bottom, end: toAnchors.top };
    }
    if (fromRect.y >= toRect.y + toRect.h) {
      return { start: fromAnchors.top, end: toAnchors.bottom };
    }

    return centerOf(toRect).x >= centerOf(fromRect).x
      ? { start: fromAnchors.right, end: toAnchors.left }
      : { start: fromAnchors.left, end: toAnchors.right };
  }

  const start = fromRect ? nearestAnchor(fromRect, freeEnd) : freeStart;
  const end = toRect ? nearestAnchor(toRect, start) : freeEnd;

  return { start, end };
};

/**
 * Route a connector with 90-degree elbows. Vertical routes match a standard
 * org chart; horizontal routes are used when cards sit beside each other.
 */
export const orthogonalConnectorPoints = (start, end) => {
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);

  if (deltaY >= deltaX) {
    const midY = start.y + (end.y - start.y) / 2;
    return `${start.x},${start.y} ${start.x},${midY} ${end.x},${midY} ${end.x},${end.y}`;
  }

  const midX = start.x + (end.x - start.x) / 2;
  return `${start.x},${start.y} ${midX},${start.y} ${midX},${end.y} ${end.x},${end.y}`;
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
    .order("id", { ascending: true });

  return { data: (data ?? []).map(mapRow), error };
};

export const createOrgChartEntry = async (fields) => {
  const { data, error } = await supabase
    .from("org_chart")
    .insert(toDbPayload({ elementType: ELEMENT_TYPES.PERSON, ...fields }))
    .select(SELECT_COLS)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const createTextElement = async ({
  textContent = "Text",
  posX = 60,
  posY = 60,
  width = 240,
  fontSize = 18,
  color = "#0f172a",
}) => {
  const { data, error } = await supabase
    .from("org_chart")
    .insert(
      toDbPayload({
        elementType: ELEMENT_TYPES.TEXT,
        textContent,
        posX,
        posY,
        width,
        fontSize,
        color,
      }),
    )
    .select(SELECT_COLS)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

/**
 * Lines store their start in pos_x/pos_y and their delta in width/height.
 * An end attached to a card (fromId / toId) ignores those coordinates.
 */
export const createLineElement = async ({
  posX = 60,
  posY = 60,
  width = 200,
  height = 0,
  color = "#475569",
  fromId = null,
  toId = null,
  hasArrow = false,
}) => {
  const { data, error } = await supabase
    .from("org_chart")
    .insert(
      toDbPayload({
        elementType: ELEMENT_TYPES.LINE,
        posX,
        posY,
        width,
        height,
        color,
        fromId,
        toId,
        hasArrow,
      }),
    )
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

export const saveElementGeometry = async (id, geometry) => {
  const { error } = await supabase
    .from("org_chart")
    .update(toDbPayload(geometry))
    .eq("id", Number(id));

  return { error };
};

export const saveManyPositions = async (positions) => {
  const results = await Promise.all(
    positions.map(({ id, posX, posY }) =>
      saveElementGeometry(id, { posX, posY }),
    ),
  );

  return { error: results.find((r) => r.error)?.error ?? null };
};

export const deleteOrgChartEntry = async (id) => {
  const { error } = await supabase
    .from("org_chart")
    .delete()
    .eq("id", Number(id));

  return { error };
};
