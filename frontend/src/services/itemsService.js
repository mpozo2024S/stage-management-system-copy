import request from "./api.js";
import { supabase } from "../lib/supabase.js";

/**
 * GET /items  — list all items (paginated)
 * @param {{ skip?: number, limit?: number, category_id?: number }} params
 */
export function getItems(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/items${qs ? `?${qs}` : ""}`);
}

/**
 * GET /items/:id  — single item detail
 */
export function getItem(id) {
  return request(`/items/${id}`);
}

/**
 * POST /items  — create a new item
 * Requires: Admin or InventoryManager role
 */
export function createItem(data) {
  return request("/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PUT /items/:id  — update an item
 */
export function updateItem(id, data) {
  return request(`/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE /items/:id
 */
export function deleteItem(id) {
  return request(`/items/${id}`, { method: "DELETE" });
}

/**
 * PATCH /items/:id/quantity  — increment or decrement available stock
 * @param {number} id
 * @param {number} quantityChange  positive to add, negative to subtract
 */
export function patchItemQuantity(id, quantityChange) {
  return request(`/items/${id}/quantity`, {
    method: "PATCH",
    body: JSON.stringify({ quantity_change: quantityChange }),
  });
}

/**
 * GET /items/:id/transactions  — audit log for a single item
 */
export function getItemTransactions(id) {
  return request(`/items/${id}/transactions`);
}

// ── Categories ─────────────────────────────────────────────────
export function getCategories() {
  return request("/items/categories");
}

export function createCategory(data) {
  return request("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Locations ──────────────────────────────────────────────────
export function getLocations() {
  return request("/items/locations");
}

export function createLocation(data) {
  return request("/locations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Photos ─────────────────────────────────────────────────────
export async function uploadItemPhoto(id, file) {
  const fileName = `${id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("item-photos")
    .upload(fileName, file, { upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { data: { publicUrl } } = supabase.storage
    .from("item-photos")
    .getPublicUrl(fileName);
  return request(`/items/${id}/photos`, {
    method: "POST",
    body: JSON.stringify({ url: publicUrl }),
  });
}
