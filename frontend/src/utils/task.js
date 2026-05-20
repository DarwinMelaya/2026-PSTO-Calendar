import supabase from "./supabaseClient";

export const TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
];

export const createTask = async ({
  taskDate,
  agenda,
  activities,
  deadline,
  responsibleId,
  status,
  remarks,
}) => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      task_date: taskDate,
      agenda: agenda.trim(),
      activities: activities.trim(),
      deadline,
      responsible_id: Number(responsibleId),
      status,
      remarks: remarks?.trim() || null,
    })
    .select(
      "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
    )
    .single();

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
  },
) => {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      task_date: taskDate,
      agenda: agenda.trim(),
      activities: activities.trim(),
      deadline,
      responsible_id: Number(responsibleId),
      status,
      remarks: remarks?.trim() || null,
    })
    .eq("id", id)
    .select(
      "id, task_date, agenda, activities, deadline, status, remarks, created_at, responsible_id",
    )
    .single();

  return { data, error };
};

export const deleteTask = async (id) => {
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  return { error };
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
