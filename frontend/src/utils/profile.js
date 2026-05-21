import supabase from "./supabaseClient";

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
