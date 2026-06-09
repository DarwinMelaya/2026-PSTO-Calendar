import { useCallback, useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import toast from "react-hot-toast";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TYPES,
  subscribeToUserNotifications,
} from "../../utils/notification";

const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const showFollowUpToast = (notification) => {
  toast.custom(
    (t) => (
      <div className="pointer-events-auto flex w-[min(100vw-2rem,22rem)] gap-3 rounded-2xl border border-violet-200 bg-white p-4 shadow-xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <FiBell className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{notification.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {notification.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    ),
    { duration: 12_000, position: "top-right" },
  );
};

const NotificationBell = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const panelRef = useRef(null);
  const knownIdsRef = useRef(new Set());

  const upsertNotification = useCallback((item) => {
    if (!item?.id) return;

    setNotifications((prev) => {
      const exists = prev.some((row) => row.id === item.id);
      if (exists) {
        return prev.map((row) => (row.id === item.id ? { ...row, ...item } : row));
      }
      return [item, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    });
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data }, { count }] = await Promise.all([
      listNotificationsForUser(userId),
      countUnreadNotifications(userId),
    ]);
    setLoading(false);

    const rows = data ?? [];
    setNotifications(rows);
    setUnreadCount(count);
    knownIdsRef.current = new Set(rows.map((row) => row.id));
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return undefined;

    const unsubscribe = subscribeToUserNotifications(userId, {
      onInsert: (row) => {
        const isNew = !knownIdsRef.current.has(row.id);
        knownIdsRef.current.add(row.id);
        upsertNotification(row);

        if (!row.is_read) {
          setUnreadCount((prev) => prev + (isNew ? 1 : 0));
          if (isNew) {
            setHasNewAlert(true);
            if (
              row.type === NOTIFICATION_TYPES.TASK_FOLLOW_UP &&
              !window.location.pathname.includes("/user-dashboard")
            ) {
              showFollowUpToast(row);
            } else if (row.type !== NOTIFICATION_TYPES.TASK_FOLLOW_UP) {
              toast(row.message, { icon: "🔔", duration: 8000 });
            }
          }
        }
      },
      onUpdate: async (row) => {
        upsertNotification(row);
        const { count } = await countUnreadNotifications(userId);
        setUnreadCount(count);
      },
    });

    const fallbackPoll = window.setInterval(async () => {
      const { count } = await countUnreadNotifications(userId);
      setUnreadCount(count);
    }, 15_000);

    return () => {
      unsubscribe();
      window.clearInterval(fallbackPoll);
    };
  }, [userId, upsertNotification]);

  useEffect(() => {
    if (!hasNewAlert) return undefined;
    const timer = window.setTimeout(() => setHasNewAlert(false), 4000);
    return () => window.clearTimeout(timer);
  }, [hasNewAlert]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const handleMarkRead = async (notification) => {
    if (notification.is_read) return;

    const { error } = await markNotificationRead(notification.id);
    if (error) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    const { error } = await markAllNotificationsRead(userId);
    if (error) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
    setHasNewAlert(false);
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${
          hasNewAlert ? "animate-pulse ring-2 ring-violet-400/60 ring-offset-1" : ""
        }`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        <FiBell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item)}
                      className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                        item.is_read ? "bg-white" : "bg-violet-50/60"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                        {!item.is_read ? (
                          <span className="ml-2 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                            New
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {item.message}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {formatWhen(item.created_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
