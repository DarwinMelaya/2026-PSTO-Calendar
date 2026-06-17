import supabase from "./supabaseClient";

const mapRow = (row) => ({
  id: row.id,
  name: row.name,
  url: row.url,
  createdAt: row.created_at,
});

const normalizeUrl = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const toDbPayload = ({ name, url }) => ({
  name: name.trim(),
  url: normalizeUrl(url),
});

export const listAdminLinks = async () => {
  const { data, error } = await supabase
    .from("admin_links")
    .select("id, name, url, created_at")
    .order("name", { ascending: true });

  return { data: (data ?? []).map(mapRow), error };
};

export const createAdminLink = async ({ name, url }) => {
  const { data, error } = await supabase
    .from("admin_links")
    .insert(toDbPayload({ name, url }))
    .select("id, name, url, created_at")
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const updateAdminLink = async (id, { name, url }) => {
  const { data, error } = await supabase
    .from("admin_links")
    .update(toDbPayload({ name, url }))
    .eq("id", Number(id))
    .select("id, name, url, created_at")
    .single();

  return { data: data ? mapRow(data) : null, error };
};

export const deleteAdminLink = async (id) => {
  const { error } = await supabase
    .from("admin_links")
    .delete()
    .eq("id", Number(id));

  return { error };
};
