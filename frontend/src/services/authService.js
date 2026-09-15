import request, { setToken } from "./api.js";

/**
 * POST /auth/register
 * @param {{ name, email, password, role }} data
 */
export async function register(data) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * POST /auth/login  (OAuth2PasswordRequestForm — must be form-encoded)
 * @param {{ email, password }} credentials
 */
export async function login({ email, password }) {
  const body = new URLSearchParams({
    username: email,
    password,
  });

  const data = await request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  setToken(data.access_token);

  return data;
}
