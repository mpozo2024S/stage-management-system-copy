import request from "./api.js";

export function getTutorials() {
  return request("/tutorials");
}

export function getTutorial(id) {
  return request(`/tutorials/${id}`);
}

export function createTutorial(data) {
  return request("/tutorials", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTutorial(id, data) {
  return request(`/tutorials/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteTutorial(id) {
  return request(`/tutorials/${id}`, { method: "DELETE" });
}
