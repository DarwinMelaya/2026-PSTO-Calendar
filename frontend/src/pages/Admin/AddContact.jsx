import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AddContactModal from "../../components/Modals/AdminModals/AddContactModal";
import Layout from "../../components/Layout/Layout";
import {
  EmptyIllustration,
  getGreeting,
  PanelHeader,
  StatCard,
} from "../../components/User/UserWorkspaceUI";
import {
  collectCategories,
  deleteContact,
  listContacts,
  toDialableNumber,
} from "../../utils/contacts";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const categoryBadgeClass = (category) => {
  const key = (category || "").toUpperCase();
  if (key === "GIA") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (key === "SETUP") return "bg-sky-50 text-sky-700 ring-sky-200";
  if (key === "CEST") return "bg-violet-50 text-violet-700 ring-violet-200";
  if (key === "SSCP") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (key === "LGUS" || key === "LGU")
    return "bg-teal-50 text-teal-700 ring-teal-200";
  if (key === "PGM") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const CategoryBadge = ({ category }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${categoryBadgeClass(category)}`}
  >
    {category}
  </span>
);

const PhoneActionButtons = ({ number, showText = false }) => {
  const dialable = toDialableNumber(number);
  if (!dialable) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <a
        href={`tel:${dialable}`}
        title={`Call ${number}`}
        aria-label={`Call ${number}`}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
          />
        </svg>
        Call
      </a>
      {showText && (
        <a
          href={`sms:${dialable}`}
          title={`Text ${number}`}
          aria-label={`Text ${number}`}
          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-sky-600/25 transition hover:bg-sky-700 active:scale-95"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          Text
        </a>
      )}
    </div>
  );
};

const ContactCard = ({ contact, onEdit, onDelete, isDeleting, index }) => {
  const delay = `${index * 40}ms`;

  return (
    <div
      className="ut-animate-in group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] transition duration-200 hover:-translate-y-1 hover:border-slate-300/80 hover:shadow-xl hover:shadow-slate-900/[0.08]"
      style={{ animationDelay: delay }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 text-sm font-bold text-slate-600 shadow-sm">
          {(contact.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-bold leading-snug text-slate-900"
            title={contact.name}
          >
            {contact.name}
          </p>
          <div className="mt-1.5">
            <CategoryBadge category={contact.category} />
          </div>
        </div>
      </div>

      <div className="mx-5 mb-4 space-y-2">
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <span className="truncate">{contact.email}</span>
          </a>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-400">
            No email
          </p>
        )}

        {contact.mobileNumber ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
              <span className="min-w-0 flex-1 truncate">
                {contact.mobileNumber}
              </span>
            </div>
            <div className="mt-2">
              <PhoneActionButtons number={contact.mobileNumber} showText />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-400">
            No mobile number
          </p>
        )}

        {contact.telephoneNumber ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
              <span className="min-w-0 flex-1 truncate">
                {contact.telephoneNumber}
              </span>
            </div>
            <div className="mt-2">
              <PhoneActionButtons number={contact.telephoneNumber} />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-400">
            No telephone number
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <span className="text-[11px] font-medium text-slate-400">
          {formatDate(contact.createdAt)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(contact)}
            disabled={isDeleting}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(contact)}
            disabled={isDeleting}
            className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SkeletonCards = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }, (_, i) => (
      <div
        key={i}
        className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded-lg bg-slate-100" />
            <div className="h-3 w-1/2 rounded-lg bg-slate-100" />
          </div>
        </div>
        <div className="mt-4 h-9 w-full rounded-lg bg-slate-100" />
        <div className="mt-2 h-9 w-full rounded-lg bg-slate-100" />
        <div className="mt-4 flex gap-2">
          <div className="h-8 w-14 rounded-lg bg-slate-100" />
          <div className="h-8 w-14 rounded-lg bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

const AddContact = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("category");
  const [viewMode, setViewMode] = useState("grid");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listContacts();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContacts(data ?? []);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const categories = useMemo(
    () => collectCategories(contacts),
    [contacts],
  );

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = contacts;

    if (categoryFilter !== "all") {
      list = list.filter((c) => c.category === categoryFilter);
    }

    if (q) {
      list = list.filter((c) =>
        [c.name, c.email, c.mobileNumber, c.telephoneNumber, c.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    const sorted = [...list];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "newest") {
      sorted.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
    } else {
      sorted.sort((a, b) => {
        const cat = a.category.localeCompare(b.category);
        return cat !== 0 ? cat : a.name.localeCompare(b.name);
      });
    }
    return sorted;
  }, [contacts, searchQuery, categoryFilter, sortBy]);

  const countsByCategory = useMemo(() => {
    const map = {};
    for (const c of contacts) {
      map[c.category] = (map[c.category] || 0) + 1;
    }
    return map;
  }, [contacts]);

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

  const openAdd = () => {
    setEditingContact(null);
    setModalOpen(true);
  };
  const openEdit = (contact) => {
    setEditingContact(contact);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingContact(null);
  };

  const handleDelete = async (contact) => {
    const confirmed = window.confirm(
      `Delete contact "${contact.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeletingId(contact.id);
    const { error } = await deleteContact(contact.id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact deleted.");
    loadContacts();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 bg-gradient-to-b from-slate-50/80 via-transparent to-sky-50/30 pb-12 sm:space-y-8">
        <section className="ut-animate-in relative overflow-hidden rounded-3xl border border-sky-400/20 bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-900 px-6 py-8 shadow-2xl shadow-blue-900/30 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl"
            aria-hidden
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                </span>
                PSTO Calendar · Contacts
              </div>
              <div>
                <p className="text-sm font-medium text-sky-100/90">
                  {getGreeting()}
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Contacts directory
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-sky-100/85 sm:text-base">
                  Store names, emails, mobile, and telephone numbers tagged by
                  where they belong — with Call and Text shortcuts to your
                  phone apps.
                </p>
              </div>
              <p className="text-xs font-medium text-sky-200/80">
                {todayLabel}
              </p>
            </div>

            <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xs lg:grid-cols-1">
              <StatCard
                label="Total contacts"
                value={loading ? "…" : String(contacts.length)}
                sublabel="Saved in database"
                accent="sky"
              />
              <StatCard
                label="Categories"
                value={loading ? "…" : String(categories.length)}
                sublabel="Including custom tags"
                accent="amber"
              />
            </div>
          </div>
        </section>

        <section className="ut-animate-in ut-delay-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-300/25 ring-1 ring-slate-900/[0.04] backdrop-blur-sm">
          <PanelHeader
            iconGradient="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            }
            title="Saved contacts"
            subtitle="Add contacts and filter by category (LGUs, GIA, CEST, etc.)."
            action={
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-blue-700 active:scale-95"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Add contact
              </button>
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:px-6">
            <div className="relative min-w-0 flex-1 max-w-sm">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, mobile, telephone…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                    {countsByCategory[cat]
                      ? ` (${countsByCategory[cat]})`
                      : ""}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                aria-label="Sort contacts"
              >
                <option value="category">Sort by category</option>
                <option value="name">Sort by name</option>
                <option value="newest">Newest first</option>
              </select>

              {!loading && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                  {filteredContacts.length} contact
                  {filteredContacts.length !== 1 ? "s" : ""}
                </span>
              )}

              <button
                type="button"
                onClick={loadContacts}
                disabled={loading}
                title="Refresh"
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40"
              >
                <svg
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>

              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  title="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition ${viewMode === "grid" ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Table view"
                  onClick={() => setViewMode("table")}
                  className={`p-2 transition ${viewMode === "table" ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {!loading && categories.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  categoryFilter === "all"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    categoryFilter === cat
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                  {countsByCategory[cat] ? (
                    <span className="ml-1 opacity-70">
                      {countsByCategory[cat]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}

          <div className="p-5 sm:p-6">
            {loading && <SkeletonCards />}

            {!loading && filteredContacts.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center">
                <EmptyIllustration
                  variant={
                    searchQuery || categoryFilter !== "all" ? "filter" : "empty"
                  }
                />
                <p className="mt-6 text-lg font-bold text-slate-900">
                  {searchQuery || categoryFilter !== "all"
                    ? "No matching contacts"
                    : "No contacts yet"}
                </p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                  {searchQuery || categoryFilter !== "all"
                    ? "Try a different search or category filter."
                    : "Add your first contact and tag them (LGUs, GIA, CEST, etc.)."}
                </p>
                {!searchQuery && categoryFilter === "all" && (
                  <button
                    type="button"
                    onClick={openAdd}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-600/25 transition hover:from-sky-700 hover:to-blue-700"
                  >
                    Add first contact
                  </button>
                )}
              </div>
            )}

            {!loading &&
              filteredContacts.length > 0 &&
              viewMode === "grid" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredContacts.map((contact, i) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      index={i}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      isDeleting={deletingId === contact.id}
                    />
                  ))}
                </div>
              )}

            {!loading &&
              filteredContacts.length > 0 &&
              viewMode === "table" && (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/30 text-xs font-bold uppercase tracking-widest text-slate-500">
                        <th className="px-5 py-3.5 sm:px-6">#</th>
                        <th className="px-5 py-3.5 sm:px-6">Name</th>
                        <th className="px-5 py-3.5 sm:px-6">Category</th>
                        <th className="px-5 py-3.5 sm:px-6">Email</th>
                        <th className="px-5 py-3.5 sm:px-6">Mobile</th>
                        <th className="px-5 py-3.5 sm:px-6">Telephone</th>
                        <th className="px-5 py-3.5 text-right sm:px-6">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredContacts.map((contact, i) => (
                        <tr
                          key={contact.id}
                          className="group transition duration-150 hover:bg-sky-50/40"
                        >
                          <td className="px-5 py-4 text-xs font-bold tabular-nums text-slate-300 sm:px-6">
                            {i + 1}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-900 sm:px-6">
                            {contact.name}
                          </td>
                          <td className="px-5 py-4 sm:px-6">
                            <CategoryBadge category={contact.category} />
                          </td>
                          <td className="max-w-[180px] px-5 py-4 sm:px-6">
                            {contact.email ? (
                              <a
                                href={`mailto:${contact.email}`}
                                className="line-clamp-1 text-sky-700 underline-offset-2 hover:underline"
                              >
                                {contact.email}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 sm:px-6">
                            {contact.mobileNumber ? (
                              <div className="space-y-1.5">
                                <p className="whitespace-nowrap text-slate-600">
                                  {contact.mobileNumber}
                                </p>
                                <PhoneActionButtons
                                  number={contact.mobileNumber}
                                  showText
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 sm:px-6">
                            {contact.telephoneNumber ? (
                              <div className="space-y-1.5">
                                <p className="whitespace-nowrap text-slate-600">
                                  {contact.telephoneNumber}
                                </p>
                                <PhoneActionButtons
                                  number={contact.telephoneNumber}
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">
                            <div className="flex justify-end gap-2 opacity-70 transition group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => openEdit(contact)}
                                disabled={deletingId === contact.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(contact)}
                                disabled={deletingId === contact.id}
                                className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === contact.id
                                  ? "Deleting…"
                                  : "Delete"}
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
      </div>

      <AddContactModal
        isOpen={modalOpen}
        editContact={editingContact}
        knownCategories={categories}
        onClose={closeModal}
        onSuccess={loadContacts}
      />
    </Layout>
  );
};

export default AddContact;
