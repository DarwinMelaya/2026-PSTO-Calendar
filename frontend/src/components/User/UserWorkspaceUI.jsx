export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const STAT_CONFIG = {
  slate: {
    ring: "ring-slate-200/80",
    gradient: "from-slate-500 to-slate-700",
    glow: "shadow-slate-200/50",
    iconBg: "bg-slate-100 text-slate-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
      />
    ),
  },
  blue: {
    ring: "ring-blue-200/70",
    gradient: "from-blue-500 to-blue-700",
    glow: "shadow-blue-200/60",
    iconBg: "bg-blue-50 text-blue-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  amber: {
    ring: "ring-amber-200/70",
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-200/50",
    iconBg: "bg-amber-50 text-amber-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    ),
  },
  emerald: {
    ring: "ring-emerald-200/70",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-200/50",
    iconBg: "bg-emerald-50 text-emerald-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  rose: {
    ring: "ring-rose-200/70",
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-200/50",
    iconBg: "bg-rose-50 text-rose-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    ),
  },
  violet: {
    ring: "ring-violet-200/70",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-200/50",
    iconBg: "bg-violet-50 text-violet-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    ),
  },
  sky: {
    ring: "ring-sky-200/70",
    gradient: "from-sky-500 to-cyan-600",
    glow: "shadow-sky-200/50",
    iconBg: "bg-sky-50 text-sky-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
    ),
  },
};

export function StatCard({
  label,
  value,
  accent,
  sublabel,
  onClick,
  actionHint = "Click to view",
}) {
  const cfg = STAT_CONFIG[accent] ?? STAT_CONFIG.slate;
  const className = `group relative w-full overflow-hidden rounded-2xl bg-white p-5 text-left shadow-lg ring-1 transition duration-300 ${cfg.ring} ${cfg.glow} ${
    onClick
      ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      : "hover:-translate-y-0.5 hover:shadow-xl"
  }`;

  const content = (
    <>
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08] ${cfg.gradient}`}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
          {sublabel ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{sublabel}</p>
          ) : null}
          {onClick ? (
            <p className="mt-2 text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">
              {actionHint}
            </p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg} transition group-hover:scale-105`}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            aria-hidden
          >
            {cfg.icon}
          </svg>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function PanelHeader({ icon, iconGradient, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        {icon ? (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${iconGradient}`}
          >
            {icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ?? null}
    </div>
  );
}

export function ProgressRing({ percent, loading }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="relative flex h-[7.5rem] w-[7.5rem] shrink-0 items-center justify-center"
      aria-hidden={loading}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={loading ? circumference : offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tabular-nums text-white">
          {loading ? "…" : `${percent}%`}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-100/90">
          Complete
        </span>
      </div>
    </div>
  );
}

export function EmptyIllustration({ variant = "empty" }) {
  const isMuted = variant === "filter" || variant === "deadline";
  return (
    <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
      <div
        className={`absolute inset-0 rounded-3xl blur-xl ${
          isMuted ? "bg-slate-200/80" : "bg-blue-300/40"
        }`}
        aria-hidden
      />
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-2xl ring-1 ${
          isMuted
            ? "bg-slate-50 text-slate-500 ring-slate-200"
            : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-white/20"
        }`}
      >
        <svg
          className="h-9 w-9"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          {variant === "filter" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v12m6-6H6"
            />
          ) : variant === "deadline" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
        >
          <div className="flex gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded-lg bg-slate-100" />
              <div className="h-3 w-1/2 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ colSpan = 7, rows = 4 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="animate-pulse">
          <td colSpan={colSpan} className="px-6 py-3">
            <div className="flex gap-4">
              <div className="h-10 w-24 rounded-lg bg-slate-100" />
              <div className="h-10 flex-1 rounded-lg bg-slate-100" />
              <div className="h-10 w-32 rounded-lg bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
