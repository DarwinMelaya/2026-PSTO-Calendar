import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout/Layout";
import { hasDeadline, isTaskPriority, listTasks } from "../../utils/task";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const isToday = (date) => {
  if (!date) return false;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d.getTime() === TODAY.getTime();
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatRangeLabel = (start, end) => {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const endFmt = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
};

const Calendar = ({
  monthNow,
  yearNow,
  schedules,
  onDateClick,
  onScheduleClick,
  onMonthChange,
  selectedVenue,
  isLightText = false,
}) => {
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes}${ampm}`;
  };

  const getDatesInMonth = (year, month) => {
    const dates = [];
    const date = new Date(year, month, 1);
    const firstDay = date.getDay();

    for (let dayStart = 0; dayStart < firstDay; dayStart++) {
      dates.push(null);
    }

    while (date.getMonth() === month) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    return dates;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f172a] text-white ring-1 ring-slate-900/10">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 2.25v1.5M17.25 2.25v1.5M3 8.25h18M4.5 4.5h15A1.5 1.5 0 0121 6v14.25A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 20.25V6a1.5 1.5 0 011.5-1.5z"
              />
            </svg>
          </span>
          <div>
            <h1
              className={`text-lg font-semibold leading-tight ${
                isLightText ? "text-white" : "text-slate-900"
              }`}
            >
              {monthNames[monthNow]} {yearNow}
            </h1>
            <p className="text-xs text-slate-500">Showing tasks by due date</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(false)}
            className="inline-flex items-center justify-center rounded-xl bg-[#0f172a] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600/40"
            aria-label="Previous month"
            type="button"
          >
            <span aria-hidden>‹</span>
          </button>
          <button
            onClick={() => onMonthChange(true)}
            className="inline-flex items-center justify-center rounded-xl bg-[#0f172a] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600/40"
            aria-label="Next month"
            type="button"
          >
            <span aria-hidden>›</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <div className="min-w-0 sm:min-w-[720px]">
          <div className="flex items-center justify-between overflow-hidden rounded-t-2xl bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:text-xs">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="w-full border-r border-slate-200 py-2 text-center last:border-r-0"
              >
                <span className="sm:hidden">{day.slice(0, 1)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-2xl bg-slate-200">
            {getDatesInMonth(yearNow, monthNow).map((date, index) => (
              // Empty filler cells are rendered as non-interactive placeholders
              <div
                key={index}
                className={`relative min-h-[64px] bg-white p-1.5 transition sm:min-h-[112px] sm:p-2 ${
                  date ? "hover:bg-slate-50" : "bg-slate-50"
                }`}
              >
            {date ? (
              <button
                type="button"
                onClick={() => onDateClick(date)}
                className={`absolute right-1.5 top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-[11px] font-semibold tabular-nums transition sm:right-2 sm:top-2 sm:h-7 sm:min-w-7 sm:text-xs ${
                  isToday(date)
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                aria-label={`Select ${date.toDateString()}`}
              >
                {date.getDate()}
              </button>
            ) : null}

            {date && schedules[date.toDateString()] ? (
              <div className="mt-8 space-y-1 sm:mt-9">
                {schedules[date.toDateString()]
                  .filter(
                    (schedule) =>
                      !selectedVenue || schedule.venue_id === selectedVenue,
                  )
                  .slice(0, 3)
                  .map((schedule, idx) => (
                    <button
                      key={schedule.id ?? idx}
                      type="button"
                      onClick={(e) => onScheduleClick(e, schedule)}
                      className={`w-full rounded-lg px-1.5 py-1 text-left text-[10px] font-semibold transition sm:px-2 sm:text-[11px] ${
                        schedule.completed
                          ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          : schedule.isPriority
                            ? "bg-rose-600 text-white hover:bg-rose-700"
                            : "bg-slate-800 text-white hover:bg-slate-700"
                      }`}
                      title={`${schedule.event_name} • ${schedule.department}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{schedule.event_name}</span>
                        <span className="hidden shrink-0 text-[10px] font-semibold opacity-80 sm:inline">
                          {formatTime(schedule.start_time)}
                        </span>
                      </div>
                    </button>
                  ))}

                {schedules[date.toDateString()].length > 3 ? (
                  <p className="pt-1 text-[11px] font-medium text-slate-500">
                    +{schedules[date.toDateString()].length - 3} more
                  </p>
                ) : null}
              </div>
            ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const startOfDayKey = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).toDateString();

const isSameDay = (a, b) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDateLabel = (date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const ViewToggle = ({ value, onChange }) => (
  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
    {["month", "week", "day"].map((v) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
          value === v
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        {v[0].toUpperCase() + v.slice(1)}
      </button>
    ))}
  </div>
);

const SchedulePill = ({ schedule, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
      schedule.completed
        ? "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
    }`}
    title={schedule.department}
  >
    <p className="truncate font-semibold">{schedule.event_name || "Untitled"}</p>
    <p className="mt-0.5 truncate text-xs text-slate-500">
      {schedule.venues?.name ?? "—"}
    </p>
  </button>
);

const WeekView = ({ anchorDate, schedules, onDateClick, onScheduleClick }) => {
  const start = startOfWeek(anchorDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = addDays(start, 6);
  const monthBoundary = start.getMonth() !== end.getMonth();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Week
          </p>
          <h2 className="truncate text-lg font-bold text-slate-900">
            {formatRangeLabel(start, end)}
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {days.map((d) => {
              const key = startOfDayKey(d);
              const items = schedules[key] ?? [];
              const dateLabel = d.toLocaleDateString(undefined, {
                month: monthBoundary || d.getDate() === 1 ? "short" : undefined,
                day: "numeric",
              });
              return (
                <div key={key} className="bg-white p-2 sm:p-3">
                  <button
                    type="button"
                    onClick={() => onDateClick(d)}
                    className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-xs font-semibold transition ${
                      isToday(d)
                        ? "bg-blue-600 text-white"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block uppercase tracking-wider">
                        {weekDays[d.getDay()]}
                      </span>
                      <span className="block text-[11px] font-medium opacity-80">
                        {dateLabel}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-base font-bold leading-none">
                      {d.getDate()}
                    </span>
                  </button>

                  <div className="mt-2 space-y-2">
                    {items.length === 0 ? (
                      <p className="px-1 text-xs text-slate-400">No tasks</p>
                    ) : (
                      items.slice(0, 6).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={(e) => onScheduleClick(e, s)}
                          className={`w-full rounded-lg px-2 py-1 text-left text-[11px] font-semibold transition ${
                            s.completed
                              ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              : s.isPriority
                                ? "bg-rose-600 text-white hover:bg-rose-700"
                                : "bg-slate-800 text-white hover:bg-slate-700"
                          }`}
                          title={s.department}
                        >
                          <span className="line-clamp-2">{s.event_name}</span>
                        </button>
                      ))
                    )}
                    {items.length > 6 ? (
                      <p className="px-1 text-xs font-medium text-slate-500">
                        +{items.length - 6} more
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const DayView = ({ date, schedules, onScheduleClick }) => {
  const key = startOfDayKey(date);
  const items = schedules[key] ?? [];
  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Day
        </p>
        <h2 className="truncate text-lg font-bold text-slate-900">
          {formatDateLabel(date)}
        </h2>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks for this date.</p>
        ) : (
          items.map((s) => (
            <SchedulePill
              key={s.id}
              schedule={s}
              onClick={(e) => onScheduleClick(e, s)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const AdminCalendar = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);

  const [monthNow, setMonthNow] = useState(() => new Date().getMonth());
  const [yearNow, setYearNow] = useState(() => new Date().getFullYear());

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [viewMode, setViewMode] = useState("month");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listTasks();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTasks(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const schedules = useMemo(() => {
    // Calendar component expects schedules keyed by `date.toDateString()`.
    // We map existing tasks to the schedule shape the UI renders.
    const map = {};

    for (const task of tasks ?? []) {
      // Display tasks on their DUE DATE (deadline).
      if (!hasDeadline(task?.deadline)) continue;
      const d = new Date(`${task.deadline}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;

      const key = startOfDayKey(d);
      if (!map[key]) map[key] = [];

      map[key].push({
        id: task.id,
        event_name: task.agenda ?? "",
        department: task.activities ?? "",
        start_time: "08:00",
        venue_id: null,
        venues: { name: task.profiles?.code_name ?? "No Venue" },
        completed: task.status === "completed",
        isPriority: isTaskPriority(task),
        _task: task,
      });
    }

    // Stable order inside each day.
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aDone = a.completed ? 1 : 0;
        const bDone = b.completed ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return String(a.event_name).localeCompare(String(b.event_name));
      });
    }

    return map;
  }, [tasks]);

  const onMonthChange = useCallback((next) => {
    setSelectedSchedule(null);

    setMonthNow((prev) => {
      let m = prev + (next ? 1 : -1);
      if (m < 0) {
        m = 11;
        setYearNow((y) => y - 1);
      } else if (m > 11) {
        m = 0;
        setYearNow((y) => y + 1);
      }
      return m;
    });
  }, []);

  const ensureAnchorDate = useCallback((fallback) => {
    // We keep selectedDate optional (month view can have no selection),
    // but week/day views need an anchor date.
    return selectedDate ?? fallback ?? TODAY;
  }, [selectedDate]);

  const navigateByView = useCallback(
    (next) => {
      const dir = next ? 1 : -1;
      if (viewMode === "month") {
        onMonthChange(next);
        return;
      }

      const anchor = ensureAnchorDate(TODAY);
      const delta = viewMode === "week" ? 7 : 1;
      const moved = addDays(anchor, dir * delta);
      setSelectedSchedule(null);
      setSelectedDate(moved);
    },
    [ensureAnchorDate, onMonthChange, viewMode],
  );

  const onDateClick = useCallback((date) => {
    setSelectedSchedule(null);
    setSelectedDate((prev) => (isSameDay(prev, date) ? null : date));
  }, []);

  const onScheduleClick = useCallback((e, schedule) => {
    e.stopPropagation();
    setSelectedDate((prev) => {
      const dueDate = schedule?._task?.deadline;
      if (!dueDate) return prev;
      const d = new Date(`${dueDate}T00:00:00`);
      return Number.isNaN(d.getTime()) ? prev : d;
    });
    setSelectedSchedule(schedule);
  }, []);

  const selectedDayKey = selectedDate ? startOfDayKey(selectedDate) : null;
  const selectedDaySchedules = selectedDayKey ? schedules[selectedDayKey] ?? [] : [];
  const selectedDayStats = useMemo(() => {
    const list = selectedDaySchedules ?? [];
    const total = list.length;
    const completed = list.filter((s) => s.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [selectedDaySchedules]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Calendar
            </h1>
            <p className="text-sm text-slate-500">
              {loading ? "Loading tasks…" : `${tasks.length} task(s) loaded`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <ViewToggle
              value={viewMode}
              onChange={(mode) => {
                setViewMode(mode);
                if (mode !== "month" && !selectedDate) setSelectedDate(TODAY);
                setSelectedSchedule(null);
              }}
            />
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => navigateByView(false)}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#0f172a] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600/40 sm:flex-none"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => navigateByView(true)}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#0f172a] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-600/40 sm:flex-none"
                aria-label="Next"
              >
                ›
              </button>
              <button
                type="button"
                onClick={load}
                className="inline-flex flex-[2] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 sm:flex-none"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {viewMode === "month" ? (
              <Calendar
                monthNow={monthNow}
                yearNow={yearNow}
                schedules={schedules}
                selectedVenue={null}
                onDateClick={onDateClick}
                onScheduleClick={onScheduleClick}
                onMonthChange={onMonthChange}
              />
            ) : viewMode === "week" ? (
              <WeekView
                anchorDate={ensureAnchorDate(TODAY)}
                schedules={schedules}
                onDateClick={onDateClick}
                onScheduleClick={onScheduleClick}
              />
            ) : (
              <DayView
                date={ensureAnchorDate(TODAY)}
                schedules={schedules}
                onScheduleClick={onScheduleClick}
              />
            )}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              {selectedDate ? "Selected day" : "Pick a date"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedDate ? formatDateLabel(selectedDate) : "Click a day on the calendar."}
            </p>

            {selectedDate ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 ring-1 ring-inset ring-slate-900/5">
                  Total: {selectedDayStats.total}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                  Completed: {selectedDayStats.completed}
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 ring-1 ring-inset ring-amber-600/15">
                  Pending: {selectedDayStats.pending}
                </span>
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {!selectedDate ? (
                <p className="text-sm text-slate-500">
                  Tip: click an event card to view details.
                </p>
              ) : selectedDaySchedules.length === 0 ? (
                <p className="text-sm text-slate-500">No tasks for this date.</p>
              ) : (
                selectedDaySchedules.map((s) => (
                  <SchedulePill
                    key={s.id}
                    schedule={s}
                    onClick={(e) => onScheduleClick(e, s)}
                  />
                ))
              )}
            </div>
          </aside>
        </div>

        {selectedSchedule ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedSchedule(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Task details
                  </p>
                  <h3 className="mt-1 truncate text-lg font-bold text-slate-900">
                    {selectedSchedule.event_name || "Untitled"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedSchedule.venues?.name ?? "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSchedule(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="text-slate-700">
                  <span className="font-semibold">Due date:</span>{" "}
                  {selectedSchedule?._task?.deadline
                    ? new Date(`${selectedSchedule._task.deadline}T00:00:00`).toLocaleDateString()
                    : "—"}
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">Activities:</span>{" "}
                  {selectedSchedule.department || "—"}
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">Status:</span>{" "}
                  {selectedSchedule.completed ? "Completed" : "Not completed"}
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">Task date:</span>{" "}
                  {selectedSchedule?._task?.task_date
                    ? new Date(`${selectedSchedule._task.task_date}T00:00:00`).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default AdminCalendar;
