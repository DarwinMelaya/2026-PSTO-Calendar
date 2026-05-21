import supabase from "./supabaseClient";

export const TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

const STATUS_REQUEST_PREFIX = "[[STATUS_REQUEST:";
const STATUS_REQUEST_SUFFIX = "]]";
const TASK_GROUP_PREFIX = "[[TASK_GROUP:";
const TASK_GROUP_SUFFIX = "]]";
const COMPLETED_AT_PREFIX = "[[COMPLETED_AT:";
const COMPLETED_AT_SUFFIX = "]]";

export const parseTaskRemarks = (remarks) => {
  const raw = (remarks ?? "").trim();
  if (!raw)
    return {
      cleanRemarks: "",
      requestedStatus: null,
      groupKey: null,
      completedAt: null,
    };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let requestedStatus = null;
  let groupKey = null;
  let completedAt = null;
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
    cleanLines.push(line);
  }

  return {
    cleanRemarks: cleanLines.join("\n"),
    requestedStatus,
    groupKey,
    completedAt,
  };
};

const composeTaskRemarks = ({ remarks, requestedStatus, groupKey, completedAt }) => {
  const { cleanRemarks } = parseTaskRemarks(remarks);
  const marker = requestedStatus
    ? `${STATUS_REQUEST_PREFIX}${requestedStatus}${STATUS_REQUEST_SUFFIX}`
    : "";
  const groupMarker = groupKey
    ? `${TASK_GROUP_PREFIX}${groupKey}${TASK_GROUP_SUFFIX}`
    : "";
  const completedMarker = completedAt
    ? `${COMPLETED_AT_PREFIX}${completedAt}${COMPLETED_AT_SUFFIX}`
    : "";

  const parts = [cleanRemarks.trim(), marker, groupMarker, completedMarker].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join("\n") : null;
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

export const normalizeActivities = (activities) =>
  typeof activities === "string" ? activities.trim() : "";

export const deadlineForForm = (value) => (hasDeadline(value) ? value : "");

export const formatTaskDeadline = (value) => {
  if (!hasDeadline(value)) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const createTask = async ({
  taskDate,
  agenda,
  activities,
  deadline,
  responsibleId,
  status,
  remarks,
}) => {
  const resolvedDeadline = resolveDeadlineForDb(deadline);
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
  });

  const { data, error } = await supabase
    .from("tasks")
    .insert(
      responsibleIds.map((id) => ({
        task_date: taskDate,
        agenda: agenda.trim(),
        activities: normalizeActivities(activities),
        deadline: resolvedDeadline,
        responsible_id: id,
        status,
        remarks: composedRemarks,
      })),
    )
    .select(
      "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
    );

  return { data, error };
};

export const updateTask = async (
  id,
  {
    taskDate,
    agenda,
    activities,
    deadline,
    responsibleId,
    status,
    remarks,
    taskIds,
    groupKey,
    existingRemarks,
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
  const existingMeta = parseTaskRemarks(existingRemarks ?? null);
  const effectiveGroupKey =
    groupKey || existingMeta.groupKey || parseTaskRemarks(remarks).groupKey || createGroupKey();
  const effectiveCompletedAt =
    status === "completed"
      ? existingMeta.completedAt || new Date().toISOString()
      : null;
  const composedRemarks = composeTaskRemarks({
    remarks,
    requestedStatus: null,
    groupKey: effectiveGroupKey,
    completedAt: effectiveCompletedAt,
  });

  const basePayload = {
    task_date: taskDate,
    agenda: agenda.trim(),
    activities: normalizeActivities(activities),
    deadline: resolvedDeadline,
    status,
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
        "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
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
        "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
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

export const requestTaskStatusChange = async (
  id,
  { requestedStatus, remarks, groupKey },
) => {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      remarks: composeTaskRemarks({
        remarks,
        requestedStatus,
        groupKey,
        completedAt: parseTaskRemarks(remarks).completedAt,
      }),
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
    )
    .single();

  return { data, error };
};

export const approveTaskStatusRequest = async ({ id, remarks }) => {
  const { requestedStatus, cleanRemarks, groupKey, completedAt } =
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
      }),
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
    )
    .single();

  return { data, error };
};

export const rejectTaskStatusRequest = async ({ id, remarks }) => {
  const { cleanRemarks, groupKey, completedAt } = parseTaskRemarks(remarks);
  const { data, error } = await supabase
    .from("tasks")
    .update({
      remarks: composeTaskRemarks({
        remarks: cleanRemarks,
        requestedStatus: null,
        groupKey,
        completedAt,
      }),
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
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
      status,
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
      "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
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
