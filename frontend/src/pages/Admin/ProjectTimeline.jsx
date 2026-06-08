import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddMonitoringProjectModal from "../../components/Modals/AdminModals/AddMonitoringProjectModal";
import EditMonitoringProjectModal from "../../components/Modals/AdminModals/EditMonitoringProjectModal";
import AddTimelineEntryModal from "../../components/Modals/AdminModals/AddTimelineEntryModal";
import EditTimelineEntryModal from "../../components/Modals/AdminModals/EditTimelineEntryModal";
import ProjectTimelinePresentation from "../../components/ProjectTimeline/ProjectTimelinePresentation";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  PanelHeader,
  StatCard,
  TableSkeleton,
} from "../../components/User/UserWorkspaceUI";
import {
  PERIOD_FILTERS,
  PROJECT_PROGRAMS,
  deleteMonitoringProject,
  deleteTimelineEntry,
  formatEntryDate,
  getProjectSummary,
  isDateInPeriod,
  listMonitoringProjects,
  projectProgramLabel,
} from "../../utils/projectTimeline";

const programBadgeClass = (program) => {
  if (program === "SETUP") return "bg-emerald-50 text-emerald-800 ring-emerald-600/15";
  if (program === "GIA") return "bg-blue-50 text-blue-800 ring-blue-600/15";
  if (program === "SSCP") return "bg-violet-50 text-violet-800 ring-violet-600/15";
  if (program === "CEST") return "bg-amber-50 text-amber-800 ring-amber-600/15";
  return "bg-slate-100 text-slate-700 ring-slate-600/10";
};

const sortEntriesAsc = (entries) =>
  [...entries].sort((a, b) => {
    const da = new Date(`${a.entry_date}T00:00:00`).getTime();
    const db = new Date(`${b.entry_date}T00:00:00`).getTime();
    if (da !== db) return da - db;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

const ProjectTimeline = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [editEntryOpen, setEditEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState(null);
  const [presentationOpen, setPresentationOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listMonitoringProjects();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const list = data ?? [];
    setProjects(list);

    setSelectedProject((current) => {
      if (!current) return null;
      return list.find((p) => p.id === current.id) ?? null;
    });
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (programFilter !== "all" && project.program !== programFilter) {
        return false;
      }
      if (!q) return true;
      const blob = [project.title, project.location, project.program]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [projects, searchQuery, programFilter]);

  const stats = useMemo(() => {
    const counts = Object.fromEntries(
      PROJECT_PROGRAMS.map((p) => [p.value, 0]),
    );
    for (const project of projects) {
      if (counts[project.program] !== undefined) {
        counts[project.program] += 1;
      }
    }
    return {
      total: projects.length,
      setup: counts.SETUP,
      gia: counts.GIA,
      sscp: counts.SSCP,
      cest: counts.CEST,
    };
  }, [projects]);

  const projectEntries = useMemo(() => {
    if (!selectedProject) return [];
    const entries = selectedProject.project_timeline_entries ?? [];
    return sortEntriesAsc(
      entries.filter((entry) => isDateInPeriod(entry.entry_date, periodFilter)),
    );
  }, [selectedProject, periodFilter]);

  const allProjectEntries = useMemo(() => {
    if (!selectedProject) return [];
    return sortEntriesAsc(selectedProject.project_timeline_entries ?? []);
  }, [selectedProject]);

  const periodEntryCount = projectEntries.length;

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const handleOpenProject = (project) => {
    setSelectedProject(project);
    setPeriodFilter("all");
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setPeriodFilter("all");
    setPresentationOpen(false);
  };

  const handleDeleteProject = async (project) => {
    const confirmed = window.confirm(
      `Delete project "${project.title}" and all its timeline entries? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingProjectId(project.id);
    const { error } = await deleteMonitoringProject(project.id);
    setDeletingProjectId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (selectedProject?.id === project.id) {
      setSelectedProject(null);
    }

    toast.success("Project deleted.");
    loadProjects();
  };

  const handleDeleteEntry = async (entry) => {
    const confirmed = window.confirm("Delete this timeline entry?");
    if (!confirmed) return;

    setDeletingEntryId(entry.id);
    const { error } = await deleteTimelineEntry(entry.id, {
      photoUrl: entry.photo_url,
    });
    setDeletingEntryId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Entry deleted.");
    loadProjects();
  };

  const handleProjectCreated = (newProject) => {
    loadProjects();
    if (newProject) {
      setSelectedProject(newProject);
    }
  };

  const renderProjectList = () => (
    <section className="ut-animate-in ut-delay-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <PanelHeader
        title="Projects"
        subtitle="Select a project to view its timeline report — filter by program (SETUP, GIA, SSCP, CEST)."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProgramFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                programFilter === "all"
                  ? "bg-slate-800 text-white ring-slate-800"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            {PROJECT_PROGRAMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProgramFilter(p.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                  programFilter === p.value
                    ? "bg-slate-800 text-white ring-slate-800"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <TableSkeleton rows={5} colSpan={5} />
      ) : filteredProjects.length === 0 ? (
        <EmptyIllustration
          title="No projects yet"
          description={
            searchQuery || programFilter !== "all"
              ? "Try a different search or filter."
              : "Create a project to start monitoring its timeline."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 sm:px-6">Program</th>
                <th className="px-4 py-3 sm:px-6">Project title</th>
                <th className="hidden px-4 py-3 md:table-cell sm:px-6">
                  Location
                </th>
                <th className="px-4 py-3 sm:px-6">Entries</th>
                <th className="px-4 py-3 sm:px-6">Last update</th>
                <th className="px-4 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => {
                const summary = getProjectSummary(project);
                return (
                  <tr
                    key={project.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${programBadgeClass(project.program)}`}
                      >
                        {projectProgramLabel(project.program)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900 sm:px-6">
                      {project.title}
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-4 text-slate-600 md:table-cell sm:px-6">
                      {project.location || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-6">
                      {summary.entryCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-6">
                      {summary.lastEntryDate
                        ? formatEntryDate(summary.lastEntryDate)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenProject(project)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          View report
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project)}
                          disabled={deletingProjectId === project.id}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {deletingProjectId === project.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderProjectReport = () => {
    if (!selectedProject) return null;

    return (
      <section className="ut-animate-in space-y-4">
        <button
          type="button"
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to projects
        </button>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${programBadgeClass(selectedProject.program)}`}
                >
                  {projectProgramLabel(selectedProject.program)}
                </span>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {selectedProject.title}
                </h2>
                {selectedProject.location ? (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">
                      Location:
                    </span>{" "}
                    {selectedProject.location}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPresentationOpen(true)}
                  disabled={allProjectEntries.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md transition hover:from-indigo-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
                    />
                  </svg>
                  Present timeline
                </button>
                <button
                  type="button"
                  onClick={() => setEditProjectOpen(true)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Edit project
                </button>
                <button
                  type="button"
                  onClick={() => setAddEntryOpen(true)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Add entry
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <p className="text-sm text-slate-600">
              {periodEntryCount} entr{periodEntryCount === 1 ? "y" : "ies"}
              {periodFilter !== "all"
                ? ` · ${PERIOD_FILTERS.find((p) => p.value === periodFilter)?.label}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {PERIOD_FILTERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriodFilter(p.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    periodFilter === p.value
                      ? "bg-slate-800 text-white ring-slate-800"
                      : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {projectEntries.length === 0 ? (
            <EmptyIllustration
              title="No entries for this period"
              description={
                periodFilter === "last_month"
                  ? "No entries recorded last month. Try another period or add a new entry."
                  : "Add a timeline entry to log what happened on this project."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-white text-xs font-bold uppercase tracking-wide text-slate-800">
                    <th className="w-40 px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 sm:px-6">Remarks</th>
                    <th className="w-48 px-4 py-3 sm:px-6">Photos</th>
                    <th className="w-28 px-4 py-3 text-right sm:px-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-200 align-top"
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800 sm:px-6">
                        {formatEntryDate(entry.entry_date)}
                      </td>
                      <td className="px-4 py-4 text-slate-700 sm:px-6">
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {entry.remarks || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        {entry.photo_url ? (
                          <button
                            type="button"
                            onClick={() => setViewPhotoUrl(entry.photo_url)}
                            className="block overflow-hidden rounded-lg ring-2 ring-slate-200 transition hover:ring-blue-400"
                          >
                            <img
                              src={entry.photo_url}
                              alt=""
                              className="h-28 w-auto max-w-[12rem] object-cover"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntry(entry);
                              setEditEntryOpen(true);
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry)}
                            disabled={deletingEntryId === entry.id}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingEntryId === entry.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <Layout>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-x-hidden bg-gradient-to-b from-slate-50/80 via-transparent to-blue-50/40 pb-10 sm:space-y-8 lg:max-w-[min(80rem,calc(100vw-19rem))]">
        <section className="ut-animate-in relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 px-4 py-4 shadow-lg shadow-blue-900/20 sm:px-5 sm:py-5">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/15 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1),_transparent_55%)]"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-50 backdrop-blur-sm sm:text-xs">
                PSTO Calendar · Project monitoring
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Project timeline
              </h1>
              <p className="max-w-xl text-xs leading-relaxed text-blue-100/85 sm:text-sm">
                Track progress for each project — CEST, SETUP, GIA, SSCP. View
                reports by period (last month, this month).{" "}
                <span className="text-white/90">{todayLabel}</span>
              </p>

              {!selectedProject ? (
                <label className="relative mt-2 block max-w-md">
                  <span className="sr-only">Search projects</span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search project title, location…"
                    className="w-full rounded-lg border border-white/20 bg-white/95 py-2 pl-9 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-white focus:ring-2 focus:ring-white/40"
                  />
                  <svg
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </label>
              ) : null}
            </div>

            {!selectedProject ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setAddProjectOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-blue-700 shadow transition hover:bg-blue-50 sm:text-sm"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  New project
                </button>
                <button
                  type="button"
                  onClick={loadProjects}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50 sm:text-sm"
                >
                  Refresh
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {!selectedProject ? (
          <>
            <div className="ut-animate-in ut-delay-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Total projects"
                value={loading ? "…" : stats.total}
                accent="slate"
                sublabel="All programs"
              />
              <StatCard
                label="SETUP"
                value={loading ? "…" : stats.setup}
                accent="emerald"
                sublabel="Active projects"
              />
              <StatCard
                label="GIA"
                value={loading ? "…" : stats.gia}
                accent="blue"
                sublabel="Active projects"
              />
              <StatCard
                label="SSCP"
                value={loading ? "…" : stats.sscp}
                accent="violet"
                sublabel="Active projects"
              />
              <StatCard
                label="CEST"
                value={loading ? "…" : stats.cest}
                accent="amber"
                sublabel="Active projects"
              />
            </div>
            {renderProjectList()}
          </>
        ) : (
          renderProjectReport()
        )}
      </div>

      <AddMonitoringProjectModal
        isOpen={addProjectOpen}
        onClose={() => setAddProjectOpen(false)}
        onSuccess={handleProjectCreated}
      />

      <EditMonitoringProjectModal
        isOpen={editProjectOpen}
        project={selectedProject}
        onClose={() => setEditProjectOpen(false)}
        onSuccess={loadProjects}
      />

      <AddTimelineEntryModal
        isOpen={addEntryOpen}
        project={selectedProject}
        onClose={() => setAddEntryOpen(false)}
        onSuccess={loadProjects}
      />

      <EditTimelineEntryModal
        isOpen={editEntryOpen}
        entry={editingEntry}
        onClose={() => {
          setEditEntryOpen(false);
          setEditingEntry(null);
        }}
        onSuccess={loadProjects}
      />

      {presentationOpen && selectedProject ? (
        <ProjectTimelinePresentation
          project={selectedProject}
          entries={allProjectEntries}
          onClose={() => setPresentationOpen(false)}
          onViewPhoto={setViewPhotoUrl}
        />
      ) : null}

      {viewPhotoUrl ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setViewPhotoUrl(null)}
            aria-label="Close photo preview"
          />
          <img
            src={viewPhotoUrl}
            alt="Timeline entry"
            className="relative z-10 max-h-[85vh] max-w-full rounded-xl shadow-2xl"
          />
        </div>
      ) : null}
    </Layout>
  );
};

export default ProjectTimeline;
