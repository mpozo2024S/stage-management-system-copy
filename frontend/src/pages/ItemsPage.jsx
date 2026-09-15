import { useState, useRef } from "react";
import { useItems } from "../context/ItemsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Table, Badge, Button, Modal, Input, Select,
  FormField, Alert,
} from "../components/ui/index.jsx";

const CONDITIONS = ["New", "Good", "Fair", "Poor", "Damaged"];

// ── Full-size image popup ─────────────────────────────────────────────────────
function ImagePopup({ url, name, onClose }) {
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt={name}
          className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          ✕
        </button>
        <p className="text-center text-white/70 text-sm mt-2">{name}</p>
      </div>
    </div>
  );
}

// Compress before upload — src assigned after handlers to avoid race condition on fast devices
function compressImage(file, { maxWidthPx = 1200, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
          } else {
            reject(new Error("Compression failed"));
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Could not read image file"));
    img.src = URL.createObjectURL(file);
  });
}

// ── Photo upload field ────────────────────────────────────────────────────────
// For Add Item (no itemId): stores the compressed File via onPendingFile so
// the parent can upload it immediately after the item is created.
function PhotoUploadField({ itemId, existingUrl, onPendingFile }) {
  const { uploadPhoto } = useItems();
  const [preview, setPreview]         = useState(existingUrl || null);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    let compressed;
    try {
      compressed = await compressImage(file);
    } catch (err) {
      setUploadError("Could not process image: " + err.message);
      return;
    }

    setPreview(URL.createObjectURL(compressed));

    if (!itemId) {
      onPendingFile?.(compressed);
      return;
    }

    setUploading(true);
    try {
      await uploadPhoto(itemId, compressed);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Photo</p>
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <Button
            type="button"
            variant="secondary"
            className="text-xs py-1 px-3"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {preview ? "Change photo" : "Upload photo"}
          </Button>
          {!itemId && preview && (
            <p className="text-xs text-amber-600">Photo will upload after saving.</p>
          )}
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ── Item form modal (Add + Edit) ──────────────────────────────────────────────
function ItemFormModal({ open, onClose, initial, onSave }) {
  const { categories, locations, uploadPhoto } = useItems();
  const [form, setForm] = useState(
    initial
      ? {
          ...initial,
          description:     initial.description     ?? "",
          unit:            initial.unit            ?? "",
          weight_per_unit: initial.weight_per_unit ?? "",
          height_cm:       initial.height_cm       ?? "",
          width_cm:        initial.width_cm        ?? "",
          depth_cm:        initial.depth_cm        ?? "",
          colour:          initial.colour          ?? "",
        }
      : {
          name: "", description: "", total_quantity: 0, available_quantity: 0,
          category_id: "", location_id: "", unit: "", reorder_threshold: 0,
          weight_per_unit: "", condition: "Good",
          height_cm: "", width_cm: "", depth_cm: "", colour: "",
        }
  );
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const pendingPhotoRef = useRef(null);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const saved = await onSave({
        ...form,
        total_quantity:     Number(form.total_quantity),
        available_quantity: Number(form.available_quantity),
        reorder_threshold:  Number(form.reorder_threshold),
        weight_per_unit:    form.weight_per_unit ? Number(form.weight_per_unit) : null,
        category_id:        Number(form.category_id),
        location_id:        Number(form.location_id),
        height_cm: form.height_cm !== "" && form.height_cm != null ? Number(form.height_cm) : null,
        width_cm:  form.width_cm  !== "" && form.width_cm  != null ? Number(form.width_cm)  : null,
        depth_cm:  form.depth_cm  !== "" && form.depth_cm  != null ? Number(form.depth_cm)  : null,
        colour: form.colour?.trim() || null,
      });

      if (!initial && pendingPhotoRef.current && saved?.id) {
        try {
          await uploadPhoto(saved.id, pendingPhotoRef.current);
        } catch {
          // Non-fatal — item was created, photo can be added via Edit
        }
      }

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Item" : "Add New Item"}>
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: "calc(100vh - 10rem)", minHeight: 0 }}>
        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          <Alert type="error" message={error} />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Name" className="col-span-2">
              <Input name="name" value={form.name} onChange={set} required />
            </FormField>

            <FormField label="Category">
              <Select name="category_id" value={form.category_id} onChange={set} required>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Location">
              <Select name="location_id" value={form.location_id} onChange={set} required>
                <option value="">Select…</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </FormField>

            <FormField label="Total Qty">
              <Input type="number" name="total_quantity" min={0} value={form.total_quantity} onChange={set} required />
            </FormField>

            <FormField label="Available Qty">
              <Input type="number" name="available_quantity" min={0} value={form.available_quantity} onChange={set} required />
            </FormField>

            <FormField label="Unit (e.g. pcs, kg)">
              <Input name="unit" value={form.unit} onChange={set} />
            </FormField>

            <FormField label="Reorder Threshold">
              <Input type="number" name="reorder_threshold" min={0} value={form.reorder_threshold} onChange={set} />
            </FormField>

            <FormField label="Condition">
              <Select name="condition" value={form.condition} onChange={set}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>

            <FormField label="Weight per unit (kg)">
              <Input type="number" step="0.01" name="weight_per_unit" value={form.weight_per_unit} onChange={set} />
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              name="description"
              rows={2}
              value={form.description}
              onChange={set}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Physical Details <span className="font-normal normal-case">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Height (cm)">
                <Input type="number" step="0.01" min={0} name="height_cm" value={form.height_cm} onChange={set} placeholder="e.g. 120" />
              </FormField>

              <FormField label="Width (cm)">
                <Input type="number" step="0.01" min={0} name="width_cm" value={form.width_cm} onChange={set} placeholder="e.g. 60" />
              </FormField>

              <FormField label="Depth (cm)">
                <Input type="number" step="0.01" min={0} name="depth_cm" value={form.depth_cm} onChange={set} placeholder="e.g. 30" />
              </FormField>

              <FormField label="Colour">
                <Input name="colour" value={form.colour} onChange={set} placeholder="e.g. Black" />
              </FormField>
            </div>
          </div>

          <PhotoUploadField
            itemId={initial?.id}
            existingUrl={initial?.image_url}
            onPendingFile={(file) => { pendingPhotoRef.current = file; }}
          />
        </div>

        <div className="flex gap-3 justify-end pt-3 mt-1 border-t border-gray-100 flex-shrink-0">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Items page ────────────────────────────────────────────────────────────────
export default function ItemsPage() {
  const { items, categories, loading, error, addItem, editItem, removeItem, adjustQuantity, uploadPhoto } = useItems();
  const { canManageInventory } = useAuth();

  const [search, setSearch]         = useState("");
  const [filterCat, setFilterCat]   = useState("");
  const [filterCond, setFilterCond] = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [popupImage, setPopupImage] = useState(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState(null);

  async function handleQuickUpload(item, file) {
    if (!file) return;
    setUploadingPhotoId(item.id);
    try {
      const compressed = await compressImage(file);
      await uploadPhoto(item.id, compressed);
    } catch (err) {
      console.error("Photo upload failed:", err.message);
    } finally {
      setUploadingPhotoId(null);
    }
  }

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !filterCat  || String(item.category_id) === filterCat;
    const matchCond   = !filterCond || item.condition === filterCond;
    return matchSearch && matchCat && matchCond;
  });

  const columns = [
    {
      key: "photo",
      label: "",
      render: (r) => {
        if (r.image_url) {
          return (
            <div
              className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-zoom-in"
              onClick={(e) => { e.stopPropagation(); setPopupImage({ url: r.image_url, name: r.name }); }}
            >
              <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          );
        }
        if (canManageInventory) {
          return (
            <label onClick={(e) => e.stopPropagation()} className="cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhotoId === r.id}
                onChange={(e) => handleQuickUpload(r, e.target.files[0])}
              />
              <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-300 transition-colors">
                {uploadingPhotoId === r.id ? (
                  <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                ) : (
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            </label>
          );
        }
        return (
          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      },
    },
    { key: "name", label: "Name" },
    { key: "category", label: "Category", render: (r) => r.category?.name ?? "—" },
    { key: "location", label: "Location", render: (r) => r.location?.name ?? "—" },
    {
      key: "available_quantity",
      label: "Available / Total",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); adjustQuantity(r.id, -1); }}
            disabled={r.available_quantity <= 0}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold leading-none"
          >−</button>
          <span className={r.available_quantity <= r.reorder_threshold && r.reorder_threshold > 0 ? "text-amber-600 font-semibold" : ""}>
            {r.available_quantity} / {r.total_quantity} {r.unit ?? ""}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); adjustQuantity(r.id, +1); }}
            disabled={r.available_quantity >= r.total_quantity}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold leading-none"
          >+</button>
        </div>
      ),
    },
    { key: "condition", label: "Condition", render: (r) => <Badge label={r.condition} /> },
    {
      key: "in_use",
      label: "In Use",
      render: (r) => (
        <span className={`text-xs font-medium ${r.in_use ? "text-green-600" : "text-gray-400"}`}>
          {r.in_use ? "Yes" : "No"}
        </span>
      ),
    },
    canManageInventory && {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" className="text-xs py-1 px-2" onClick={() => setEditing(r)}>Edit</Button>
          <Button variant="ghost" className="text-xs py-1 px-2 hover:text-red-600" onClick={() => removeItem(r.id)}>Delete</Button>
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} items total</p>
        </div>
        {canManageInventory && (
          <Button onClick={() => setShowModal(true)}>+ Add Item</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input className="w-56" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="w-44" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </Select>
        <Select className="w-36" value={filterCond} onChange={(e) => setFilterCond(e.target.value)}>
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <Alert type="error" message={error} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <Table columns={columns} data={filtered} emptyMessage="No items match your filters." />
      )}

      <ItemFormModal open={showModal} onClose={() => setShowModal(false)} onSave={addItem} />

      {editing && (
        <ItemFormModal
          open={!!editing}
          onClose={() => setEditing(null)}
          initial={editing}
          onSave={(data) => editItem(editing.id, data)}
        />
      )}

      <ImagePopup
        url={popupImage?.url}
        name={popupImage?.name}
        onClose={() => setPopupImage(null)}
      />
    </div>
  );
}
