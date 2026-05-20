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

export const parseTaskRemarks = (remarks) => {
  const raw = (remarks ?? "").trim();
  if (!raw) return { cleanRemarks: "", requestedStatus: null, groupKey: null };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let requestedStatus = null;
  let groupKey = null;
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
    cleanLines.push(line);
  }

  return {
    cleanRemarks: cleanLines.join("\n"),
    requestedStatus,
    groupKey,
  };
};

const composeTaskRemarks = ({ remarks, requestedStatus, groupKey }) => {
  const { cleanRemarks } = parseTaskRemarks(remarks);
  const marker = requestedStatus
    ? `${STATUS_REQUEST_PREFIX}${requestedStatus}${STATUS_REQUEST_SUFFIX}`
    : "";
  const groupMarker = groupKey
    ? `${TASK_GROUP_PREFIX}${groupKey}${TASK_GROUP_SUFFIX}`
    : "";

  const parts = [cleanRemarks.trim(), marker, groupMarker].filter(Boolean);
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

export const createTask = async ({
  taskDate,
  agenda,
  activities,
  deadline,
  responsibleId,
  status,
  remarks,
}) => {
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
  });

  const { data, error } = await supabase
    .from("tasks")
    .insert(
      responsibleIds.map((id) => ({
        task_date: taskDate,
        agenda: agenda.trim(),
        activities: activities.trim(),
        deadline,
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
  },
) => {
  const responsibleIds = normalizeResponsibleIds(responsibleId);
  if (responsibleIds.length === 0) {
    return {
      data: null,
      error: { message: "At least one person responsible is required." },
    };
  }
  const effectiveGroupKey = groupKey || parseTaskRemarks(remarks).groupKey || createGroupKey();
  const composedRemarks = composeTaskRemarks({
    remarks,
    requestedStatus: null,
    groupKey: effectiveGroupKey,
  });

  const basePayload = {
    task_date: taskDate,
    agenda: agenda.trim(),
    activities: activities.trim(),
    deadline,
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
  const { requestedStatus, cleanRemarks, groupKey } = parseTaskRemarks(remarks);
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
  const { cleanRemarks, groupKey } = parseTaskRemarks(remarks);
  const { data, error } = await supabase
    .from("tasks")
    .update({
      remarks: composeTaskRemarks({
        remarks: cleanRemarks,
        requestedStatus: null,
        groupKey,
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
