import supabase from "./supabaseClient";

export const createProfile = async ({ email, password, role }) => {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ email: email.trim(), password, role })
    .select("id, email, role")
    .single();

  return { data, error };
};

export const loginProfile = async ({ email, password }) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("email", email.trim())
    .eq("password", password)
    .maybeSingle();

  return { data, error };
};
