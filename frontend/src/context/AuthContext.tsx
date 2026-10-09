"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { User, authAPI, AuthResponse, permisosAPI, RolPermisoDTO } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  permissions: Record<string, { puedeVer: boolean; puedeEditar: boolean }>;
  canViewModule: (modulo: string) => boolean;
  canEditModule: (modulo: string) => boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  setAuthSession: (token: string, user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  permissions: {},
  canViewModule: () => true,
  canEditModule: () => false,
  login: async () => {
    throw new Error("AuthProvider not initialized");
  },
  setAuthSession: () => {},
  logout: () => {},
  refreshProfile: async () => {},
  refreshPermissions: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<
    Record<string, { puedeVer: boolean; puedeEditar: boolean }>
  >({});
  const sessionVersionRef = useRef(0);

  const loadPermissionsForRole = async (rol: string) => {
    try {
      const perms = await permisosAPI.getPorRol(rol);
      const permMap: Record<string, { puedeVer: boolean; puedeEditar: boolean }> = {};
      perms.forEach((p) => {
        permMap[p.modulo] = { puedeVer: p.puedeVer, puedeEditar: p.puedeEditar };
      });
      setPermissions(permMap);
    } catch (err) {
      console.error("Error al cargar permisos:", err);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("auth_user");
    const sessionVersion = sessionVersionRef.current;

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        const parsedUser: User = JSON.parse(savedUser);

        // Si localmente ya figuraba como suspendido, expulsar de inmediato
        if (parsedUser.estado === "SUSPENDIDO") {
          logout();
          setLoading(false);
          window.location.href = "/login?error=suspended";
          return;
        }

        setUser(parsedUser);
        loadPermissionsForRole(parsedUser.rol);

        // Refrescar en background contra el backend (F5 / Carga de página)
        authAPI
          .getProfile()
          .then((freshUser) => {
            if (sessionVersionRef.current !== sessionVersion || localStorage.getItem("auth_token") !== savedToken) return;
            if (!freshUser || freshUser.estado === "SUSPENDIDO") {
              logout();
              window.location.href = "/login?error=suspended";
              return;
            }
            setUser(freshUser);
            localStorage.setItem("auth_user", JSON.stringify(freshUser));
            loadPermissionsForRole(freshUser.rol);
          })
          .catch(() => {
            if (sessionVersionRef.current !== sessionVersion || localStorage.getItem("auth_token") !== savedToken) return;
            logout();
            window.location.href = "/login?error=suspended";
          })
          .finally(() => {
            setLoading(false);
          });
        return;
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  // Heartbeat reactivo cada 4 segundos: detecta baneos y cambios de rol en vivo sin esperar F5 ni cierre de sesión
  useEffect(() => {
    if (!token || !user) return;
    const sessionVersion = sessionVersionRef.current;
    const activeToken = token;

    const interval = setInterval(() => {
      authAPI
        .getProfile()
        .then((freshUser) => {
          if (sessionVersionRef.current !== sessionVersion || localStorage.getItem("auth_token") !== activeToken) return;
          if (!freshUser || freshUser.estado === "SUSPENDIDO") {
            logout();
            window.location.href = "/login?error=suspended";
            return;
          }
          if (freshUser.rol !== user.rol || freshUser.estado !== user.estado) {
            setUser(freshUser);
            localStorage.setItem("auth_user", JSON.stringify(freshUser));
            loadPermissionsForRole(freshUser.rol);
          }
        })
        .catch(() => {
          if (sessionVersionRef.current !== sessionVersion || localStorage.getItem("auth_token") !== activeToken) return;
          logout();
          window.location.href = "/login?error=suspended";
        });
    }, 4000);

    return () => clearInterval(interval);
  }, [token, user?.rol, user?.estado]);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await authAPI.login(email, password);
    sessionVersionRef.current += 1;
    const u: User = {
      id: res.id,
      nombre: res.nombre,
      apellido: res.apellido,
      email: res.email,
      rol: res.rol,
      estado: res.estado,
      fotoPerfil: res.fotoPerfil,
      descripcion: res.descripcion,
      ocultarCursos: res.ocultarCursos,
    };
    setToken(res.token);
    setUser(u);
    localStorage.setItem("auth_token", res.token);
    localStorage.setItem("auth_user", JSON.stringify(u));

    await loadPermissionsForRole(u.rol);
    return res;
  };

  const setAuthSession = (newToken: string, newUser: User) => {
    sessionVersionRef.current += 1;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    loadPermissionsForRole(newUser.rol);
  };

  const logout = useCallback(() => {
    sessionVersionRef.current += 1;
    setToken(null);
    setUser(null);
    setPermissions({});
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("token");
  }, []);

  const refreshProfile = async () => {
    try {
      const freshUser = await authAPI.getProfile();
      setUser(freshUser);
      localStorage.setItem("auth_user", JSON.stringify(freshUser));
      await loadPermissionsForRole(freshUser.rol);
    } catch {
      logout();
    }
  };

  const refreshPermissions = async () => {
    if (user) {
      await loadPermissionsForRole(user.rol);
    }
  };

  const canViewModule = (modulo: string): boolean => {
    if (!user) return false;
    if (user.rol === "ADMIN") return true;
    return permissions[modulo]?.puedeVer ?? false;
  };

  const canEditModule = (modulo: string): boolean => {
    if (!user) return false;
    if (user.rol === "ADMIN") return true;
    return permissions[modulo]?.puedeEditar ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        permissions,
        canViewModule,
        canEditModule,
        login,
        setAuthSession,
        logout,
        refreshProfile,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
