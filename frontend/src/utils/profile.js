import supabase from "./supabaseClient";

export const createProfile = async ({ email, codeName, password, role }) => {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      email: email.trim(),
      code_name: codeName.trim(),
      password,
      role,
    })
    .select("id, email, code_name, role")
    .single();

  return { data, error };
};

export const listProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, code_name, role, created_at")
    .order("created_at", { ascending: false });

  return { data, error };
};

export const loginProfile = async ({ email, password }) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, code_name, role")
    .eq("email", email.trim())
    .eq("password", password)
    .maybeSingle();

  return { data, error };
};
