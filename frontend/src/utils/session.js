const SESSION_KEY = "psto_user";

export const setSession = (user) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};
