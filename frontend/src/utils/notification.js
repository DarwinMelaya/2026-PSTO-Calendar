import supabase from "./supabaseClient";
import { formatTaskDeadline } from "./task";

export const NOTIFICATION_TYPES = {
  TASK_FOLLOW_UP: "task_follow_up",
};

const buildFollowUpMessage = (task, senderLabel) => {
  const deadline = formatTaskDeadline(task.deadline, task.deadline_time);
  const agenda = task.agenda?.trim() || "Untitled task";
  const prefix = senderLabel
    ? `${senderLabel} sent a follow-up on your overdue task`
    : "Follow-up on your overdue task";
  return `${prefix}: "${agenda}" (deadline: ${deadline}). Please update its status or complete it as soon as possible.`;
};

const collectFollowUpRows = (tasks, senderLabel) => {
  const rows = [];

  for (const task of tasks) {
    const responsibleIds =
      task.responsibleIds?.length > 0
        ? task.responsibleIds
        : [task.responsible_id].filter(Boolean);
    const taskId = task.taskIds?.[0] ?? task.id ?? null;

    for (const recipientId of responsibleIds) {
      const id = Number(recipientId);
      if (!Number.isFinite(id) || id <= 0) continue;

      rows.push({
        recipient_id: id,
        task_id: taskId ? Number(taskId) : null,
        type: NOTIFICATION_TYPES.TASK_FOLLOW_UP,
        title: "Overdue task follow-up",
        message: buildFollowUpMessage(task, senderLabel),
      });
    }
  }

  return rows;
};

export const sendTaskFollowUpNotifications = async (
  tasks,
  { senderLabel } = {},
) => {
  const list = Array.isArray(tasks) ? tasks : [tasks];
  const rows = collectFollowUpRows(list, senderLabel);

  if (rows.length === 0) {
    return {
      data: [],
      error: { message: "No assignees found for the selected task(s)." },
    };
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert(rows)
    .select("id, recipient_id, task_id, type, title, message, is_read, created_at");

  return { data, error };
};

export const parseFollowUpNotification = (notification) => {
  const message = notification?.message ?? "";
  const agendaMatch = message.match(/"([^"]+)"/);
  const senderMatch = message.match(/^(.+?) sent a follow-up/);

  return {
    agenda: agendaMatch?.[1] ?? null,
    senderLabel: senderMatch?.[1] ?? null,
    message,
  };
};

export const listUnreadFollowUpNotifications = async (userId, { limit = 20 } = {}) => {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    return { data: [], error: { message: "Invalid user." } };
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, recipient_id, task_id, type, title, message, is_read, created_at")
    .eq("recipient_id", id)
    .eq("type", NOTIFICATION_TYPES.TASK_FOLLOW_UP)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error };
};

export const listNotificationsForUser = async (userId, { limit = 30 } = {}) => {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    return { data: [], error: { message: "Invalid user." } };
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, recipient_id, task_id, type, title, message, is_read, created_at")
    .eq("recipient_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data, error };
};

export const countUnreadNotifications = async (userId) => {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    return { count: 0, error: null };
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", id)
    .eq("is_read", false);

  return { count: count ?? 0, error };
};

export const markNotificationRead = async (id) => {
  const notificationId = Number(id);
  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    return { data: null, error: { message: "Invalid notification." } };
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .select("id, is_read")
    .single();

  return { data, error };
};

/** One realtime channel per user; multiple components can listen safely. */
const userNotificationStreams = new Map();

const getUserNotificationStream = (userId) => {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const existing = userNotificationStreams.get(id);
  if (existing) return existing;

  const listeners = new Set();

  const channel = supabase
    .channel(`notifications-user-${id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${id}`,
      },
      (payload) => {
        for (const listener of listeners) {
          listener.onInsert?.(payload.new);
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${id}`,
      },
      (payload) => {
        for (const listener of listeners) {
          listener.onUpdate?.(payload.new);
        }
      },
    )
    .subscribe();

  const stream = { channel, listeners };
  userNotificationStreams.set(id, stream);
  return stream;
};

export const subscribeToUserNotifications = (userId, { onInsert, onUpdate } = {}) => {
  const stream = getUserNotificationStream(userId);
  if (!stream) return () => {};

  const listener = { onInsert, onUpdate };
  stream.listeners.add(listener);

  return () => {
    stream.listeners.delete(listener);
    if (stream.listeners.size === 0) {
      supabase.removeChannel(stream.channel);
      userNotificationStreams.delete(Number(userId));
    }
  };
};

export const markAllNotificationsRead = async (userId) => {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    return { error: { message: "Invalid user." } };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", id)
    .eq("is_read", false);

  return { error };
};
