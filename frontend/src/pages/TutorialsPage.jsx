import { useEffect, useState } from "react";
import {
  getTutorials, createTutorial, deleteTutorial,
} from "../services/tutorialsService.js";
import { useItems } from "../context/ItemsContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Table, Button, Modal, Input, FormField, Alert,
} from "../components/ui/index.jsx";

function TutorialDetailModal({ tutorial, onClose }) {
  if (!tutorial) return null;
  return (
    <Modal open={!!tutorial} onClose={onClose} title={tutorial.title}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {tutorial.description && (
          <p className="text-sm text-gray-600">{tutorial.description}</p>
        )}

        {tutorial.steps?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Steps</h4>
            <ol className="space-y-2">
              {[...tutorial.steps]
                .sort((a, b) => a.step_number - b.step_number)
                .map((step) => (
                  <li key={step.id} className="flex gap-3 text-sm text-gray-700">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {step.step_number}
                    </span>
                    {step.text}
                  </li>
                ))}
            </ol>
          </div>
        )}

        {tutorial.materials?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Materials Required</h4>
            <ul className="space-y-1">
              {tutorial.materials.map((m) => (
                <li key={m.id} className="flex justify-between text-sm text-gray-700 border-b border-gray-100 pb-1">
                  <span>{m.item?.name ?? `Item #${m.item_id}`}</span>
                  <span className="font-mono text-gray-500">{m.quantity_required}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function TutorialsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("Admin", "SetDesigner", "SetBuilder");

  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getTutorials()
      .then(setTutorials)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const t = await createTutorial(form);
      setTutorials((prev) => [t, ...prev]);
      setShowCreate(false);
      setForm({ title: "", description: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this tutorial?")) return;
    try {
      await deleteTutorial(id);
      setTutorials((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const columns = [
    { key: "title", label: "Title" },
    {
      key: "steps",
      label: "Steps",
      render: (r) => r.steps?.length ?? "—",
    },
    {
      key: "materials",
      label: "Materials",
      render: (r) => r.materials?.length ?? "—",
    },
    {
      key: "created_at",
      label: "Created",
      render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—",
    },
    canCreate && {
      key: "actions",
      label: "",
      render: (r) => (
        <Button variant="ghost" className="text-xs py-1 px-2 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>
          Delete
        </Button>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tutorials</h2>
          <p className="text-sm text-gray-500 mt-0.5">Stage construction guides</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>+ New Tutorial</Button>
        )}
      </div>

      <Alert type="error" message={error} />

      {loading ? (
  <div className="flex justify-center py-20">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
  </div>
) : tutorials.length === 0 ? (
  <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
    <div className="text-5xl mb-4">📖</div>

    <h3 className="text-xl font-semibold text-gray-900">
      No tutorials available
    </h3>

    <p className="text-sm text-gray-500 mt-2">
      Create your first tutorial to help guide the team.
    </p>

    {canCreate && (
      <Button className="mt-5" onClick={() => setShowCreate(true)}>
        + Create Tutorial
      </Button>
    )}
  </div>
) : (
  <Table
    columns={columns}
    data={tutorials}
    onRowClick={setSelected}
    emptyMessage="No tutorials yet."
  />
)}

      {/* Detail modal */}
      <TutorialDetailModal tutorial={selected} onClose={() => setSelected(null)} />

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Tutorial">
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField label="Title">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </FormField>
          <FormField label="Description">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </FormField>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
