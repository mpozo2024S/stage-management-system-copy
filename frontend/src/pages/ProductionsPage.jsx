import { useEffect, useMemo, useState } from "react";
import { useItems } from "../context/ItemsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Alert,
  Badge,
  Button,
  FormField,
  Input,
  Modal,
  Select,
  StatCard,
  Table,
} from "../components/ui/index.jsx";
import {
  assignProductionItems,
  closeProduction,
  createProduction,
  getProductions,
  returnProductionItems,
  updateProduction,
} from "../services/productionsService.js";

function ProductionFormModal({ open, onClose, initial, onSave }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (e) => setForm((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Production" : "Add Production"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert type="error" message={error} />
        <FormField label="Production name">
          <Input name="name" value={form.name} onChange={set} required />
        </FormField>
        <FormField label="Description">
          <textarea
            name="description"
            rows={3}
            value={form.description}
            onChange={set}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </FormField>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function statusBadge(status) {
  return status === "Ended"
    ? <Badge label="Ended" className="bg-gray-100 text-gray-600 border-gray-200" />
    : <Badge label="Active" className="bg-green-100 text-green-800 border-green-200" />;
}

function activeAssignmentQuantity(assignment) {
  if (assignment.returned) return 0;
  return Math.max(0, Number(assignment.quantity_assigned || 0));
}

export default function ProductionsPage() {
  const { items, categories, locations, refresh: refreshItems } = useItems();
  const { canManageInventory } = useAuth();
  const [productions, setProductions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [productionSearch, setProductionSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [selectedReturns, setSelectedReturns] = useState({});

  const loadProductions = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const data = await getProductions();
      setProductions(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    getProductions()
      .then((data) => {
        setProductions(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedProduction = productions.find((production) => production.id === selectedId);

  const activeProductions = productions.filter((production) => production.status === "Active");
  const selectedAssignments = selectedProduction?.production_items ?? [];
  const checkedOutAssignments = selectedAssignments.filter((assignment) => activeAssignmentQuantity(assignment) > 0);
  const checkedOutUnits = checkedOutAssignments.reduce(
    (sum, assignment) => sum + activeAssignmentQuantity(assignment),
    0
  );

  const visibleProductions = productions.filter((production) => {
    const text = `${production.name} ${production.description ?? ""}`.toLowerCase();
    return text.includes(productionSearch.toLowerCase());
  });

  const selectedCheckoutItems = Object.entries(selectedQuantities)
    .map(([itemId, quantity]) => ({
      item_id: Number(itemId),
      quantity_assigned: Number(quantity),
    }))
    .filter((assignment) => assignment.quantity_assigned > 0);

  const selectedReturnIds = Object.entries(selectedReturns)
    .filter(([, selected]) => selected)
    .map(([id]) => Number(id))
    .filter((id) => checkedOutAssignments.some((assignment) => assignment.id === id));

  const inventoryRows = useMemo(() => {
    return items.filter((item) => {
      const text = [
        item.name,
        item.description,
        item.category?.name,
        item.location?.name,
        item.condition,
        item.colour,
      ].join(" ").toLowerCase();
      const matchesSearch = text.includes(itemSearch.toLowerCase());
      const matchesCategory = !categoryFilter || String(item.category_id) === categoryFilter;
      const matchesLocation = !locationFilter || String(item.location_id) === locationFilter;
      return matchesSearch && matchesCategory && matchesLocation && item.available_quantity > 0;
    });
  }, [categoryFilter, itemSearch, items, locationFilter]);

  const handleSaveProduction = async (data) => {
    if (editing) {
      await updateProduction(editing.id, data);
    } else {
      await createProduction(data);
    }
    await loadProductions({ quiet: true });
  };

  const handleAssignBatch = async () => {
    if (!selectedProduction || selectedCheckoutItems.length === 0) return;
    setActionLoading(true);
    setError("");
    try {
      await assignProductionItems(selectedProduction.id, selectedCheckoutItems);
      setSelectedQuantities({});
      await Promise.all([loadProductions({ quiet: true }), refreshItems()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSelected = async () => {
    if (!selectedProduction || selectedReturnIds.length === 0) return;
    setActionLoading(true);
    setError("");
    try {
      await returnProductionItems(selectedProduction.id, selectedReturnIds);
      setSelectedReturns({});
      await Promise.all([loadProductions({ quiet: true }), refreshItems()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseProduction = async () => {
    if (!selectedProduction) return;
    setActionLoading(true);
    setError("");
    try {
      await closeProduction(selectedProduction.id);
      setSelectedReturns({});
      await Promise.all([loadProductions({ quiet: true }), refreshItems()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const assignmentColumns = [
    canManageInventory && selectedProduction?.status === "Active" && {
      key: "select",
      label: "",
      render: (assignment) => (
        <input
          type="checkbox"
          checked={!!selectedReturns[assignment.id]}
          disabled={activeAssignmentQuantity(assignment) === 0}
          onChange={(e) => setSelectedReturns((current) => ({
            ...current,
            [assignment.id]: e.target.checked,
          }))}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 disabled:opacity-40"
        />
      ),
    },
    { key: "item", label: "Item", render: (assignment) => assignment.item_name ?? `Item #${assignment.item_id}` },
    { key: "quantity_assigned", label: "Checked Out", render: activeAssignmentQuantity },
    { key: "status", label: "Status", render: (assignment) => assignment.returned ? statusBadge("Ended") : statusBadge("Active") },
    {
      key: "returned_at",
      label: "Returned",
      render: (assignment) => assignment.returned_at
        ? new Date(assignment.returned_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
        : "Still out",
    },
  ].filter(Boolean);

  const inventoryColumns = [
    {
      key: "select",
      label: "",
      render: (item) => (
        <input
          type="checkbox"
          checked={Number(selectedQuantities[item.id] || 0) > 0}
          onChange={(e) => setSelectedQuantities((current) => {
            const next = { ...current };
            if (e.target.checked) next[item.id] = Math.min(1, item.available_quantity);
            else delete next[item.id];
            return next;
          })}
          disabled={!canManageInventory || selectedProduction?.status !== "Active"}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 disabled:opacity-40"
        />
      ),
    },
    {
      key: "name",
      label: "Inventory Item",
      render: (item) => (
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-400">{item.location?.name ?? "No location"}</p>
        </div>
      ),
    },
    { key: "category", label: "Category", render: (item) => item.category?.name ?? "-" },
    { key: "available_quantity", label: "Available", render: (item) => `${item.available_quantity} / ${item.total_quantity}` },
    {
      key: "quantity",
      label: "Qty to Check Out",
      render: (item) => (
        <Input
          type="number"
          min={0}
          max={item.available_quantity}
          value={selectedQuantities[item.id] ?? ""}
          onChange={(e) => setSelectedQuantities((current) => {
            const value = Number(e.target.value);
            const next = { ...current };
            if (!value || value <= 0) delete next[item.id];
            else next[item.id] = Math.min(value, item.available_quantity);
            return next;
          })}
          disabled={!canManageInventory || selectedProduction?.status !== "Active"}
          className="w-24"
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Productions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create shows, check out assets, and return them in batches.</p>
        </div>
        {canManageInventory && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Production</Button>
        )}
      </div>

      <Alert type="error" message={error} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Productions" value={productions.length} color="indigo" icon={<span className="text-lg">#</span>} />
        <StatCard label="Active" value={activeProductions.length} color="green" icon={<span className="text-lg">on</span>} />
        <StatCard label="Selected Out" value={checkedOutUnits} color="amber" icon={<span className="text-lg">out</span>} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="space-y-3">
          <Input
            placeholder="Search productions..."
            value={productionSearch}
            onChange={(e) => setProductionSearch(e.target.value)}
          />
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {visibleProductions.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">No productions found.</div>
            ) : (
              visibleProductions.map((production) => (
                <button
                  key={production.id}
                  type="button"
                  onClick={() => { setSelectedId(production.id); setSelectedReturns({}); }}
                  className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                    selectedId === production.id ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900 truncate">{production.name}</p>
                    {statusBadge(production.status)}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {(production.production_items ?? []).filter((assignment) => activeAssignmentQuantity(assignment) > 0).length} item groups out
                  </p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          {selectedProduction ? (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{selectedProduction.name}</h3>
                      {statusBadge(selectedProduction.status)}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{selectedProduction.description || "No description added."}</p>
                  </div>
                  {canManageInventory && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => { setEditing(selectedProduction); setShowForm(true); }}>
                        Edit
                      </Button>
                      {selectedProduction.status === "Active" && (
                        <Button
                          variant="danger"
                          onClick={handleCloseProduction}
                          loading={actionLoading}
                          disabled={checkedOutAssignments.length === 0}
                        >
                          Close and Return All
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Checked Out Items</h3>
                    <p className="text-sm text-gray-500">{checkedOutAssignments.length} active item groups</p>
                  </div>
                  {canManageInventory && selectedProduction.status === "Active" && (
                    <Button
                      variant="secondary"
                      onClick={handleReturnSelected}
                      loading={actionLoading}
                      disabled={selectedReturnIds.length === 0}
                    >
                      Return Selected
                    </Button>
                  )}
                </div>
                <Table columns={assignmentColumns} data={selectedAssignments} emptyMessage="No items have been assigned to this production." />
              </div>

              {selectedProduction.status === "Active" && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Batch Check Out From Inventory</h3>
                      <p className="text-sm text-gray-500">{selectedCheckoutItems.length} item groups selected</p>
                    </div>
                    {canManageInventory && (
                      <Button onClick={handleAssignBatch} loading={actionLoading} disabled={selectedCheckoutItems.length === 0}>
                        Check Out Selected
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Input className="w-full sm:w-64" placeholder="Filter inventory..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                    <Select className="w-full sm:w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                      <option value="">All categories</option>
                      {categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
                    </Select>
                    <Select className="w-full sm:w-44" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                      <option value="">All locations</option>
                      {locations.map((location) => <option key={location.id} value={String(location.id)}>{location.name}</option>)}
                    </Select>
                  </div>

                  <Table columns={inventoryColumns} data={inventoryRows} emptyMessage="No available inventory matches your filters." />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-16 text-center text-gray-400">
              Add a production to begin assigning inventory.
            </div>
          )}
        </section>
      </div>

      <ProductionFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        initial={editing}
        onSave={handleSaveProduction}
      />
    </div>
  );
}
