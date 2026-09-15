// ─────────────────────────────────────────────
//  Shared primitive UI components
// ─────────────────────────────────────────────

// ── Badge ─────────────────────────────────────
const BADGE_COLORS = {
  Admin:            "bg-violet-100 text-violet-800 border-violet-200",
  InventoryManager: "bg-blue-100   text-blue-800   border-blue-200",
  SetBuilder:       "bg-amber-100  text-amber-800  border-amber-200",
  SetDesigner:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  Crew:             "bg-slate-100  text-slate-700  border-slate-200",
  // Item conditions
  New:     "bg-green-100  text-green-800  border-green-200",
  Good:    "bg-teal-100   text-teal-800   border-teal-200",
  Fair:    "bg-yellow-100 text-yellow-800 border-yellow-200",
  Poor:    "bg-orange-100 text-orange-800 border-orange-200",
  Damaged: "bg-red-100    text-red-800    border-red-200",
};

export function Badge({ label, className = "" }) {
  const colors = BADGE_COLORS[label] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors} ${className}`}
    >
      {label}
    </span>
  );
}

// ── Button ────────────────────────────────────
const BUTTON_VARIANTS = {
  primary:   "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
  secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm",
  danger:    "bg-[#E8574A] hover:bg-[#d94f43] text-white shadow-sm",
  ghost:     "hover:bg-gray-100 text-gray-600",
};

export function Button({ children, variant = "primary", className = "", loading = false, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Modal ─────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────
export function Table({ columns, data, onRowClick, emptyMessage = "No records found." }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer hover:bg-indigo-50 transition-colors" : ""}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Input / Select helpers ────────────────────
export function FormField({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ── Alert ─────────────────────────────────────
export function Alert({ type = "error", message }) {
  if (!message) return null;
  const styles = {
    error:   "bg-red-50   border-red-200   text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info:    "bg-blue-50  border-blue-200  text-blue-700",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {message}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────
export function StatCard({ label, value, icon, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber:  "bg-amber-50  text-amber-600",
    green:  "bg-green-50  text-green-600",
    red:    "bg-red-50    text-red-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ── Export ErrorMessage ───────────────────────
export { default as ErrorMessage } from "./errormessage";
