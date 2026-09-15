import request from "./api.js";

export function getProductions() {
  return request("/productions/");
}

export function createProduction(data) {
  return request("/productions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProduction(id, data) {
  return request(`/productions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function assignProductionItems(id, items) {
  return request(`/productions/${id}/assign-batch`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function returnProductionItems(id, productionItemIds) {
  return request(`/productions/${id}/return-batch`, {
    method: "POST",
    body: JSON.stringify({ production_item_ids: productionItemIds }),
  });
}

export function closeProduction(id) {
  return request(`/productions/${id}/return-all`, {
    method: "POST",
  });
}
