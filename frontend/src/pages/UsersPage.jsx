import { useEffect, useState } from "react";
import { getUsers, updateUserRole, deleteUser } from "../services/usersService.js";
import { Table, Badge, Button, Select, Alert } from "../components/ui/index.jsx";

const ROLES = ["Admin", "InventoryManager", "SetBuilder", "SetDesigner", "Crew"];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRoleChange = async (id, role) => {
    try {
      await updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const columns = [
    { key: "id",    label: "#" },
    { key: "name",  label: "Name" },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (row) => (
        <Select
          className="w-44 py-1"
          value={row.role}
          onChange={(e) => handleRoleChange(row.id, e.target.value)}
        >
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      render: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : "—",
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button variant="ghost" className="text-xs py-1 px-2 hover:text-red-600" onClick={() => handleDelete(row.id)}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Users</h2>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} accounts registered</p>
      </div>

      <Alert type="error" message={error} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <Table columns={columns} data={users} emptyMessage="No users found." />
      )}
    </div>
  );
}
