import {
  ENTRY_STATUS_META,
  formatEntryDate,
  groupEntriesByMonth,
  inferEntryStatus,
  projectProgramLabel,
  summarizeMonth,
} from "../../utils/projectTimeline";

const programAccent = (program) => {
  if (program === "SETUP") return "from-emerald-600 to-teal-700";
  if (program === "GIA") return "from-blue-600 to-indigo-700";
  if (program === "SSCP") return "from-violet-600 to-purple-700";
  if (program === "CEST") return "from-amber-500 to-orange-600";
  return "from-slate-600 to-slate-800";
};

const formatShortDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const ProjectTimelinePresentation = ({
  project,
  entries,
  onClose,
  onViewPhoto,
}) => {
  const monthGroups = groupEntriesByMonth(entries, { newestFirst: true });
  const generatedAt = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="presentation-overlay fixed inset-0 z-[60] overflow-y-auto bg-slate-100 print:relative print:inset-auto print:z-auto print:overflow-visible print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="presentation-title"
    >
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Presentation mode
            </p>
            <p className="truncate text-sm font-bold text-slate-900">
              {project.title}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Print / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Exit presentation
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 print:max-w-none print:px-8 print:py-8">
        <header
          className={`overflow-hidden rounded-2xl bg-gradient-to-br ${programAccent(project.program)} px-6 py-6 text-white shadow-xl print:rounded-xl print:shadow-none`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                PSTO Calendar · Project Timeline Report
              </p>
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/25">
                {projectProgramLabel(project.program)}
              </span>
              <h1
                id="presentation-title"
                className="text-2xl font-bold leading-tight sm:text-3xl"
              >
                {project.title}
              </h1>
              {project.location ? (
                <p className="max-w-2xl text-sm text-white/90">
                  <span className="font-semibold">Location:</span>{" "}
                  {project.location}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-right ring-1 ring-white/20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                Generated
              </p>
              <p className="text-sm font-medium">{generatedAt}</p>
              <p className="mt-1 text-xs text-white/80">
                {entries.length} timeline entr
                {entries.length === 1 ? "y" : "ies"}
              </p>
            </div>
          </div>
        </header>

        {monthGroups.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-slate-800">
              No timeline entries yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Add entries to build a month-by-month project story.
            </p>
          </div>
        ) : (
          <div className="relative mt-8 space-y-10 print:space-y-8">
            <div
              className="pointer-events-none absolute bottom-0 left-[1.125rem] top-2 w-0.5 bg-gradient-to-b from-blue-400 via-indigo-400 to-emerald-400 print:left-4"
              aria-hidden
            />

            {monthGroups.map((group, groupIndex) => (
              <section key={group.key} className="relative pl-12 print:pl-14">
                <div
                  className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-4 ring-blue-100 print:shadow-none"
                  aria-hidden
                >
                  <span className="text-xs font-bold text-blue-700">
                    {groupIndex + 1}
                  </span>
                </div>

                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {group.label}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {summarizeMonth(group.entries)}
                  </p>
                </div>

                <div className="space-y-4">
                  {group.entries.map((entry) => {
                    const status = inferEntryStatus(entry.remarks);
                    const meta = ENTRY_STATUS_META[status];

                    return (
                      <article
                        key={entry.id}
                        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${meta.cardBorder} print:break-inside-avoid`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-2.5 w-2.5 rounded-full ring-4 ${meta.dotClass}`}
                              aria-hidden
                            />
                            <time
                              dateTime={entry.entry_date}
                              className="text-sm font-bold text-slate-800"
                            >
                              {formatShortDate(entry.entry_date)}
                            </time>
                            <span className="text-slate-300">·</span>
                            <time className="text-xs text-slate-500">
                              {formatEntryDate(entry.entry_date)}
                            </time>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex flex-col gap-4 p-4 sm:flex-row">
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                              {entry.remarks || "No remarks recorded."}
                            </p>
                          </div>
                          {entry.photo_url ? (
                            <button
                              type="button"
                              onClick={() => onViewPhoto(entry.photo_url)}
                              className="shrink-0 overflow-hidden rounded-lg ring-2 ring-slate-200 transition hover:ring-blue-400 print:pointer-events-none"
                            >
                              <img
                                src={entry.photo_url}
                                alt=""
                                className="h-32 w-auto max-w-[14rem] object-cover sm:h-36"
                              />
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500 print:mt-8">
          Department of Science and Technology · PSTO Marinduque · Project
          Timeline Report
        </footer>
      </div>
    </div>
  );
};

export default ProjectTimelinePresentation;
