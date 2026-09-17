"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { api, UserDTO, RolPermisoDTO } from "@/lib/api";
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Lock,
  Eye,
  Edit3,
} from "lucide-react";

export default function UsuariosAdminPage() {
  const { user: currentUser, refreshPermissions } = useAuth();
  const [activeTab, setActiveTab] = useState<"USUARIOS" | "PERMISOS">("USUARIOS");

  // State Usuarios
  const [usuarios, setUsuarios] = useState<UserDTO[]>([]);
  const [filtered, setFiltered] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("TODOS");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // State Permisos
  const [permisos, setPermisos] = useState<RolPermisoDTO[]>([]);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [savingPermiso, setSavingPermiso] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsuarios(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar la lista de usuarios.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPermisos = async () => {
    try {
      setLoadingPermisos(true);
      const data = await api.getPermisos();
      setPermisos(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar la matriz de permisos.");
    } finally {
      setLoadingPermisos(false);
    }
  };

  useEffect(() => {
    if (currentUser?.rol === "ADMIN") {
      fetchUsers();
      fetchPermisos();
    }
  }, [currentUser]);

  // Filter effect usuarios
  useEffect(() => {
    let list = [...usuarios];

    if (roleFilter !== "TODOS") {
      list = list.filter((u) => u.rol === roleFilter);
    }

    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          u.nombre.toLowerCase().includes(q) ||
          u.apellido.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    setFiltered(list);
  }, [searchTerm, roleFilter, usuarios]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      setProcessingId(userId);
      await api.updateUserRole(userId, newRole);
      setNotification(`Rol de usuario actualizado a ${newRole} correctamente.`);
      await fetchUsers();
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el rol.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusToggle = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO";
    try {
      setProcessingId(userId);
      await api.updateUserStatus(userId, newStatus);
      setNotification(`Estado de usuario cambiado a ${newStatus}.`);
      await fetchUsers();
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setError(err.message || "Error al cambiar el estado del usuario.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleTogglePermiso = async (
    rol: "ADMIN" | "DOCENTE" | "JURADO" | "ESTUDIANTE",
    modulo: string,
    field: "puedeVer" | "puedeEditar",
    currentVal: boolean
  ) => {
    if (rol === "ADMIN") return; // Admin siempre tiene acceso total
    const key = `${rol}_${modulo}_${field}`;
    setSavingPermiso(key);

    const existing = permisos.find((p) => p.rol === rol && p.modulo === modulo);
    const newPuedeVer = field === "puedeVer" ? !currentVal : existing?.puedeVer ?? false;
    const newPuedeEditar = field === "puedeEditar" ? !currentVal : existing?.puedeEditar ?? false;

    // Si desmarca VER, automáticamente también desmarca EDITAR
    const finalPuedeEditar = !newPuedeVer ? false : newPuedeEditar;

    try {
      await api.updatePermiso({
        rol,
        modulo,
        puedeVer: newPuedeVer,
        puedeEditar: finalPuedeEditar,
      });

      setNotification(`Permiso actualizado: ${rol} en módulo ${modulo}`);
      await fetchPermisos();
      await refreshPermissions();
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el permiso.");
    } finally {
      setSavingPermiso(null);
    }
  };

  const modulosList = [
    { id: "CONVOCATORIAS", label: "Convocatorias y Ferias", desc: "Gestión, creación y publicación de actividades y ferias" },
    { id: "DOCUMENTOS", label: "Documentos de Investigación", desc: "Creación y seguimiento de perfiles de proyectos y documentos" },
    { id: "CERTIFICADOS", label: "Certificación y Trazabilidad", desc: "Emisión y verificación de certificados digitales" },
    { id: "USUARIOS", label: "Gestión de Usuarios y Roles", desc: "Administración central de cuentas y permisos del sistema" },
  ];

  const rolesPermisos: ("DOCENTE" | "JURADO" | "ESTUDIANTE")[] = ["DOCENTE", "JURADO", "ESTUDIANTE"];

  if (currentUser?.rol !== "ADMIN") {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-12 bg-paper-raised border border-line rounded-xl text-center">
          <Shield className="w-12 h-12 text-ink-faint mx-auto mb-3" />
          <h2 className="font-serif text-xl text-ink font-semibold">Acceso Restringido</h2>
          <p className="text-xs text-ink-soft mt-1">
            Solo administradores de la Unidad de Investigación FICCT pueden gestionar usuarios y permisos.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-accent tracking-wider uppercase">
              Administración Central
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-normal text-ink mt-0.5">
              Gestión de Usuarios y Permisos
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Control de cuentas, asignación de roles y configuración granular de permisos por módulo.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === "USUARIOS") fetchUsers();
                else fetchPermisos();
              }}
              disabled={loading || loadingPermisos}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line bg-paper-raised text-ink-soft text-xs font-medium hover:bg-paper transition-all flex-shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingPermisos ? "animate-spin" : ""}`} />
              Actualizar datos
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-line gap-4">
          <button
            onClick={() => setActiveTab("USUARIOS")}
            className={`pb-3 px-2 text-sm font-medium transition-all relative ${
              activeTab === "USUARIOS"
                ? "text-ink font-semibold border-b-2 border-accent"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Usuarios y Roles ({usuarios.length})
          </button>
          <button
            onClick={() => setActiveTab("PERMISOS")}
            className={`pb-3 px-2 text-sm font-medium transition-all relative ${
              activeTab === "PERMISOS"
                ? "text-ink font-semibold border-b-2 border-accent"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Matriz de Permisos por Módulo y Rol
          </button>
        </div>

        {/* CONTENIDO TAB 1: USUARIOS */}
        {activeTab === "USUARIOS" && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="bg-paper-raised border border-line rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo institucional..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-line bg-paper text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-ink-faint">Filtrar por rol:</span>
                {["TODOS", "ADMIN", "DOCENTE", "JURADO", "ESTUDIANTE"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      roleFilter === r
                        ? "bg-ink text-paper"
                        : "bg-paper border border-line text-ink-soft hover:border-ink"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de Usuarios */}
            <div className="bg-paper-raised border border-line rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-paper/60 text-ink-faint uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Correo Institucional</th>
                      <th className="py-3 px-4">Rol en el Sistema</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-faint">
                          Cargando lista de usuarios...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ink-faint">
                          No se encontraron usuarios coincidentes.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((u) => (
                        <tr key={u.id} className="hover:bg-paper/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                                {u.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-ink text-sm">
                                  {u.nombre} {u.apellido}
                                </div>
                                <div className="text-[11px] text-ink-faint">ID #{u.id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-ink-soft">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={u.rol}
                              disabled={processingId === u.id || u.id === currentUser.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="px-2.5 py-1.5 rounded-md border border-line bg-paper text-ink font-medium text-xs focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                            >
                              <option value="ESTUDIANTE">ESTUDIANTE</option>
                              <option value="DOCENTE">DOCENTE</option>
                              <option value="JURADO">JURADO</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                u.estado === "ACTIVO"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.estado === "ACTIVO" ? "bg-emerald-600" : "bg-red-600"
                                }`}
                              />
                              {u.estado}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => handleStatusToggle(u.id, u.estado)}
                                disabled={processingId === u.id}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                                  u.estado === "ACTIVO"
                                    ? "border border-red-200 text-red-700 hover:bg-red-50"
                                    : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                              >
                                {u.estado === "ACTIVO" ? "Suspender" : "Activar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO TAB 2: MATRIZ DE PERMISOS */}
        {activeTab === "PERMISOS" && (
          <div className="space-y-6">
            <div className="bg-paper-raised border border-line rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-ink">
                    Configuración Granular de Permisos por Rol
                  </h3>
                  <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                    Define si un rol tiene permisos para <b>VER</b> (consultar y visualizar en su sidebar) y/o <b>EDITAR</b> (crear, modificar o publicar contenido).
                    Por ejemplo, puedes permitir que <b>DOCENTE</b> solo tenga permiso de <b>VER</b> convocatorias, retirándole la capacidad de edición cuando sea necesario.
                  </p>
                </div>
              </div>
            </div>

            {/* Matriz de Permisos */}
            <div className="bg-paper-raised border border-line rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-line bg-paper/60 text-ink-faint uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4 w-1/3">Módulo del Sistema</th>
                      {rolesPermisos.map((rol) => (
                        <th key={rol} className="py-3 px-4 text-center">
                          <span className="font-bold text-ink">{rol}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {modulosList.map((mod) => (
                      <tr key={mod.id} className="hover:bg-paper/30 transition-colors">
                        <td className="py-4 px-4">
                          <b className="block text-ink text-sm font-serif">{mod.label}</b>
                          <span className="text-[11px] text-ink-faint block mt-0.5">
                            {mod.desc}
                          </span>
                        </td>

                        {rolesPermisos.map((rol) => {
                          const perm = permisos.find(
                            (p) => p.rol === rol && p.modulo === mod.id
                          );
                          const puedeVer = perm?.puedeVer ?? false;
                          const puedeEditar = perm?.puedeEditar ?? false;

                          return (
                            <td key={rol} className="py-4 px-4 text-center">
                              <div className="inline-flex flex-col gap-2 p-2 rounded-lg bg-paper border border-line-soft">
                                {/* Switch VER */}
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-ink-soft select-none">
                                  <input
                                    type="checkbox"
                                    checked={puedeVer}
                                    onChange={() =>
                                      handleTogglePermiso(rol, mod.id, "puedeVer", puedeVer)
                                    }
                                    className="rounded border-line text-accent focus:ring-accent cursor-pointer"
                                  />
                                  <Eye className="w-3 h-3 text-ink-faint" />
                                  <span>VER</span>
                                </label>

                                {/* Switch EDITAR */}
                                <label
                                  className={`flex items-center gap-1.5 text-[11px] font-medium select-none ${
                                    puedeVer
                                      ? "cursor-pointer text-ink-soft"
                                      : "opacity-40 cursor-not-allowed text-ink-faint"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!puedeVer}
                                    checked={puedeEditar}
                                    onChange={() =>
                                      handleTogglePermiso(rol, mod.id, "puedeEditar", puedeEditar)
                                    }
                                    className="rounded border-line text-accent focus:ring-accent cursor-pointer"
                                  />
                                  <Edit3 className="w-3 h-3 text-ink-faint" />
                                  <span>EDITAR</span>
                                </label>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-paper border border-line text-[11px] text-ink-soft flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              <span>
                Nota: El rol <b>ADMIN</b> siempre cuenta con acceso absoluto e irrestricto a todos los módulos y funciones del sistema por política de seguridad.
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
