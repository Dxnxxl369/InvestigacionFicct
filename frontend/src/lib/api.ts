const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: "ADMIN" | "DOCENTE" | "JURADO" | "ESTUDIANTE";
  estado: "ACTIVO" | "SUSPENDIDO";
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
}

export interface RequisitoDTO {
  id?: number;
  descripcion: string;
}

export type Requisito = RequisitoDTO;

export interface Convocatoria {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: "FERIA" | "HACKATHON" | "CONCURSO" | "INVESTIGACION";
  estado: "BORRADOR" | "PUBLICADA" | "FINALIZADA";
  fechaCierre?: string;
  tamanoEquipo?: string;
  imagenPortada?: string;
  creadorId?: number;
  creadorNombre?: string;
  creadorEmail?: string;
  requisitos?: RequisitoDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export type ConvocatoriaDTO = Convocatoria;

export interface ConvocatoriaRequest {
  titulo: string;
  descripcion: string;
  tipo: "FERIA" | "HACKATHON" | "CONCURSO" | "INVESTIGACION";
  fechaCierre?: string;
  tamanoEquipo?: string;
  imagenPortada?: string;
  requisitos?: string[];
}

export interface ConvocatoriaParticipanteDTO {
  id: number;
  convocatoriaId: number;
  usuarioId: number;
  nombre: string;
  apellidos: string;
  email: string;
  rol: "ADMIN" | "DOCENTE" | "JURADO" | "ESTUDIANTE";
  nombreEquipo?: string;
  fechaAsignacion: string;
  asignadoPorNombre?: string;
}

export interface DesignarParticipanteRequest {
  usuarioId?: number;
  email?: string;
  rol: "DOCENTE" | "JURADO";
  nombreEquipo?: string;
}

export interface InscribirseAreaRequest {
  nombreEquipo?: string;
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

  async inscribirse(id: number, data?: InscribirseAreaRequest): Promise<ConvocatoriaParticipanteDTO> {
    const res = await fetch(`${API_BASE_URL}/convocatorias/${id}/inscribirse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data || {}),
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
  miPermiso: "OWNER" | "ADMINISTRACION" | "EDICION" | "LECTURA";
  colaboradores: DocumentoColaboradorDTO[];
  createdAt?: string;
  updatedAt?: string;
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
}

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
  creadorId?: number;
  creadorNombre?: string;
  totalEntregas: number;
  estadoMoodle?: "ABIERTA" | "PENDIENTE_APERTURA" | "CERRADA_CORTE" | "DESHABILITADA" | "ENTREGA_CON_RETRASO";
  createdAt?: string;
  miEntrega?: EntregaTareaDTO;
}

export interface TareaRequest {
  convocatoriaId?: number;
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
}

export interface EntregaRequest {
  documentoId?: number;
  nombreArchivo?: string;
  archivoUrl?: string;
  comentarioEstudiante?: string;
}

export interface CalificarEntregaRequest {
  calificacion: number;
  retroalimentacion?: string;
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

  async calificar(entregaId: number, data: CalificarEntregaRequest): Promise<EntregaTareaDTO> {
    const res = await fetch(`${API_BASE_URL}/entregas/${entregaId}/calificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<EntregaTareaDTO>(res);
  },
};

// Unified api object
export const api = {
  // Auth
  login: authAPI.login,
  register: authAPI.register,
  getProfile: authAPI.getProfile,

  // Admin Users
  getUsers: adminUsersAPI.getAll,
  updateUserRole: adminUsersAPI.updateRole,
  updateUserStatus: adminUsersAPI.updateStatus,

  // Convocatorias & Áreas
  getConvocatorias: convocatoriasAPI.getAdminList,
  getConvocatoriaById: convocatoriasAPI.getById,
  createConvocatoria: convocatoriasAPI.create,
  updateConvocatoria: convocatoriasAPI.update,
  publicarConvocatoria: convocatoriasAPI.publish,
  getParticipantesConvocatoria: convocatoriasAPI.getParticipantes,
  designarParticipante: convocatoriasAPI.designarParticipante,
  inscribirseConvocatoria: convocatoriasAPI.inscribirse,
  removerParticipante: convocatoriasAPI.removerParticipante,
  getTareasConvocatoria: convocatoriasAPI.getTareas,
  createTareaConvocatoria: convocatoriasAPI.createTarea,

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
  calificarEntrega: tareasAPI.calificar,
};

export default api;

