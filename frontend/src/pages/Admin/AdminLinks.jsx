import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AdminLinkModal from "../../components/Modals/AdminModals/AdminLinkModal";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  StatCard,
} from "../../components/User/UserWorkspaceUI";
import { deleteAdminLink, listAdminLinks } from "../../utils/adminLinks";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getFaviconUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return null;
  }
};


const FaviconCell = ({ url }) => {
  const [err, setErr] = useState(false);
  const src = getFaviconUrl(url);
  if (src && !err) {
    return (
      <img src={src} alt="" width={16} height={16} onError={() => setErr(true)} className="h-4 w-4 object-contain" />
    );
  }
  return (
    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
};

const LinkCard = ({ link, onEdit, onDelete, isDeleting }) => {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getFaviconUrl(link.url);

  const handleCopy = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-md hover:shadow-slate-900/[0.07]">
      {/* Card header */}
      <div className="flex items-start gap-3 p-5 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
          {faviconUrl && !faviconError ? (
            <img
              src={faviconUrl}
              alt=""
              width={20}
              height={20}
              onError={() => setFaviconError(true)}
              className="h-5 w-5 object-contain"
            />
          ) : (
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900" title={link.name}>
            {link.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-400">{formatDate(link.createdAt)}</p>
        </div>
      </div>

      {/* URL row */}
      <div className="flex items-center gap-2 px-5 pb-4">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate text-xs text-blue-600 underline-offset-2 hover:underline"
          title={link.url}
        >
          {link.url}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy URL"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          {copied ? (
            <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          )}
        </button>
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Open
        </a>
        <button
          type="button"
          onClick={() => onEdit(link)}
          disabled={isDeleting}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(link)}
          disabled={isDeleting}
          className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
        >
          {isDeleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
};


const AdminLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  const loadLinks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listAdminLinks();
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setLinks(data ?? []);
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return links;
    return links.filter((link) =>
      [link.name, link.url].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [links, searchQuery]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    [],
  );

  const openAdd = () => { setEditingLink(null); setModalOpen(true); };
  const openEdit = (link) => { setEditingLink(link); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingLink(null); };

  const handleDelete = async (link) => {
    const confirmed = window.confirm(`Delete link "${link.name}"? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(link.id);
    const { error } = await deleteAdminLink(link.id);
    setDeletingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Link deleted.");
    loadLinks();
  };


  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 bg-gradient-to-b from-slate-50/80 via-transparent to-sky-50/30 pb-10 sm:space-y-8">

        {/* ── Hero banner ── */}
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-900 px-6 py-8 shadow-2xl shadow-blue-900/30 sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-50 backdrop-blur-sm">
                PSTO Calendar · Quick links
              </div>
              <div>
                <p className="text-sm font-medium text-sky-100/90">{getGreeting()}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Admin links
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-sky-100/85 sm:text-base">
                  Manage named links for portals, forms, and other resources your team uses often.
                </p>
              </div>
              <p className="text-xs font-medium text-sky-200/80">{todayLabel}</p>
            </div>

            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-sm lg:grid-cols-1">
              <StatCard
                label="Total links"
                value={loading ? "…" : String(links.length)}
                sublabel="Saved in database"
                accent="sky"
              />
            </div>
          </div>
        </section>

        {/* ── Main panel ── */}
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
          <PanelHeader
            iconGradient="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            }
            title="Saved links"
            subtitle="Add, edit, or remove named links."
            action={
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add link
              </button>
            }
          />

          {/* Search + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
            <div className="relative max-w-md flex-1">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or URL…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              {!loading && filteredLinks.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {filteredLinks.length} link{filteredLinks.length !== 1 ? "s" : ""}
                </span>
              )}
              {/* View toggle */}
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  title="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition ${viewMode === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Table view"
                  onClick={() => setViewMode("table")}
                  className={`p-2 transition ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>


          {/* ── Loading skeletons ── */}
          {loading && (
            <div className="border-t border-slate-100 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-3/4 rounded-lg bg-slate-200" />
                        <div className="h-3 w-1/2 rounded-lg bg-slate-200" />
                      </div>
                    </div>
                    <div className="mt-4 h-3 w-full rounded-lg bg-slate-200" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-8 flex-1 rounded-xl bg-slate-200" />
                      <div className="h-8 w-14 rounded-xl bg-slate-200" />
                      <div className="h-8 w-14 rounded-xl bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && filteredLinks.length === 0 && (
            <div className="border-t border-slate-100 px-5 py-14 sm:px-6">
              <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                <EmptyIllustration variant={searchQuery ? "filter" : "empty"} />
                <p className="mt-6 text-lg font-bold text-slate-900">
                  {searchQuery ? "No matching links" : "No links yet"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {searchQuery
                    ? "Try a different search term or clear the filter."
                    : "Add your first named link using the button above."}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={openAdd}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add first link
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Grid view ── */}
          {!loading && filteredLinks.length > 0 && viewMode === "grid" && (
            <div className="border-t border-slate-100 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    isDeleting={deletingId === link.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Table view ── */}
          {!loading && filteredLinks.length > 0 && viewMode === "table" && (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 sm:px-6">Name of link</th>
                    <th className="px-5 py-3 sm:px-6">Link</th>
                    <th className="px-5 py-3 sm:px-6">Added</th>
                    <th className="px-5 py-3 text-right sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                            <FaviconCell url={link.url} />
                          </div>
                          <span className="font-medium text-slate-900">{link.name}</span>
                        </div>
                      </td>
                      <td className="max-w-[280px] px-5 py-4 sm:px-6">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-1 break-all text-blue-700 underline-offset-2 hover:underline"
                          title={link.url}
                        >
                          {link.url}
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600 sm:px-6">
                        {formatDate(link.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(link)}
                            disabled={deletingId === link.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(link)}
                            disabled={deletingId === link.id}
                            className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === link.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AdminLinkModal
        isOpen={modalOpen}
        editLink={editingLink}
        onClose={closeModal}
        onSuccess={loadLinks}
      />
    </Layout>
  );
};

export default AdminLinks;

