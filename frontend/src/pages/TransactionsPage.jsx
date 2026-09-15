import { useEffect, useState } from "react";
import request from "../services/api.js";
import { Alert, Badge, Button, Input, Select, StatCard, Table } from "../components/ui/index.jsx";

const ACTION_STYLES = {
  checkout: {
    label: "Checked out",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    sign: "-",
  },
  return: {
    label: "Returned",
    badge: "bg-green-100 text-green-800 border-green-200",
    sign: "+",
  },
  restock: {
    label: "Restocked",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    sign: "+",
  },
  damage: {
    label: "Damaged",
    badge: "bg-red-100 text-red-800 border-red-200",
    sign: "-",
  },
};

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function formatAction(action) {
  const key = normalize(action);
  return ACTION_STYLES[key]?.label ?? String(action ?? "Unknown");
}

function fetchTransactions() {
  return request("/transactions?limit=200");
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const loadTransactions = () => {
    setLoading(true);
    setError("");

    fetchTransactions()
      .then(setTransactions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;

    fetchTransactions()
      .then((data) => {
        if (!ignore) {
          setTransactions(data);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e.message);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const actionOptions = Array.from(
    new Set(transactions.map((t) => t.action).filter(Boolean))
  );

  const filtered = transactions.filter((t) => {
    const q = normalize(search);
    const searchable = [
      t.id,
      t.item_id,
      t.user_id,
      t.item?.name,
      t.user?.name,
      t.user?.email,
      t.action,
      formatAction(t.action),
      t.quantity,
      t.notes,
      t.timestamp ? new Date(t.timestamp).toLocaleString() : "",
    ].map(normalize).join(" ");

    return (!actionFilter || t.action === actionFilter) && searchable.includes(q);
  });

  const totalMoved = filtered.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
  const returnedCount = filtered.filter((t) => normalize(t.action) === "return").length;
  const checkoutCount = filtered.filter((t) => normalize(t.action) === "checkout").length;

  const renderAction = (action) => {
    const key = normalize(action);
    const style = ACTION_STYLES[key];
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style?.badge ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
        {formatAction(action)}
      </span>
    );
  };

  const columns = [
    {
      key: "timestamp",
      label: "Time",
      render: (r) =>
        r.timestamp
          ? new Date(r.timestamp).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
          : "—",
    },
    {
      key: "item",
      label: "Item",
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.item?.name ?? `Item #${r.item_id}`}</p>
          <p className="text-xs text-gray-400">ID {r.item_id}</p>
        </div>
      ),
    },
    { key: "action", label: "Action", render: (r) => renderAction(r.action) },
    {
      key: "quantity",
      label: "Qty",
      render: (r) => {
        const style = ACTION_STYLES[normalize(r.action)];
        return (
          <span className="font-mono text-sm font-semibold text-gray-900">
            {style?.sign ?? ""}{r.quantity}
          </span>
        );
      },
    },
    {
      key: "user",
      label: "Changed By",
      render: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.user?.name ?? `User #${r.user_id}`}</p>
          {r.user?.email && <p className="text-xs text-gray-400">{r.user.email}</p>}
        </div>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      render: (r) => (
        <span className={r.notes ? "text-gray-600" : "text-gray-400 italic"}>
          {r.notes ?? "No notes"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} of {transactions.length} audit records shown
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="w-full sm:w-72"
            placeholder="Search item, user, notes, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            className="w-full sm:w-44"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{formatAction(action)}</option>
            ))}
          </Select>
        </div>
      </div>

      <Alert type="error" message={error} />
      {error && (
        <div className="flex justify-center">
          <Button onClick={loadTransactions}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Records" value={filtered.length} color="indigo" icon={<span className="text-lg">#</span>} />
            <StatCard label="Units Moved" value={totalMoved} color="amber" icon={<span className="text-lg">+/-</span>} />
            <StatCard label="Returns / Checkouts" value={`${returnedCount} / ${checkoutCount}`} color="green" icon={<span className="text-lg">in</span>} />
          </div>

          <div className="flex flex-wrap gap-2">
            {actionOptions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setActionFilter((current) => current === action ? "" : action)}
                className={`transition-opacity ${actionFilter && actionFilter !== action ? "opacity-40" : "opacity-100"}`}
              >
                {renderAction(action)}
              </button>
            ))}
            {search && <Badge label={`Search: ${search}`} />}
          </div>

          <Table columns={columns} data={filtered} emptyMessage="No transactions match your filters." />
        </>
      )}
    </div>
  );
}
