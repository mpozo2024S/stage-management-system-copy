import request from "./api.js";

/** GET /users/me — current user profile */
export function getMe() {
  return request("/users/me");
}

/** GET /users — list all users (Admin only) */
export function getUsers() {
  return request("/users");
}

/** PUT /users/:id/role — change a user's role (Admin only) */
export function updateUserRole(id, role) {
  return request(`/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

/** DELETE /users/:id (Admin only) */
export function deleteUser(id) {
  return request(`/users/${id}`, { method: "DELETE" });
}
