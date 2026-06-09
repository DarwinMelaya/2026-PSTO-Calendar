import { useCallback, useEffect, useRef, useState } from "react";
import {
  listUnreadFollowUpNotifications,
  markNotificationRead,
  NOTIFICATION_TYPES,
  subscribeToUserNotifications,
} from "../utils/notification";

const DISMISSED_KEY = "psto_dismissed_followups";

const loadDismissedIds = () => {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const saveDismissedIds = (ids) => {
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
};

const isFollowUp = (row) =>
  row?.type === NOTIFICATION_TYPES.TASK_FOLLOW_UP && !row?.is_read;

export const useFollowUpAlerts = (userId) => {
  const [activeNotification, setActiveNotification] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);

  const queueRef = useRef([]);
  const dismissedRef = useRef(loadDismissedIds());
  const seenIdsRef = useRef(new Set());

  const syncPendingCount = useCallback(() => {
    setPendingCount(queueRef.current.length);
  }, []);

  const enqueueFollowUp = useCallback(
    (notification, { force = false } = {}) => {
      if (!isFollowUp(notification)) return;
      if (!force && dismissedRef.current.has(notification.id)) return;
      if (seenIdsRef.current.has(notification.id)) return;

      seenIdsRef.current.add(notification.id);

      setActiveNotification((current) => {
        if (!current) return notification;
        if (current.id === notification.id) return current;

        if (!queueRef.current.some((item) => item.id === notification.id)) {
          queueRef.current.push(notification);
          syncPendingCount();
        }
        return current;
      });
    },
    [syncPendingCount],
  );

  const showNextFollowUp = useCallback(() => {
    while (queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      syncPendingCount();
      if (!next || dismissedRef.current.has(next.id)) continue;
      setActiveNotification(next);
      return;
    }
    setActiveNotification(null);
    syncPendingCount();
  }, [syncPendingCount]);

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;

    const loadInitial = async () => {
      const { data } = await listUnreadFollowUpNotifications(userId);
      if (cancelled) return;

      const unread = (data ?? []).filter(
        (row) => !dismissedRef.current.has(row.id),
      );

      unread
        .slice()
        .reverse()
        .forEach((row) => enqueueFollowUp(row));
    };

    loadInitial();

    const unsubscribe = subscribeToUserNotifications(userId, {
      onInsert: (row) => {
        if (!isFollowUp(row)) return;
        seenIdsRef.current.delete(row.id);
        dismissedRef.current.delete(row.id);
        enqueueFollowUp(row, { force: true });
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, enqueueFollowUp]);

  const acknowledgeFollowUp = useCallback(async () => {
    if (!activeNotification || acknowledging) return;

    setAcknowledging(true);
    const { error } = await markNotificationRead(activeNotification.id);
    setAcknowledging(false);

    if (error) return { error };

    dismissedRef.current.add(activeNotification.id);
    saveDismissedIds(dismissedRef.current);
    showNextFollowUp();

    return { error: null };
  }, [activeNotification, acknowledging, showNextFollowUp]);

  return {
    activeFollowUp: activeNotification,
    pendingFollowUpCount: pendingCount,
    acknowledging,
    acknowledgeFollowUp,
  };
};
