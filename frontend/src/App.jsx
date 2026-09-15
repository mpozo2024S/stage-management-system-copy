import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ItemsProvider } from "./context/ItemsContext.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ItemsPage from "./pages/ItemsPage.jsx";
import ProductionsPage from "./pages/ProductionsPage.jsx";
import TutorialsPage from "./pages/TutorialsPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected — wrap ItemsProvider only here */}
          <Route element={<ProtectedRoute />}>
            <Route element={
              <ItemsProvider>
                <AppLayout />
              </ItemsProvider>
            }>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/items" element={<ItemsPage />} />
              <Route path="/productions" element={<ProductionsPage />} />
              <Route path="/tutorials" element={<TutorialsPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route element={<ProtectedRoute roles={["Admin"]} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
