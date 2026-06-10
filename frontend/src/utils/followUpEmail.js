import supabase from "./supabaseClient";
import { formatTaskDeadline } from "./task";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const followUpEmailUrl = API_BASE
  ? `${API_BASE}/api/follow-up-email`
  : "/api/follow-up-email";

const collectTaskPayload = (task) => ({
  agenda: task.agenda?.trim() || "Untitled task",
  deadline: formatTaskDeadline(task.deadline, task.deadline_time),
  taskId: task.taskIds?.[0] ?? task.id ?? null,
});

const profileFromMember = (member) => ({
  id: Number(member.responsible_id),
  email: member.profile?.email?.trim() || "",
  name:
    member.profile?.code_name?.trim() ||
    member.profile?.name?.trim() ||
    member.profile?.email?.trim() ||
    "",
});

const collectRecipientRows = (tasks) => {
  const byRecipientId = new Map();

  for (const task of tasks) {
    const members =
      task.members?.length > 0
        ? task.members
        : [{ ...task, responsible_id: task.responsible_id ?? task.responsibleIds?.[0] }];

    const taskPayload = collectTaskPayload(task);

    for (const member of members) {
      const profile = profileFromMember(member);
      if (!Number.isFinite(profile.id) || profile.id <= 0) continue;

      const existing = byRecipientId.get(profile.id) ?? {
        recipientId: profile.id,
        email: profile.email,
        name: profile.name,
        tasks: [],
      };

      if (!existing.email && profile.email) {
        existing.email = profile.email;
      }
      if (!existing.name && profile.name) {
        existing.name = profile.name;
      }

      const duplicate = existing.tasks.some(
        (row) =>
          row.agenda === taskPayload.agenda && row.deadline === taskPayload.deadline,
      );
      if (!duplicate) {
        existing.tasks.push(taskPayload);
      }

      byRecipientId.set(profile.id, existing);
    }
  }

  return Array.from(byRecipientId.values());
};

const hydrateMissingEmails = async (rows) => {
  const missingIds = rows
    .filter((row) => !row.email)
    .map((row) => row.recipientId)
    .filter((id) => Number.isFinite(id) && id > 0);

  if (missingIds.length === 0) return { rows, error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, code_name")
    .in("id", missingIds);

  if (error) {
    return { rows, error };
  }

  const profileById = new Map((data ?? []).map((profile) => [Number(profile.id), profile]));

  const hydrated = rows.map((row) => {
    if (row.email) return row;
    const profile = profileById.get(row.recipientId);
    if (!profile) return row;

    return {
      ...row,
      email: profile.email?.trim() || "",
      name:
        row.name ||
        profile.code_name?.trim() ||
        profile.name?.trim() ||
        profile.email?.trim() ||
        "",
    };
  });

  return { rows: hydrated, error: null };
};

const emailSkipped = (skipReason) => ({
  sent: 0,
  failed: 0,
  skipped: true,
  skipReason,
  error: null,
});

export const sendFollowUpEmails = async (tasks, { senderLabel } = {}) => {
  const list = Array.isArray(tasks) ? tasks : [tasks];
  const recipientRows = collectRecipientRows(list);

  if (recipientRows.length === 0) {
    return emailSkipped("no_assignees");
  }

  const { rows, error: profileError } = await hydrateMissingEmails(recipientRows);
  if (profileError) {
    return { sent: 0, failed: 0, error: profileError };
  }

  const recipients = rows
    .filter((row) => row.email && row.tasks.length > 0)
    .map((row) => ({
      email: row.email,
      name: row.name,
      tasks: row.tasks.map(({ agenda, deadline }) => ({ agenda, deadline })),
    }));

  if (recipients.length === 0) {
    return emailSkipped("no_emails");
  }

  try {
    const response = await fetch(followUpEmailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderLabel, recipients }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        sent: payload.sent ?? 0,
        failed: payload.failed ?? recipients.length,
        error: { message: payload.error || "Failed to send follow-up emails." },
        results: payload.results,
      };
    }

    return {
      sent: payload.sent ?? recipients.length,
      failed: payload.failed ?? 0,
      error: null,
      results: payload.results,
    };
  } catch (error) {
    return {
      sent: 0,
      failed: recipients.length,
      error: { message: error.message || "Could not reach the email server." },
    };
  }
};
