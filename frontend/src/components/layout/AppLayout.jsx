import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import fmLogo from "../../assets/fm-logo.png";

const NAV_ITEMS = [
  { to: "/dashboard",    label: "Dashboard",    icon: "🗂️"  },
  { to: "/items",        label: "Inventory",    icon: "📦"  },
  { to: "/productions",  label: "Productions",  icon: "🎭"  },
  { to: "/tutorials",    label: "Tutorials",    icon: "📖"  },
  { to: "/transactions", label: "Transactions", icon: "📋"  },
  { to: "/users",        label: "Users",        icon: "👥", adminOnly: true },
];

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-screen bg-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[#1a1a1a] flex flex-col">
        {/* Logo */}
        <NavLink to="/dashboard" className="px-6 py-5 border-b border-[#333] flex items-center gap-3">
          <img src={fmLogo} alt="FM Theatre" className="h-12 object-contain" />
        </NavLink>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors uppercase tracking-wide ${
                  isActive
                    ? "bg-[#E8574A] text-white"
                    : "text-gray-400 hover:bg-[#2a2a2a] hover:text-white"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User panel */}
        <div className="p-4 border-t border-[#333]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E8574A] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-[#E8574A] text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 000-2H4V5h6a1 1 0 000-2H3zm11.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 11H9a1 1 0 010-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-100">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
