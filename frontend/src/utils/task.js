import supabase from "./supabaseClient";
import { compressImage } from "./compressImage";
import { stripHtmlTags } from "./richText";

export const TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

/** PSTO program choices (stored on tasks.program; options live in add/edit modals). */
export const TASK_PROGRAMS = [
  { value: "GIA", label: "GIA" },
  { value: "SSCP", label: "SSCP" },
  { value: "CEST", label: "CEST" },
  { value: "SETUP", label: "SETUP" },
  { value: "Scholarship", label: "Scholarship" },
  { value: "Other", label: "Other" },
];

export const taskProgramLabel = (value) =>
  TASK_PROGRAMS.find((p) => p.value === value)?.label ?? value ?? "—";

export const isTaskPriority = (task) => Boolean(task?.is_priority);

const STATUS_REQUEST_PREFIX = "[[STATUS_REQUEST:";
const STATUS_REQUEST_SUFFIX = "]]";
const TASK_GROUP_PREFIX = "[[TASK_GROUP:";
const TASK_GROUP_SUFFIX = "]]";
const COMPLETED_AT_PREFIX = "[[COMPLETED_AT:";
const COMPLETED_AT_SUFFIX = "]]";
const PROOF_URL_PREFIX = "[[PROOF_URL:";
const PROOF_URL_SUFFIX = "]]";
const REJECTION_INFO_PREFIX = "[[REJECTION_INFO:";
const REJECTION_INFO_SUFFIX = "]]";
const SUB_TASKS_PREFIX = "[[SUB_TASKS:";
const SUB_TASKS_SUFFIX = "]]";
const INSTRUCTION_IMAGE_PREFIX = "[[INSTRUCTION_IMAGE:";
const INSTRUCTION_IMAGE_SUFFIX = "]]";
const PROOF_BUCKET = "task-completion-proofs";
const INSTRUCTION_IMAGE_BUCKET = "task-instruction-images";

/** True when a proof URL should be shown as an image (upload / image file). */
export const isImageProofUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("blob:")) return true;
  const path = url.toLowerCase().split("?")[0].split("#")[0];
  if (/\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/.test(path)) return true;
  if (path.includes(`/${PROOF_BUCKET}/`)) return true;
  return false;
};

/** Normalize a user-entered proof link (adds https:// when missing). */
export const normalizeProofLink = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const emptySubTask = () => ({ title: "", remarks: "" });

export const normalizeSubTasks = (subTasks) => {
  if (!Array.isArray(subTasks)) return [];
  return subTasks
    .map((item) => ({
      title: typeof item?.title === "string" ? item.title.trim() : "",
      remarks: typeof item?.remarks === "string" ? item.remarks.trim() : "",
    }))
    .filter((item) => item.title || item.remarks);
};

/** Extract trailing `prefix...suffix` marker without RegExp (prefix has `[` chars). */
const extractTrailingMarker = (raw, prefix, suffix) => {
  if (!raw.endsWith(suffix)) {
    return { remaining: raw, payload: null };
  }

  const prefixIdx = raw.lastIndexOf(prefix);
  if (prefixIdx === -1) {
    return { remaining: raw, payload: null };
  }

  const payload = raw
    .slice(prefixIdx + prefix.length, raw.length - suffix.length)
    .trim();
  let remaining = raw.slice(0, prefixIdx);
  if (remaining.endsWith("\n")) remaining = remaining.slice(0, -1);

  return {
    remaining: remaining.trim(),
    payload: payload || null,
  };
};

/** Accept only real http(s) instruction image URLs — drop marker junk / empty payloads. */
export const isInstructionImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.includes("[[") || trimmed.includes("]]")) return false;
  if (/\s/.test(trimmed)) return false;
  return true;
};

const extractSubTasksMarker = (raw) => {
  const { remaining, payload } = extractTrailingMarker(
    raw,
    SUB_TASKS_PREFIX,
    SUB_TASKS_SUFFIX,
  );
  if (!payload) {
    return { cleanActivities: remaining, subTasks: [] };
  }

  let subTasks = [];
  try {
    const parsed = JSON.parse(payload);
    if (Array.isArray(parsed)) {
      subTasks = normalizeSubTasks(parsed);
    }
  } catch {
    // ignore malformed marker
  }

  return { cleanActivities: remaining, subTasks };
};

const extractInstructionImageMarker = (raw) => {
  const { remaining, payload } = extractTrailingMarker(
    raw,
    INSTRUCTION_IMAGE_PREFIX,
    INSTRUCTION_IMAGE_SUFFIX,
  );
  return {
    cleanActivities: remaining,
    instructionImageUrl: isInstructionImageUrl(payload) ? payload.trim() : null,
  };
};

/** Also strip a mid-string instruction marker left by older broken parsers. */
const stripLooseInstructionImageMarker = (raw) => {
  const start = raw.indexOf(INSTRUCTION_IMAGE_PREFIX);
  if (start === -1) return { cleanActivities: raw, instructionImageUrl: null };

  const afterPrefix = start + INSTRUCTION_IMAGE_PREFIX.length;
  const end = raw.indexOf(INSTRUCTION_IMAGE_SUFFIX, afterPrefix);
  if (end === -1) {
    // Truncated marker (no closing ]]) — drop from prefix to end.
    return {
      cleanActivities: raw.slice(0, start).trim(),
      instructionImageUrl: null,
    };
  }

  const payload = raw.slice(afterPrefix, end).trim();
  const before = raw.slice(0, start).trim();
  const after = raw.slice(end + INSTRUCTION_IMAGE_SUFFIX.length).trim();
  const cleanActivities = [before, after].filter(Boolean).join("\n");

  return {
    cleanActivities,
    instructionImageUrl: isInstructionImageUrl(payload) ? payload : null,
  };
};

export const parseTaskActivities = (activities) => {
  const raw = (activities ?? "").trim();
  if (!raw) {
    return { cleanActivities: "", subTasks: [], instructionImageUrl: null };
  }

  let { cleanActivities: afterImage, instructionImageUrl } =
    extractInstructionImageMarker(raw);

  if (!instructionImageUrl && afterImage.includes(INSTRUCTION_IMAGE_PREFIX)) {
    const loose = stripLooseInstructionImageMarker(afterImage);
    afterImage = loose.cleanActivities;
    instructionImageUrl = loose.instructionImageUrl;
  }

  const { cleanActivities, subTasks } = extractSubTasksMarker(afterImage);

  return { cleanActivities, subTasks, instructionImageUrl };
};

const composeTaskActivities = ({ activities, subTasks, instructionImageUrl }) => {
  const { cleanActivities } = parseTaskActivities(activities);
  const normalizedSubTasks = normalizeSubTasks(subTasks);
  const subTasksMarker =
    normalizedSubTasks.length > 0
      ? `${SUB_TASKS_PREFIX}${JSON.stringify(normalizedSubTasks)}${SUB_TASKS_SUFFIX}`
      : "";
  const imageMarker =
    isInstructionImageUrl(instructionImageUrl)
      ? `${INSTRUCTION_IMAGE_PREFIX}${instructionImageUrl.trim()}${INSTRUCTION_IMAGE_SUFFIX}`
      : "";

  const parts = [cleanActivities, subTasksMarker, imageMarker].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : "";
};

export const formatActivitiesPreview = (activities) => {
  const { cleanActivities, subTasks } = parseTaskActivities(activities);
  const activityText = stripHtmlTags(cleanActivities);
  const subLines = subTasks.map((item, index) => {
    const title = item.title || `Sub-task ${index + 1}`;
    return item.remarks ? `${title} — ${item.remarks}` : title;
  });
  const parts = [activityText, ...subLines].filter(Boolean);
  return parts.join("\n");
};

export const parseTaskRemarks = (remarks) => {
  const raw = (remarks ?? "").trim();
  if (!raw)
    return {
      cleanRemarks: "",
      requestedStatus: null,
      groupKey: null,
      completedAt: null,
      proofUrl: null,
      rejectionRemarks: null,
      rejectedStatus: null,
    };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let requestedStatus = null;
  let groupKey = null;
  let completedAt = null;
  let proofUrl = null;
  let rejectionRemarks = null;
  let rejectedStatus = null;
  const cleanLines = [];

  for (const line of lines) {
    if (
      line.startsWith(STATUS_REQUEST_PREFIX) &&
      line.endsWith(STATUS_REQUEST_SUFFIX)
    ) {
      const value = line.slice(
        STATUS_REQUEST_PREFIX.length,
        line.length - STATUS_REQUEST_SUFFIX.length,
      );
      requestedStatus = value || null;
      continue;
    }
    if (line.startsWith(TASK_GROUP_PREFIX) && line.endsWith(TASK_GROUP_SUFFIX)) {
      const value = line.slice(
        TASK_GROUP_PREFIX.length,
        line.length - TASK_GROUP_SUFFIX.length,
      );
      groupKey = value || null;
      continue;
    }
    if (
      line.startsWith(COMPLETED_AT_PREFIX) &&
      line.endsWith(COMPLETED_AT_SUFFIX)
    ) {
      const value = line.slice(
        COMPLETED_AT_PREFIX.length,
        line.length - COMPLETED_AT_SUFFIX.length,
      );
      completedAt = value || null;
      continue;
    }
    if (line.startsWith(PROOF_URL_PREFIX) && line.endsWith(PROOF_URL_SUFFIX)) {
      const value = line.slice(
        PROOF_URL_PREFIX.length,
        line.length - PROOF_URL_SUFFIX.length,
      );
      proofUrl = value || null;
      continue;
    }
    if (
      line.startsWith(REJECTION_INFO_PREFIX) &&
      line.endsWith(REJECTION_INFO_SUFFIX)
    ) {
      const payload = line.slice(
        REJECTION_INFO_PREFIX.length,
        line.length - REJECTION_INFO_SUFFIX.length,
      );
      try {
        const parsed = JSON.parse(payload);
        rejectionRemarks =
          typeof parsed?.remarks === "string" ? parsed.remarks.trim() : null;
        rejectedStatus =
          typeof parsed?.status === "string" ? parsed.status.trim() : null;
      } catch {
        // ignore malformed marker
      }
      continue;
    }
    cleanLines.push(line);
  }

  return {
    cleanRemarks: cleanLines.join("\n"),
    requestedStatus,
    groupKey,
    completedAt,
    proofUrl,
    rejectionRemarks: rejectionRemarks || null,
    rejectedStatus: rejectedStatus || null,
  };
};

const composeTaskRemarks = ({
  remarks,
  requestedStatus,
  groupKey,
  completedAt,
  proofUrl,
  rejectionRemarks,
  rejectedStatus,
}) => {
  const parsed = parseTaskRemarks(remarks);
  const cleanRemarks = parsed.cleanRemarks;
  const effectiveRejectionRemarks =
    rejectionRemarks !== undefined ? rejectionRemarks : parsed.rejectionRemarks;
  const effectiveRejectedStatus =
    rejectedStatus !== undefined ? rejectedStatus : parsed.rejectedStatus;
  const marker = requestedStatus
    ? `${STATUS_REQUEST_PREFIX}${requestedStatus}${STATUS_REQUEST_SUFFIX}`
    : "";
  const groupMarker = groupKey
    ? `${TASK_GROUP_PREFIX}${groupKey}${TASK_GROUP_SUFFIX}`
    : "";
  const completedMarker = completedAt
    ? `${COMPLETED_AT_PREFIX}${completedAt}${COMPLETED_AT_SUFFIX}`
    : "";
  const proofMarker = proofUrl
    ? `${PROOF_URL_PREFIX}${proofUrl}${PROOF_URL_SUFFIX}`
    : "";
  const rejectionMarker =
    effectiveRejectionRemarks || effectiveRejectedStatus
      ? `${REJECTION_INFO_PREFIX}${JSON.stringify({
          status: effectiveRejectedStatus || null,
          remarks: effectiveRejectionRemarks?.trim() || "",
        })}${REJECTION_INFO_SUFFIX}`
      : "";

  const parts = [
    cleanRemarks.trim(),
    marker,
    groupMarker,
    completedMarker,
    proofMarker,
    rejectionMarker,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : null;
};

const instructionImagePathFromUrl = (url) => {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${INSTRUCTION_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length);
};

export const uploadTaskInstructionImage = async (file) => {
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
    .from(INSTRUCTION_IMAGE_BUCKET)
    .upload(path, uploadFile, {
      upsert: false,
      contentType: uploadFile.type,
    });

  if (error) {
    return { url: null, error, originalSize, compressedSize: uploadFile.size };
  }

  const { data: urlData } = supabase.storage
    .from(INSTRUCTION_IMAGE_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    error: null,
    originalSize,
    compressedSize: uploadFile.size,
  };
};

export const deleteTaskInstructionImage = async (imageUrl) => {
  const path = instructionImagePathFromUrl(imageUrl);
  if (!path) return { error: null };

  const { error } = await supabase.storage
    .from(INSTRUCTION_IMAGE_BUCKET)
    .remove([path]);
  return { error };
};

export const uploadTaskCompletionProof = async (file) => {
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
    .from(PROOF_BUCKET)
    .upload(path, uploadFile, {
      upsert: false,
      contentType: uploadFile.type,
    });

  if (error) {
    return { url: null, error, originalSize, compressedSize: uploadFile.size };
  }

  const { data: urlData } = supabase.storage
    .from(PROOF_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    error: null,
    originalSize,
    compressedSize: uploadFile.size,
  };
};

const createGroupKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeResponsibleIds = (responsibleId) => {
  const list = Array.isArray(responsibleId) ? responsibleId : [responsibleId];
  return Array.from(
    new Set(
      list
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );
};

/** Stored in DB when the user leaves deadline empty (column stays NOT NULL). */
export const NO_DEADLINE = "9999-12-31";

export const hasDeadline = (value) => {
  if (!value) return false;
  return String(value).slice(0, 10) !== NO_DEADLINE;
};

export const resolveDeadlineForDb = (deadline) => {
  const trimmed = typeof deadline === "string" ? deadline.trim() : deadline;
  if (trimmed) return trimmed;
  return NO_DEADLINE;
};

export const deadlineTimeForForm = (value) => {
  if (!value) return "";
  const str = String(value).trim();
  if (!str) return "";
  // Supabase may return `HH:MM:SS` for `time` columns.
  return str.slice(0, 5);
};

export const normalizeDeadlineTimeForDb = (deadline, deadlineTime) => {
  if (!hasDeadline(deadline)) return null;
  if (!deadlineTime) return null;

  const str = String(deadlineTime).trim();
  if (!str) return null;

  // Accept `HH:MM` or `HH:MM:SS`, normalize to `HH:MM:SS`.
  if (/^\d{2}:\d{2}$/.test(str)) return `${str}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str;

  return null;
};

export const normalizeActivities = (activities, subTasks, instructionImageUrl) =>
  composeTaskActivities({ activities, subTasks, instructionImageUrl });

export const deadlineForForm = (value) => (hasDeadline(value) ? value : "");

export const formatTaskDeadline = (value, deadlineTime) => {
  if (!hasDeadline(value)) return "—";

  const dateStr = new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const timeStr = deadlineTime ? String(deadlineTime).trim().slice(0, 5) : "";
  return timeStr ? `${dateStr} • ${timeStr}` : dateStr;
};

export const createTask = async ({
  taskDate,
  agenda,
  activities,
  subTasks,
  instructionImageUrl,
  deadline,
  deadlineTime,
  responsibleId,
  status,
  program,
  remarks,
  isPriority = false,
}) => {
  const resolvedDeadline = resolveDeadlineForDb(deadline);
  const resolvedDeadlineTime = normalizeDeadlineTimeForDb(
    resolvedDeadline,
    deadlineTime,
  );
  const responsibleIds = normalizeResponsibleIds(responsibleId);
  if (responsibleIds.length === 0) {
    return {
      data: null,
      error: { message: "At least one person responsible is required." },
    };
  }
  const groupKey = createGroupKey();
  const composedRemarks = composeTaskRemarks({
    remarks,
    requestedStatus: null,
    groupKey,
    completedAt: status === "completed" ? new Date().toISOString() : null,
    proofUrl: null,
  });

  const { data, error } = await supabase
    .from("tasks")
    .insert(
      responsibleIds.map((id) => ({
        task_date: taskDate,
        agenda: agenda.trim(),
        activities: normalizeActivities(activities, subTasks, instructionImageUrl),
        deadline: resolvedDeadline,
        deadline_time: resolvedDeadlineTime,
        responsible_id: id,
        status,
        program: program || "Other",
        is_priority: Boolean(isPriority),
        remarks: composedRemarks,
      })),
    )
    .select(
      "id, task_date, agenda, activities, deadline, deadline_time, status, program, is_priority, remarks, created_at, responsible_id",
    );

  return { data, error };
};

export const updateTask = async (
  id,
  {
    taskDate,
    agenda,
    activities,
    subTasks,
    instructionImageUrl,
    deadline,
    deadlineTime,
    responsibleId,
    status,
    program,
    remarks,
    isPriority = false,
    taskIds,
    groupKey,
    existingRemarks,
    preservePendingRequest = false,
  },
) => {
  const responsibleIds = normalizeResponsibleIds(responsibleId);
  if (responsibleIds.length === 0) {
    return {
      data: null,
      error: { message: "At least one person responsible is required." },
    };
  }
  const resolvedDeadline = resolveDeadlineForDb(deadline);
  const resolvedDeadlineTime = normalizeDeadlineTimeForDb(
    resolvedDeadline,
    deadlineTime,
  );
  const existingMeta = parseTaskRemarks(existingRemarks ?? null);
  const effectiveGroupKey =
    groupKey || existingMeta.groupKey || parseTaskRemarks(remarks).groupKey || createGroupKey();
  const effectiveCompletedAt =
    status === "completed"
      ? existingMeta.completedAt || new Date().toISOString()
      : null;
  const composedRemarks = composeTaskRemarks({
    remarks,
    requestedStatus: preservePendingRequest
      ? existingMeta.requestedStatus
      : null,
    groupKey: effectiveGroupKey,
    completedAt: effectiveCompletedAt,
    proofUrl: existingMeta.proofUrl,
    rejectionRemarks: existingMeta.rejectionRemarks,
    rejectedStatus: existingMeta.rejectedStatus,
  });

  const basePayload = {
    task_date: taskDate,
    agenda: agenda.trim(),
    activities: normalizeActivities(activities, subTasks, instructionImageUrl),
    deadline: resolvedDeadline,
    deadline_time: resolvedDeadlineTime,
    status,
    program: program || "Other",
    is_priority: Boolean(isPriority),
    remarks: composedRemarks,
  };

  const sourceIds = Array.isArray(taskIds) && taskIds.length > 0 ? taskIds : [id];
  const normalizedSourceIds = sourceIds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  const idsForUpdate = normalizedSourceIds.slice(0, responsibleIds.length);
  const idsForDelete = normalizedSourceIds.slice(responsibleIds.length);
  const extraResponsibleIds = responsibleIds.slice(idsForUpdate.length);

  const updatedRows = [];
  for (let i = 0; i < idsForUpdate.length; i += 1) {
    const rowId = idsForUpdate[i];
    const rowResponsibleId = responsibleIds[i];
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({
        ...basePayload,
        responsible_id: rowResponsibleId,
      })
      .eq("id", rowId)
      .select(
        "id, task_date, agenda, activities, deadline, deadline_time, status, program, is_priority, remarks, created_at, responsible_id",
      )
      .single();
    if (updateError) {
      return { data: updatedRows, error: updateError };
    }
    updatedRows.push(updatedTask);
  }

  let createdRows = [];
  if (extraResponsibleIds.length > 0) {
    const { data: createdTasks, error: createError } = await supabase
      .from("tasks")
      .insert(
        extraResponsibleIds.map((rid) => ({
          ...basePayload,
          responsible_id: rid,
        })),
      )
      .select(
        "id, task_date, agenda, activities, deadline, deadline_time, status, program, is_priority, remarks, created_at, responsible_id",
      );
    if (createError) {
      return { data: updatedRows, error: createError };
    }
    createdRows = createdTasks ?? [];
  }

  if (idsForDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .in("id", idsForDelete);
    if (deleteError) {
      return { data: [...updatedRows, ...createdRows], error: deleteError };
    }
  }

  return { data: [...updatedRows, ...createdRows], error: null };
};

export const deleteTask = async (id) => {
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  return { error };
};

export const updateTaskRemarks = async (id, { cleanRemarks, existingRemarks }) => {
  const meta = parseTaskRemarks(existingRemarks);
  const { data, error } = await supabase
    .from("tasks")
    .update({
      remarks: composeTaskRemarks({
        remarks: cleanRemarks,
        requestedStatus: meta.requestedStatus,
        groupKey: meta.groupKey,
        completedAt: meta.completedAt,
        proofUrl: meta.proofUrl,
        rejectionRemarks: meta.rejectionRemarks,
        rejectedStatus: meta.rejectedStatus,
      }),
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, program, is_priority, remarks, created_at, responsible_id",
    )
    .single();

  return { data, error };
};

export const requestTaskStatusChange = async (
  id,
  { requestedStatus, remarks, groupKey, existingRemarks, proofUrl },
) => {
  const existingMeta = parseTaskRemarks(existingRemarks ?? remarks);
  const { data, error } = await supabase
    .from("tasks")
    .update({
      remarks: composeTaskRemarks({
        remarks,
        requestedStatus,
        groupKey: groupKey ?? existingMeta.groupKey,
        completedAt: existingMeta.completedAt,
        proofUrl: proofUrl ?? existingMeta.proofUrl,
        rejectionRemarks: null,
        rejectedStatus: null,
      }),
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, program, is_priority, remarks, created_at, responsible_id",
    )
    .single();

  return { data, error };
};

export const approveTaskStatusRequest = async ({ id, remarks }) => {
  const { requestedStatus, cleanRemarks, groupKey, completedAt, proofUrl } =
    parseTaskRemarks(remarks);
  if (!requestedStatus) {
    return {
      data: null,
      error: { message: "No pending status request found." },
    };
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({
      status: requestedStatus,
      remarks: composeTaskRemarks({
        remarks: cleanRemarks,
        requestedStatus: null,
        groupKey,
        completedAt:
          requestedStatus === "completed"
            ? completedAt || new Date().toISOString()
            : null,
        proofUrl,
        rejectionRemarks: null,
        rejectedStatus: null,
      }),
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, program, is_priority, remarks, created_at, responsible_id",
    )
    .single();

  return { data, error };
};

export const rejectTaskStatusRequest = async (
  { id, remarks },
  { rejectionRemarks } = {},
) => {
  const {
    cleanRemarks,
    groupKey,
    completedAt,
    proofUrl,
    requestedStatus,
  } = parseTaskRemarks(remarks);
  const trimmedRejection = rejectionRemarks?.trim();
  if (!trimmedRejection) {
    return {
      data: null,
      error: { message: "Please enter remarks explaining why the request was rejected." },
    };
  }
  const { data, error } = await supabase
    .from("tasks")
    .update({
      remarks: composeTaskRemarks({
        remarks: cleanRemarks,
        requestedStatus: null,
        groupKey,
        completedAt,
        proofUrl,
        rejectionRemarks: trimmedRejection,
        rejectedStatus: requestedStatus,
      }),
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, program, is_priority, remarks, created_at, responsible_id",
    )
    .single();

  return { data, error };
};

export const listTasks = async () => {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id,
      task_date,
      agenda,
      activities,
      deadline,
      deadline_time,
      status,
      program,
      is_priority,
      remarks,
      created_at,
      responsible_id,
      profiles ( code_name )
    `,
    )
    .order("task_date", { ascending: false })
    .order("created_at", { ascending: false });

  return { data, error };
};

export const listTasksForUser = async (responsibleId) => {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, task_date, agenda, activities, deadline, deadline_time, status, program, is_priority, remarks, created_at, responsible_id",
    )
    .eq("responsible_id", Number(responsibleId))
    .order("created_at", { ascending: false });

  return { data, error };
};

export const listAssignableProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, code_name")
    .not("code_name", "is", null)
    .neq("code_name", "")
    .order("code_name", { ascending: true });

  return { data, error };
};

export const deleteTasks = async (ids) => {
  const normalizedIds = (Array.isArray(ids) ? ids : [ids])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (normalizedIds.length === 0) {
    return { error: null };
  }
  const { error } = await supabase.from("tasks").delete().in("id", normalizedIds);
  return { error };
};
