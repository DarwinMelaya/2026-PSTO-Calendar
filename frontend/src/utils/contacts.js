import supabase from "./supabaseClient";

/** Built-in category options; custom categories can be added when saving a contact. */
export const DEFAULT_CONTACT_CATEGORIES = [
  "LGUs",
  "PGM",
  "GIA",
  "CEST",
  "SETUP",
  "SSCP",
];

const SELECT_COLS =
  "id, name, email, organization, mobile_numbers, telephone_number, category, created_at, updated_at";

/** Normalize mobile numbers from DB (text[]) or legacy string into a string[]. */
export const normalizeMobileNumbers = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((n) => (typeof n === "string" ? n.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
};

const mapRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email ?? "",
  organization: row.organization ?? "",
  mobileNumbers: normalizeMobileNumbers(row.mobile_numbers),
  /** Primary mobile for backward-compatible display helpers. */
  mobileNumber: normalizeMobileNumbers(row.mobile_numbers)[0] ?? "",
  telephoneNumber: row.telephone_number ?? "",
  category: row.category,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const trimOrEmpty = (value) => (typeof value === "string" ? value.trim() : "");

const toDbPayload = ({
  name,
  email,
  organization,
  mobileNumbers,
  mobileNumber,
  telephoneNumber,
  category,
}) => {
  const numbers = normalizeMobileNumbers(
    mobileNumbers ?? (mobileNumber ? [mobileNumber] : []),
  );

  return {
    name: name.trim(),
    email: trimOrEmpty(email),
    organization: trimOrEmpty(organization),
    mobile_numbers: numbers,
    telephone_number: trimOrEmpty(telephoneNumber),
    category: category.trim(),
    updated_at: new Date().toISOString(),
  };
};

/** Digits (and leading +) for tel: / sms: deep links. */
export const toDialableNumber = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return hasPlus ? `+${digits}` : digits;
};

export const listContacts = async () => {
  const { data, error } = await supabase
    .from("contacts")
    .select(SELECT_COLS)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return { data: (data ?? []).map(mapRow), error };
};

export const createContact = async (fields) => {
  const { data, error } = await supabase
    .from("contacts")
    .insert(toDbPayload(fields))
    .select(SELECT_COLS)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const updateContact = async (id, fields) => {
  const { data, error } = await supabase
    .from("contacts")
    .update(toDbPayload(fields))
    .eq("id", Number(id))
    .select(SELECT_COLS)
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const deleteContact = async (id) => {
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", Number(id));

  return { error };
};

/**
 * Merge built-in categories with any custom ones already stored on contacts.
 */
export const collectCategories = (contacts = []) => {
  const fromDb = contacts
    .map((c) => c.category)
    .filter(Boolean)
    .map((c) => c.trim());

  return Array.from(new Set([...DEFAULT_CONTACT_CATEGORIES, ...fromDb])).sort(
    (a, b) => a.localeCompare(b),
  );
};
