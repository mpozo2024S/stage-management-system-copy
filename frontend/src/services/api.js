const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getToken = () => localStorage.getItem("access_token");
export const setToken = (token) => localStorage.setItem("access_token", token);
export const removeToken = () => localStorage.removeItem("access_token");

async function parseError(res) {
  try {
    const data = await res.json();

    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data.detail)) {
      return data.detail.map((e) => e.msg).join(", ");
    }

    return data.detail || data.message || "Something went wrong";
  } catch {
    return res.statusText || "Request failed";
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
  ...(options.body instanceof FormData
    ? {}
    : { "Content-Type": "application/json" }),

  ...(token
    ? { Authorization: `Bearer ${token}` }
    : {}),

  ...options.headers,
};

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && getToken()) {
  removeToken();
  window.location.href = "/login";
}

  if (!res.ok) {
  const message = await parseError(res);
  throw new Error(message);
}

  if (res.status === 204) return null;
  return res.json();
}

export default request;

/**
 * Upload a file as multipart/form-data.
 * Omits Content-Type so the browser sets the correct boundary automatically.
 */
export async function uploadFile(path, formData) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401) {
    removeToken();
    window.location.href = "/login";
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }

  if (res.status === 204) return null;
  return res.json();
}