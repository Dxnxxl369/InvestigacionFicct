const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: "ADMIN" | "DOCENTE" | "JURADO" | "ESTUDIANTE";
  estado: "ACTIVO" | "SUSPENDIDO";
  fotoPerfil?: string;
  descripcion?: string;
  ocultarCursos?: boolean;
  createdAt?: string;
}

export type UserDTO = User;

export interface AuthResponse {
  token: string;
  tokenType: string;
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: "ADMIN" | "DOCENTE" | "JURADO" | "ESTUDIANTE";
  estado: "ACTIVO" | "SUSPENDIDO";
  fotoPerfil?: string;
  descripcion?: string;
  ocultarCursos?: boolean;
}

export interface RequisitoDTO {
  id?: number;
  descripcion: string;
}

export type Requisito = RequisitoDTO;

export type EstadoInscripcion = "PENDIENTE" | "ACEPTADO" | "RECHAZADO" | "CANCELADO";

export interface Convocatoria {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: "FERIA" | "HACKATHON" | "CONCURSO" | "INVESTIGACION";
  estado: "BORRADOR" | "PUBLICADA" | "FINALIZADA";
  fechaCierre?: string;
  tamanoEquipo?: string;
  inscripcionGrupal?: boolean;
  minIntegrantesGrupo?: number;
  maxIntegrantesGrupo?: number;
  imagenPortada?: string;
  creadorId?: number;
  creadorNombre?: string;
  creadorEmail?: string;
  requisitos?: RequisitoDTO[];
  createdAt?: string;
  updatedAt?: string;
  // Métricas y asignaciones
  docenteIds?: number[];
  juradoIds?: number[];
  docentesEncargados?: string[];
  juradosAsignados?: string[];
  totalAdmitidos?: number;
  totalSolicitudesPendientes?: number;
  miEstadoInscripcion?: EstadoInscripcion;
}

export type ConvocatoriaDTO = Convocatoria;

export interface ConvocatoriaRequest {
  titulo: string;
  descripcion: string;
  tipo: "FERIA" | "HACKATHON" | "CONCURSO" | "INVESTIGACION";
  fechaCierre?: string;
  tamanoEquipo?: string;
  inscripcionGrupal?: boolean;
  minIntegrantesGrupo?: number;
  maxIntegrantesGrupo?: number;
  imagenPortada?: string;
  requisitos?: string[];
  docenteIds?: number[];
  juradoIds?: number[];
}

export interface ConvocatoriaParticipanteDTO {
  id: number;
  convocatoriaId: number;
  usuarioId: number;
  nombre: string;
  apellidos: string;
  email: string;
  rol: "ADMIN" | "DOCENTE" | "JURADO" | "ESTUDIANTE";
  estadoInscripcion: EstadoInscripcion;
  nombreEquipo?: string;
  gruposNombres?: string[];
  fechaSolicitud?: string;
  fechaRespuesta?: string;
  fechaAsignacion: string;
  motivoRechazo?: string;
  asignadoPorNombre?: string;
}

export interface ResponderSolicitudRequest {
  accion: "ADMITIR" | "RECHAZAR";
  motivo?: string;
}

export interface DesignarParticipanteRequest {
  usuarioId?: number;
  email?: string;
  rol: "DOCENTE" | "JURADO";
  nombreEquipo?: string;
}

export interface InscribirseAreaRequest {
  nombreEquipo?: string;
  numeroGrupo?: number;
  integrantesEmails?: string[];
}

export interface RolPermisoDTO {
  id?: number;
  rol: "ADMIN" | "DOCENTE" | "JURADO" | "ESTUDIANTE";
  modulo: string;
  puedeVer: boolean;
  puedeEditar: boolean;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Error ${res.status}`;
    try {
      const data = await res.json();
      errorMsg = data.error || data.message || JSON.stringify(data);
    } catch {
      // Ignorar parse error
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

// 1. Auth API
export const authAPI = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  async register(data: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    rol?: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(res);
  },

  async getProfile(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    return handleResponse<User>(res);
  },

  async updateProfile(data: {
    fotoPerfil?: string;
    descripcion?: string;
    ocultarCursos?: boolean;
  }): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async getPerfilPublico(usuarioId: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/auth/usuarios/${usuarioId}/perfil-publico`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    return handleResponse<any>(res);
  },
};

// 2. Admin Users API
export const adminUsersAPI = {
  async getAll(query?: string): Promise<User[]> {
    const url = new URL(`${API_BASE_URL}/admin/users`);
    if (query) url.searchParams.set("query", query);

    const res = await fetch(url.toString(), {
      headers: {
        ...getAuthHeader(),
      },
    });
    return handleResponse<User[]>(res);
  },

  async updateRole(userId: number, rol: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ rol }),
    });
    return handleResponse<User>(res);
  },

  async updateStatus(userId: number, estado: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ estado }),
    });
    return handleResponse<User>(res);
  },
};

// 3. Convocatorias API
export const convocatoriasAPI = {
  async getAdminList(): Promise<Convocatoria[]> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/admin`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    return handleResponse<Convocatoria[]>(res);
  },

  async getById(id: number): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    return handleResponse<Convocatoria>(res);
  },

  async create(data: ConvocatoriaRequest): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE_URL}/convocatorias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Convocatoria>(res);
  },

  async update(id: number, data: ConvocatoriaRequest): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Convocatoria>(res);
  },

  async publish(id: number): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}/publicar`, {
      method: "PUT",
      headers: {
        ...getAuthHeader(),
      },
    });
    return handleResponse<Convocatoria>(res);
  },

  async getEncargadosDisponibles(): Promise<{ docentes: UserDTO[]; jurados: UserDTO[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/convocatorias/encargados-disponibles`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    try {
      const allUsers = await adminUsersAPI.getAll();
      const docentes = allUsers.filter(
        (u) => (u.rol === "DOCENTE" || u.rol === "ADMIN")
      );
      const jurados = allUsers.filter(
        (u) => (u.rol === "JURADO" || u.rol === "DOCENTE")
      );
      return { docentes, jurados };
    } catch {
      return { docentes: [], jurados: [] };
    }
  },

  async getParticipantes(id: number): Promise<ConvocatoriaParticipanteDTO[]> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}/participantes`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ConvocatoriaParticipanteDTO[]>(res);
  },

  async designarParticipante(id: number, data: DesignarParticipanteRequest): Promise<ConvocatoriaParticipanteDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}/participantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<ConvocatoriaParticipanteDTO>(res);
  },

  async getMisAreas(): Promise<Convocatoria[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/convocatorias/mis-areas`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback a lógica resiliente
    }

    // Fallback: Si el endpoint aún no está listo o responde 400
    try {
      const savedUserStr = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
      const currentUser: User | null = savedUserStr ? JSON.parse(savedUserStr) : null;
      const allConvs = await convocatoriasAPI.getAdminList().catch(async () => {
        return await publicConvocatoriasAPI.getAll();
      });

      if (!currentUser || currentUser.rol === "ADMIN") {
        return allConvs;
      }

      const misAreas: Convocatoria[] = [];
      for (const conv of allConvs) {
        if (conv.creadorId === currentUser.id) {
          misAreas.push({ ...conv, miEstadoInscripcion: "ACEPTADO" });
          continue;
        }
        try {
          const parts = await convocatoriasAPI.getParticipantes(conv.id);
          const miPart = parts.find(
            (p) => p.usuarioId === currentUser.id || p.email?.toLowerCase() === currentUser.email?.toLowerCase()
          );
          if (miPart) {
            if (currentUser.rol === "DOCENTE" || currentUser.rol === "JURADO") {
              if (miPart.estadoInscripcion === "ACEPTADO") {
                misAreas.push({ ...conv, miEstadoInscripcion: miPart.estadoInscripcion });
              }
            } else {
              misAreas.push({ ...conv, miEstadoInscripcion: miPart.estadoInscripcion });
            }
          }
        } catch {
          // continuar con la siguiente
        }
      }
      return misAreas;
    } catch {
      return [];
    }
  },

  async inscribirse(id: number, data?: InscribirseAreaRequest): Promise<ConvocatoriaParticipanteDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}/inscribirse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data || {}),
    });
    return handleResponse<ConvocatoriaParticipanteDTO>(res);
  },

  async declinarSolicitud(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}/declinar-solicitud`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async admitirParticipante(convocatoriaId: number, participanteId: number): Promise<ConvocatoriaParticipanteDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/participantes/${participanteId}/admitir`, {
      method: "PUT",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ConvocatoriaParticipanteDTO>(res);
  },

  async rechazarParticipante(convocatoriaId: number, participanteId: number, motivo?: string): Promise<ConvocatoriaParticipanteDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/participantes/${participanteId}/rechazar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ accion: "RECHAZAR", motivo }),
    });
    return handleResponse<ConvocatoriaParticipanteDTO>(res);
  },

  async removerParticipante(convocatoriaId: number, participanteId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/participantes/${participanteId}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async responderLote(
    convocatoriaId: number,
    participanteIds: number[],
    accion: "ADMITIR" | "RECHAZAR",
    motivo?: string
  ): Promise<{ procesados: number; errores: string[] }> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/participantes/responder-lote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ participanteIds, accion, motivo }),
    });
    return handleResponse<{ procesados: number; errores: string[] }>(res);
  },

  async getTareas(convocatoriaId: number): Promise<TareaDTO[]> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/tareas`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<TareaDTO[]>(res);
  },

  async createTarea(convocatoriaId: number, data: TareaRequest): Promise<TareaDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<TareaDTO>(res);
  },
};

// 4. Public Convocatorias API
export const publicConvocatoriasAPI = {
  async getAll(tipo?: string, query?: string): Promise<Convocatoria[]> {
    const url = new URL(`${API_BASE_URL}/public/convocatorias`);
    if (tipo && tipo !== "TODAS") url.searchParams.set("tipo", tipo);
    if (query) url.searchParams.set("query", query);

    const res = await fetch(url.toString());
    return handleResponse<Convocatoria[]>(res);
  },

  async getById(id: number): Promise<Convocatoria> {
    const res = await fetch(`${API_BASE_URL}/public/convocatorias/${id}`);
    return handleResponse<Convocatoria>(res);
  },
};

// 5. Permisos API (RBAC Modular)
export const permisosAPI = {
  async getTodos(): Promise<RolPermisoDTO[]> {
    const res = await fetch(`${API_BASE_URL}/permisos`);
    return handleResponse<RolPermisoDTO[]>(res);
  },

  async getMiRol(): Promise<RolPermisoDTO[]> {
    const res = await fetch(`${API_BASE_URL}/permisos/mi-rol`, {
      headers: {
        ...getAuthHeader(),
      },
    });
    return handleResponse<RolPermisoDTO[]>(res);
  },

  async getPorRol(rol: string): Promise<RolPermisoDTO[]> {
    const res = await fetch(`${API_BASE_URL}/permisos/rol/${rol}`);
    return handleResponse<RolPermisoDTO[]>(res);
  },

  async actualizar(permiso: RolPermisoDTO): Promise<RolPermisoDTO> {
    const res = await fetch(`${API_BASE_URL}/permisos`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(permiso),
    });
    return handleResponse<RolPermisoDTO>(res);
  },
};

// 6. Documentos Colaborativos API (Sprint 2)
export type TipoPermisoDoc = "LECTURA" | "EDICION" | "ADMINISTRACION";

export interface DocumentoColaboradorDTO {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
  permiso: TipoPermisoDoc;
  fechaAsignacion: string;
}

export interface DocumentoDTO {
  id: number;
  titulo: string;
  descripcion?: string;
  categoria: string;
  contenido: string;
  estado: "BORRADOR" | "EN_REVISION" | "APROBADO" | "FINALIZADO";
  autorId: number;
  autorNombre: string;
  autorEmail: string;
  convocatoriaId?: number;
  convocatoriaTitulo?: string;
  tareaId?: number;
  tareaTitulo?: string;
  miPermiso: "OWNER" | "ADMINISTRACION" | "EDICION" | "LECTURA";
  colaboradores: DocumentoColaboradorDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentoVersionDTO {
  id: number;
  documentoId: number;
  titulo: string;
  contenido: string;
  usuarioId: number;
  usuarioNombre: string;
  createdAt?: string;
}

export interface DocumentoRequest {
  titulo: string;
  descripcion?: string;
  categoria?: string;
  contenido?: string;
  convocatoriaId?: number;
}

export interface ColaboradorRequest {
  email: string;
  permiso: TipoPermisoDoc;
}

export const documentosAPI = {
  async getAll(): Promise<DocumentoDTO[]> {
    const res = await fetch(`${API_BASE_URL}/documentos`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentoDTO[]>(res);
  },

  async getById(id: number): Promise<DocumentoDTO> {
    const res = await fetch(`${API_BASE_URL}/documentos/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentoDTO>(res);
  },

  async create(data: DocumentoRequest): Promise<DocumentoDTO> {
    const res = await fetch(`${API_BASE_URL}/documentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<DocumentoDTO>(res);
  },

  async update(id: number, data: DocumentoRequest): Promise<DocumentoDTO> {
    const res = await fetch(`${API_BASE_URL}/documentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<DocumentoDTO>(res);
  },

  async delete(id: number): Promise<{ mensaje: string }> {
    const res = await fetch(`${API_BASE_URL}/documentos/${id}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ mensaje: string }>(res);
  },

  async assignColaborador(id: number, data: ColaboradorRequest): Promise<DocumentoDTO> {
    const res = await fetch(`${API_BASE_URL}/documentos/${id}/colaboradores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<DocumentoDTO>(res);
  },

  async removeColaborador(id: number, colabId: number): Promise<DocumentoDTO> {
    const res = await fetch(`${API_BASE_URL}/documentos/${id}/colaboradores/${colabId}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentoDTO>(res);
  },

  async getVersiones(id: number): Promise<DocumentoVersionDTO[]> {
    const res = await fetch(`${API_BASE_URL}/documentos/${id}/versiones`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentoVersionDTO[]>(res);
  },

  async restaurarVersion(id: number, versionId: number): Promise<DocumentoDTO> {
    const res = await fetch(`${API_BASE_URL}/documentos/${id}/versiones/${versionId}/restaurar`, {
      method: "POST",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentoDTO>(res);
  },
};

// 7. Cursos y Aulas Virtuales API (tipo Moodle - Sprint 2)
export interface CursoDTO {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  periodo: string;
  docenteId: number;
  docenteNombre: string;
  docenteEmail: string;
  activo: boolean;
  cantidadEstudiantes: number;
  cantidadTareas: number;
  estoyInscrito: boolean;
  createdAt?: string;
}

export interface CursoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  periodo?: string;
}

export const cursosAPI = {
  async getAll(): Promise<CursoDTO[]> {
    const res = await fetch(`${API_BASE_URL}/cursos`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<CursoDTO[]>(res);
  },

  async getById(id: number): Promise<CursoDTO> {
    const res = await fetch(`${API_BASE_URL}/cursos/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<CursoDTO>(res);
  },

  async create(data: CursoRequest): Promise<CursoDTO> {
    const res = await fetch(`${API_BASE_URL}/cursos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<CursoDTO>(res);
  },

  async enroll(id: number): Promise<CursoDTO> {
    const res = await fetch(`${API_BASE_URL}/cursos/${id}/inscribir`, {
      method: "POST",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<CursoDTO>(res);
  },

  async unenroll(id: number): Promise<CursoDTO> {
    const res = await fetch(`${API_BASE_URL}/cursos/${id}/inscribir`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<CursoDTO>(res);
  },

  async getTareas(cursoId: number): Promise<TareaDTO[]> {
    const res = await fetch(`${API_BASE_URL}/cursos/${cursoId}/tareas`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<TareaDTO[]>(res);
  },

  async createTarea(cursoId: number, data: TareaRequest): Promise<TareaDTO> {
    const res = await fetch(`${API_BASE_URL}/cursos/${cursoId}/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<TareaDTO>(res);
  },
};

// 8. Tareas y Entregas Académicas API (tipo Moodle - Sprint 2)

// --- Rúbrica ---
export interface CriterioDTO {
  id: number;
  nombre: string;
  descripcion?: string;
  puntajeMaximo: number;
  orden: number;
}

export interface CriterioRequest {
  id?: number;
  nombre: string;
  descripcion?: string;
  puntajeMaximo: number;
}

export interface PuntajeCriterioDTO {
  criterioId: number;
  nombre: string;
  puntaje: number;
  puntajeMaximo: number;
}

export interface PuntajeCriterioRequest {
  criterioId: number;
  puntaje: number;
}

// --- Notificaciones ---
export interface NotificacionDTO {
  id: number;
  tipo: "INSCRIPCION_ADMITIDA" | "INSCRIPCION_RECHAZADA" | "NUEVA_POSTULACION" | "NUEVA_ENTREGA" | "ENTREGA_CALIFICADA" | "NUEVA_TAREA" | "CORTE_PROXIMO" | string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  convocatoriaId?: number;
  tareaId?: number;
  entregaId?: number;
}

// --- Seguimiento de tarea (SpeedGrader) ---
export interface ItemSeguimientoDTO {
  estudianteId: number;
  estudianteNombre: string;
  estudianteEmail: string;
  fotoPerfil?: string;
  grupoNombre?: string;
  estadoSeguimiento: "SIN_ENTREGAR" | "ENTREGADO" | "CALIFICADO";
  conRetraso: boolean;
  entrega?: EntregaTareaDTO | null;
}

export interface ResumenSeguimientoDTO {
  totalEstudiantes: number;
  entregados: number;
  sinEntregar: number;
  conRetraso: number;
  calificados: number;
  porCalificar: number;
}

export interface SeguimientoTareaDTO {
  tareaId: number;
  titulo: string;
  puntajeMaximo: number;
  esGrupal: boolean;
  fechaEntrega?: string;
  fechaCorte?: string;
  resumen: ResumenSeguimientoDTO;
  items: ItemSeguimientoDTO[];
}

// --- Historial de versiones ---
export interface VersionDTO {
  id: number;
  intento: number;
  nombreArchivo?: string;
  archivoUrl?: string;
  comentario?: string;
  fechaEntrega: string;
  conRetraso: boolean;
}

// --- EntregaTareaDTO con campos de mejoras ---
export interface EntregaTareaDTO {
  id: number;
  tareaId: number;
  tareaTitulo: string;
  estudianteId: number;
  estudianteNombre: string;
  estudianteEmail: string;
  documentoId?: number;
  documentoTitulo?: string;
  nombreArchivo?: string;
  archivoUrl?: string;
  comentarioEstudiante?: string;
  fechaEntrega: string;
  estado: "ENTREGADO" | "CALIFICADO" | "DEVUELTO";
  calificacion?: number;
  retroalimentacion?: string;
  fechaCalificacion?: string;
  calificadoPorNombre?: string;
  esGrupal?: boolean;
  entregadoPorId?: number;
  entregadoPorNombre?: string;
  entregadoPorEmail?: string;
  esMiEntregaPropia?: boolean;
  grupoId?: number;
  grupoNombre?: string;
  companerosEquipo?: string[];
  // Mejoras
  conRetraso?: boolean;
  intentos?: number;
  puntajeMaximoTarea?: number;
  puntajesCriterios?: PuntajeCriterioDTO[];
}

// --- TareaDTO con rubrica y miEstado ---
export interface TareaDTO {
  id: number;
  convocatoriaId?: number;
  convocatoriaTitulo?: string;
  cursoId?: number;
  cursoNombre?: string;
  cursoCodigo?: string;
  titulo: string;
  descripcion?: string;
  fechaHabilitacion?: string;
  fechaEntrega?: string;
  fechaCorte?: string;
  fechaLimite?: string;
  habilitada: boolean;
  tiposArchivosPermitidos: string;
  tamanoMaximoMb: number;
  puntajeMaximo: number;
  esGrupal?: boolean;
  creadorId?: number;
  creadorNombre?: string;
  totalEntregas: number;
  estadoMoodle?: "ABIERTA" | "PENDIENTE_APERTURA" | "CERRADA_CORTE" | "DESHABILITADA" | "ENTREGA_CON_RETRASO";
  createdAt?: string;
  updatedAt?: string;
  miEntrega?: EntregaTareaDTO;
  moduloId?: number;
  moduloTitulo?: string;
  documentoColaborativoHabilitado?: boolean;
  documentoColaborativoId?: number;
  documentoColaborativoTitulo?: string;
  actividadGrupoId?: number;
  actividadGrupoTitulo?: string;
  // Mejoras
  rubrica?: CriterioDTO[];
  miEstado?: "PENDIENTE" | "ENTREGADO" | "ENTREGADO_CON_RETRASO" | "CALIFICADO" | "VENCIDA" | "NO_DISPONIBLE";
}

export interface TareaRequest {
  convocatoriaId?: number;
  moduloId?: number;
  titulo: string;
  descripcion?: string;
  fechaHabilitacion?: string;
  fechaEntrega?: string;
  fechaCorte?: string;
  fechaLimite?: string;
  habilitada?: boolean;
  tiposArchivosPermitidos?: string;
  tamanoMaximoMb?: number;
  puntajeMaximo?: number;
  documentoColaborativoHabilitado?: boolean;
  esGrupal?: boolean;
  actividadGrupoId?: number;
  // Mejoras: null = no tocar; [] = borrar; lista = reemplazar
  rubrica?: CriterioRequest[] | null;
}

export interface EntregaRequest {
  documentoId?: number;
  nombreArchivo?: string;
  archivoUrl?: string;
  comentarioEstudiante?: string;
  grupoId?: number;
}

export interface CalificarEntregaRequest {
  calificacion?: number;
  retroalimentacion?: string;
  // Mejoras: calificación por rúbrica criterio a criterio
  puntajesCriterios?: PuntajeCriterioRequest[];
}

export interface ResponderLoteRequest {
  participanteIds: number[];
  accion: "ADMITIR" | "RECHAZAR";
  motivo?: string;
}

export const tareasAPI = {
  async getById(id: number): Promise<TareaDTO> {
    const res = await fetch(`${API_BASE_URL}/tareas/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<TareaDTO>(res);
  },

  async update(id: number, data: TareaRequest): Promise<TareaDTO> {
    const res = await fetch(`${API_BASE_URL}/tareas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<TareaDTO>(res);
  },

  async toggleHabilitar(id: number): Promise<TareaDTO> {
    const res = await fetch(`${API_BASE_URL}/tareas/${id}/habilitar`, {
      method: "PUT",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<TareaDTO>(res);
  },

  async submitEntrega(id: number, data: EntregaRequest): Promise<EntregaTareaDTO> {
    const res = await fetch(`${API_BASE_URL}/tareas/${id}/entregar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<EntregaTareaDTO>(res);
  },

  async getEntregas(id: number): Promise<EntregaTareaDTO[]> {
    const res = await fetch(`${API_BASE_URL}/tareas/${id}/entregas`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<EntregaTareaDTO[]>(res);
  },

  async getDocumentoColaborativo(id: number): Promise<DocumentoDTO> {
    const res = await fetch(`${API_BASE_URL}/tareas/${id}/documento-colaborativo`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<DocumentoDTO>(res);
  },

  async calificar(entregaId: number, data: CalificarEntregaRequest): Promise<EntregaTareaDTO> {
    const res = await fetch(`${API_BASE_URL}/entregas/${entregaId}/calificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<EntregaTareaDTO>(res);
  },

  async getSeguimiento(tareaId: number): Promise<SeguimientoTareaDTO> {
    const res = await fetch(`${API_BASE_URL}/tareas/${tareaId}/seguimiento`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<SeguimientoTareaDTO>(res);
  },

  async getMisTareas(): Promise<TareaDTO[]> {
    const res = await fetch(`${API_BASE_URL}/tareas/mis-tareas`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<TareaDTO[]>(res);
  },

  async getHistorial(entregaId: number): Promise<VersionDTO[]> {
    const res = await fetch(`${API_BASE_URL}/entregas/${entregaId}/historial`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<VersionDTO[]>(res);
  },

  async exportNotasTarea(tareaId: number): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/tareas/${tareaId}/export-notas`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Error ${res.status} exportando notas`);
    return res.blob();
  },

  async exportNotasConvocatoria(convocatoriaId: number): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/export-notas`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error(`Error ${res.status} exportando notas`);
    return res.blob();
  },
};

// 9. Notificaciones API
export const notificacionesAPI = {
  async listar(limite = 50): Promise<NotificacionDTO[]> {
    const res = await fetch(`${API_BASE_URL}/notificaciones?limite=${limite}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<NotificacionDTO[]>(res);
  },

  async contarNoLeidas(): Promise<{ count: number }> {
    const res = await fetch(`${API_BASE_URL}/notificaciones/no-leidas`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ count: number }>(res);
  },

  async marcarLeida(id: number): Promise<{ ok: boolean }> {
    const res = await fetch(`${API_BASE_URL}/notificaciones/${id}/leer`, {
      method: "PUT",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ ok: boolean }>(res);
  },

  async marcarTodasLeidas(): Promise<{ ok: boolean; marcadas: number }> {
    const res = await fetch(`${API_BASE_URL}/notificaciones/leer-todas`, {
      method: "PUT",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ ok: boolean; marcadas: number }>(res);
  },
};

// 7. Modulos API (LMS / Moodle)
export interface ModuloDTO {
  id: number;
  convocatoriaId: number;
  convocatoriaTitulo?: string;
  titulo: string;
  descripcion?: string;
  imagenUrl?: string;
  orden?: number;
  activo: boolean;
  totalTareas: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModuloRequest {
  titulo: string;
  descripcion?: string;
  imagenUrl?: string;
  orden?: number;
  activo?: boolean;
}

export const modulosAPI = {
  async getPorConvocatoria(convocatoriaId: number): Promise<ModuloDTO[]> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/modulos`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ModuloDTO[]>(res);
  },

  async getById(id: number): Promise<ModuloDTO> {
    const res = await fetch(`${API_BASE_URL}/modulos/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ModuloDTO>(res);
  },

  async create(convocatoriaId: number, data: ModuloRequest): Promise<ModuloDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/modulos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<ModuloDTO>(res);
  },

  async update(id: number, data: ModuloRequest): Promise<ModuloDTO> {
    const res = await fetch(`${API_BASE_URL}/modulos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<ModuloDTO>(res);
  },

  async delete(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/modulos/${id}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },
};

// Subida de archivos / imágenes / documentos
export const uploadsAPI = {
  async uploadImagen(file: File): Promise<{ url: string; relativePath: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/uploads/imagen`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse<{ url: string; relativePath: string; filename: string; size: number }>(res);
  },

  async uploadArchivo(file: File): Promise<{ url: string; relativePath: string; filename: string; originalFilename: string; size: number }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/uploads/documento`, {
      method: "POST",
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse<{ url: string; relativePath: string; filename: string; originalFilename: string; size: number }>(res);
  },
};

/**
 * Resuelve URLs de recursos multimedia (locales o externas)
 */
export function getMediaUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  const origin = apiBase.replace(/\/api$/, "");
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export const resolveFileUrl = getMediaUrl;

// ==========================================
// 12. GRUPOS Y SELECCIÓN DE EQUIPOS (Moodle Style)
// ==========================================

export interface MiembroGrupoDTO {
  participanteId: number;
  usuarioId: number;
  nombreCompleto: string;
  email: string;
  fotoPerfil?: string;
  fechaAsignacion?: string;
}

export interface GrupoDTO {
  id: number;
  convocatoriaId: number;
  actividadGrupoId?: number;
  nombre: string;
  descripcion?: string;
  capacidadMaxima: number;
  cantidadMiembros: number;
  completo: boolean;
  miembros: MiembroGrupoDTO[];
}

export interface CrearGrupoRequest {
  nombre: string;
  descripcion?: string;
  capacidadMaxima?: number;
  actividadGrupoId?: number;
}

export interface GenerarLoteGruposRequest {
  prefijo?: string;
  cantidad?: number;
  capacidadMaxima?: number;
  actividadGrupoId?: number;
}

export interface GruposAreaResponse {
  grupos: GrupoDTO[];
  estudiantesSinEquipo: ConvocatoriaParticipanteDTO[];
  totalEstudiantes: number;
  totalConEquipo: number;
  totalSinEquipo: number;
}

export interface ActividadGrupoDTO {
  id: number;
  convocatoriaId: number;
  moduloId?: number;
  titulo: string;
  descripcion?: string;
  fechaApertura?: string;
  fechaCierre?: string;
  capacidadPorGrupo: number;
  permitirCambio: boolean;
  mostrarMiembros: boolean;
  habilitada: boolean;
  abierta: boolean;
  cerrada: boolean;
  grupoSeleccionadoId?: number;
  grupoSeleccionadoNombre?: string;
  grupos: GrupoDTO[];
}

export interface CrearActividadGrupoRequest {
  convocatoriaId?: number;
  moduloId?: number;
  titulo: string;
  descripcion?: string;
  fechaApertura?: string;
  fechaCierre?: string;
  capacidadPorGrupo?: number;
  permitirCambio?: boolean;
  mostrarMiembros?: boolean;
  generarGrupos?: boolean;
  cantidadGrupos?: number;
  prefijoGrupos?: string;
}

export interface ElegirGrupoRequest {
  grupoId: number;
}

export const gruposAPI = {
  async getGrupos(convocatoriaId: number): Promise<GruposAreaResponse> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/grupos`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<GruposAreaResponse>(res);
  },

  async crearGrupo(convocatoriaId: number, data: CrearGrupoRequest): Promise<GrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/grupos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<GrupoDTO>(res);
  },

  async generarLote(convocatoriaId: number, data: GenerarLoteGruposRequest): Promise<GrupoDTO[]> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/grupos/generar-lote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<GrupoDTO[]>(res);
  },

  async actualizarGrupo(convocatoriaId: number, grupoId: number, data: CrearGrupoRequest): Promise<GrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/grupos/${grupoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<GrupoDTO>(res);
  },

  async eliminarGrupo(convocatoriaId: number, grupoId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/grupos/${grupoId}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ message: string }>(res);
  },

  async asignarMiembro(convocatoriaId: number, grupoId: number, participanteId: number): Promise<GrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/grupos/${grupoId}/miembros/${participanteId}`, {
      method: "POST",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<GrupoDTO>(res);
  },

  async removerMiembro(convocatoriaId: number, grupoId: number, participanteId: number): Promise<GrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/grupos/${grupoId}/miembros/${participanteId}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<GrupoDTO>(res);
  },
};

export const actividadesGrupoAPI = {
  async getActividades(convocatoriaId: number): Promise<ActividadGrupoDTO[]> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/actividades-grupo`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ActividadGrupoDTO[]>(res);
  },

  async getDetalle(convocatoriaId: number, actividadId: number): Promise<ActividadGrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/actividades-grupo/${actividadId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ActividadGrupoDTO>(res);
  },

  async crearActividad(convocatoriaId: number, data: CrearActividadGrupoRequest): Promise<ActividadGrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/actividades-grupo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<ActividadGrupoDTO>(res);
  },

  async actualizarActividad(convocatoriaId: number, actividadId: number, data: CrearActividadGrupoRequest): Promise<ActividadGrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/actividades-grupo/${actividadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<ActividadGrupoDTO>(res);
  },

  async elegirGrupo(convocatoriaId: number, actividadId: number, grupoId: number): Promise<ActividadGrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/actividades-grupo/${actividadId}/elegir`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ grupoId }),
    });
    return handleResponse<ActividadGrupoDTO>(res);
  },

  async anularEleccion(convocatoriaId: number, actividadId: number): Promise<ActividadGrupoDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${convocatoriaId}/actividades-grupo/${actividadId}/elegir`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ActividadGrupoDTO>(res);
  },
};

// Unified api object
export const api = {
  // Auth
  login: authAPI.login,
  register: authAPI.register,
  getProfile: authAPI.getProfile,
  updateProfile: authAPI.updateProfile,
  getPerfilPublico: authAPI.getPerfilPublico,

  // Admin Users
  getUsers: adminUsersAPI.getAll,
  updateUserRole: adminUsersAPI.updateRole,
  updateUserStatus: adminUsersAPI.updateStatus,

  // Convocatorias & Áreas
  getConvocatorias: convocatoriasAPI.getAdminList,
  getMisAreas: convocatoriasAPI.getMisAreas,
  getConvocatoriaById: convocatoriasAPI.getById,
  createConvocatoria: convocatoriasAPI.create,
  updateConvocatoria: convocatoriasAPI.update,
  publicarConvocatoria: convocatoriasAPI.publish,
  getEncargadosDisponibles: convocatoriasAPI.getEncargadosDisponibles,
  getParticipantesConvocatoria: convocatoriasAPI.getParticipantes,
  designarParticipante: convocatoriasAPI.designarParticipante,
  inscribirseConvocatoria: convocatoriasAPI.inscribirse,
  declinarSolicitudConvocatoria: convocatoriasAPI.declinarSolicitud,
  admitirParticipante: convocatoriasAPI.admitirParticipante,
  rechazarParticipante: convocatoriasAPI.rechazarParticipante,
  removerParticipante: convocatoriasAPI.removerParticipante,
  responderLote: convocatoriasAPI.responderLote,
  getTareasConvocatoria: convocatoriasAPI.getTareas,
  createTareaConvocatoria: convocatoriasAPI.createTarea,

  // Módulos
  getModulosConvocatoria: modulosAPI.getPorConvocatoria,
  getModuloById: modulosAPI.getById,
  createModulo: modulosAPI.create,
  updateModulo: modulosAPI.update,
  deleteModulo: modulosAPI.delete,

  // Subida de Archivos
  uploadImagen: uploadsAPI.uploadImagen,
  uploadArchivo: uploadsAPI.uploadArchivo,

  // Public
  getPublicConvocatorias: publicConvocatoriasAPI.getAll,

  // Permisos
  getPermisos: permisosAPI.getTodos,
  getPermisosMiRol: permisosAPI.getMiRol,
  getPermisosPorRol: permisosAPI.getPorRol,
  updatePermiso: permisosAPI.actualizar,

  // Documentos
  getDocumentos: documentosAPI.getAll,
  getDocumentoById: documentosAPI.getById,
  createDocumento: documentosAPI.create,
  updateDocumento: documentosAPI.update,
  deleteDocumento: documentosAPI.delete,
  assignColaborador: documentosAPI.assignColaborador,
  removeColaborador: documentosAPI.removeColaborador,
  getVersionesDocumento: documentosAPI.getVersiones,
  restaurarVersionDocumento: documentosAPI.restaurarVersion,

  // Cursos (Moodle)
  getCursos: cursosAPI.getAll,
  getCursoById: cursosAPI.getById,
  createCurso: cursosAPI.create,
  inscribirCurso: cursosAPI.enroll,
  desinscribirCurso: cursosAPI.unenroll,
  getTareasCurso: cursosAPI.getTareas,
  createTareaCurso: cursosAPI.createTarea,

  // Tareas & Entregas
  getTareaById: tareasAPI.getById,
  updateTarea: tareasAPI.update,
  toggleHabilitarTarea: tareasAPI.toggleHabilitar,
  entregarTarea: tareasAPI.submitEntrega,
  getEntregasTarea: tareasAPI.getEntregas,
  getDocumentoColaborativoTarea: tareasAPI.getDocumentoColaborativo,
  calificarEntrega: tareasAPI.calificar,
  // Mejoras
  getSeguimiento: tareasAPI.getSeguimiento,
  getSeguimientoTarea: tareasAPI.getSeguimiento,
  getMisTareas: tareasAPI.getMisTareas,
  getHistorial: tareasAPI.getHistorial,
  getHistorialEntrega: tareasAPI.getHistorial,
  exportNotasTarea: tareasAPI.exportNotasTarea,
  exportNotasConvocatoria: tareasAPI.exportNotasConvocatoria,

  // Grupos & Equipos (Moodle Style)
  getGruposArea: gruposAPI.getGrupos,
  crearGrupo: gruposAPI.crearGrupo,
  generarLoteGrupos: gruposAPI.generarLote,
  actualizarGrupo: gruposAPI.actualizarGrupo,
  eliminarGrupo: gruposAPI.eliminarGrupo,
  asignarMiembroGrupo: gruposAPI.asignarMiembro,
  removerMiembroGrupo: gruposAPI.removerMiembro,

  // Actividades de Selección de Grupo (Moodle Style)
  getActividadesGrupo: actividadesGrupoAPI.getActividades,
  getDetalleActividadGrupo: actividadesGrupoAPI.getDetalle,
  crearActividadGrupo: actividadesGrupoAPI.crearActividad,
  actualizarActividadGrupo: actividadesGrupoAPI.actualizarActividad,
  elegirGrupoActividad: actividadesGrupoAPI.elegirGrupo,
  anularEleccionGrupoActividad: actividadesGrupoAPI.anularEleccion,

  // Notificaciones
  listarNotificaciones: notificacionesAPI.listar,
  contarNotificacionesNoLeidas: notificacionesAPI.contarNoLeidas,
  marcarNotificacionLeida: notificacionesAPI.marcarLeida,
  marcarTodasNotificacionesLeidas: notificacionesAPI.marcarTodasLeidas,
};

export default api;

