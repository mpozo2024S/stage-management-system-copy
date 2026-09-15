import { useAuth } from "../context/AuthContext.jsx";
import { useItems } from "../context/ItemsContext.jsx";
import { StatCard, Alert, Button } from "../components/ui/index.jsx";
import { Link } from "react-router-dom";

function PackageIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V11" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}
function InUseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function CategoryIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { items, categories, loading, error, refresh } = useItems();

  const lowStockItems = items.filter(
    (i) => i.available_quantity <= i.reorder_threshold && i.reorder_threshold > 0
  );
  const inUseItems = items.filter((i) => i.in_use);

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0]} 
        </h2>
        <p className="text-gray-500 mt-1">Here's what's happening in the warehouse.</p>
      </div>

      <Alert type="error" message={error} />
      {error && (
  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
    <h3 className="text-lg font-semibold text-red-700">
      Failed to load dashboard data
    </h3>

    <p className="text-sm text-red-600 mt-1">
      Please try refreshing the page or retrying.
    </p>

    <Button
      className="mt-4"
      onClick={refresh}
    >
      Retry
    </Button>
  </div>
)}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Items"
          value={loading ? "—" : items.length}
          icon={<PackageIcon />}
          color="indigo"
        />
        <StatCard
          label="Low Stock"
          value={loading ? "—" : lowStockItems.length}
          icon={<AlertIcon />}
          color="amber"
        />
        <StatCard
          label="Currently In Use"
          value={loading ? "—" : inUseItems.length}
          icon={<InUseIcon />}
          color="green"
        />
        <StatCard
          label="Categories"
          value={loading ? "—" : categories.length}
          icon={<CategoryIcon />}
          color="red"
        />
      </div>

      {/* Low stock alert table */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertIcon /> Low Stock Alerts
          </h3>
          <div className="space-y-2">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                <span className="text-sm font-medium text-gray-800">{item.name}</span>
                <span className="text-sm text-amber-700 font-mono">
                  {item.available_quantity} / {item.reorder_threshold} threshold
                </span>
              </div>
            ))}
            {lowStockItems.length > 5 && (
              <Link to="/items" className="block text-center text-sm text-amber-700 font-medium hover:underline pt-1">
                View all {lowStockItems.length} low-stock items →
              </Link>
            )}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
  <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
    <div className="text-5xl mb-4">📦</div>

    <h3 className="text-xl font-semibold text-gray-900">
      No inventory items yet
    </h3>

    <p className="text-sm text-gray-500 mt-2">
      Add your first inventory item to start tracking warehouse stock.
    </p>

    <Link
      to="/items"
      className="inline-block mt-5 text-indigo-600 font-medium hover:underline"
    >
      Go to Inventory →
    </Link>
  </div>
)}

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { to: "/items", label: "View Inventory", desc: "Browse all items", emoji: "📦" },
          { to: "/productions", label: "Productions", desc: "Assign and return assets", emoji: "🎭" },
          { to: "/tutorials", label: "Tutorials", desc: "Construction guides", emoji: "📖" },
          { to: "/transactions", label: "Transactions", desc: "Audit log", emoji: "📋" },
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className="text-3xl mb-3">{card.emoji}</div>
            <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{card.label}</p>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
