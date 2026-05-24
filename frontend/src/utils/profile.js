import supabase from "./supabaseClient";

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  VIEWER: "viewer",
};

export const ROLE_OPTIONS = [
  { value: ROLES.USER, label: "User" },
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.VIEWER, label: "Viewer (read-only)" },
];

export const isAdminRole = (role) => role === ROLES.ADMIN;
export const isViewerRole = (role) => role === ROLES.VIEWER;
export const isUserRole = (role) => role === ROLES.USER;

export const getHomePathForRole = (role) => {
  if (isAdminRole(role)) return "/admin-dashboard";
  if (isViewerRole(role)) return "/viewer-dashboard";
  return "/user-dashboard";
};

export const createProfile = async ({
  email,
  name,
  codeName,
  password,
  role,
}) => {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      email: email.trim(),
      name: name?.trim() || null,
      code_name: codeName.trim(),
      password,
      role,
    })
    .select("id, email, name, code_name, role")
    .single();

  return { data, error };
};

export const getProfileById = async (id) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, code_name, role")
    .eq("id", id)
    .maybeSingle();

  return { data, error };
};

export const listProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, code_name, role, created_at")
    .order("created_at", { ascending: false });

  return { data, error };
};

export const updateProfile = async ({
  id,
  email,
  name,
  codeName,
  role,
  password,
}) => {
  const payload = {
    email: email.trim(),
    name: name?.trim() || null,
    code_name: codeName.trim(),
    role,
  };

  if (password) {
    payload.password = password;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id, email, name, code_name, role")
    .single();

  return { data, error };
};

export const deleteProfile = async (id) => {
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  return { error };
};

export const loginProfile = async ({ email, password }) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, name, code_name, role")
    .eq("email", email.trim())
    .eq("password", password)
    .maybeSingle();

  return { data, error };
};
