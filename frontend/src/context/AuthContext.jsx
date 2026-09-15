import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe } from "../services/usersService.js";
import { login as apiLogin, register as apiRegister } from "../services/authService.js";
import { removeToken, getToken } from "../services/api.js";

const AuthContext = createContext(null);

// Role hierarchy helpers
export const ROLES = {
  ADMIN: "Admin",
  INVENTORY_MANAGER: "InventoryManager",
  SET_BUILDER: "SetBuilder",
  SET_DESIGNER: "SetDesigner",
  CREW: "Crew",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // full user object from /users/me
  const [loading, setLoading] = useState(true); // true while we check the stored token
  const [error, setError] = useState(null);     // authentication errors
  const [loginLoading, setLoginLoading] = useState(false); // loading state for login
  const [registerLoading, setRegisterLoading] = useState(false); // loading state for register

  // On mount: if a token exists try to load the current user
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    setLoginLoading(true);
    setError(null);
    try {
      await apiLogin({ email, password });
      const me = await getMe();
      setUser(me);
      return me;
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    setRegisterLoading(true);
    setError(null);
    try {
      const newUser = await apiRegister(data);
      return newUser;
    } catch (err) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setRegisterLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /** Returns true if the current user has one of the given roles */
  const hasRole = useCallback(
    (...roles) => !!user && roles.includes(user.role),
    [user]
  );

  const isAdmin = hasRole(ROLES.ADMIN);
  const canManageInventory = hasRole(ROLES.ADMIN, ROLES.INVENTORY_MANAGER);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        error,
        loginLoading,
        registerLoading,
        login, 
        register, 
        logout, 
        clearError,
        hasRole, 
        isAdmin, 
        canManageInventory 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
