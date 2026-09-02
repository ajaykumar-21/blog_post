export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export function getSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("storyline-session");
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(session) {
  window.localStorage.setItem("storyline-session", JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem("storyline-session");
}
