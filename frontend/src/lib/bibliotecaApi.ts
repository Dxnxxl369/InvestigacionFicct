import { API_BASE_URL, getAuthHeader, handleResponse } from "@/lib/api";

export interface BibliotecaCategoria {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface BibliotecaDocumento {
  id: number;
  categoriaId: number | null;
  categoria: string | null;
  titulo: string;
  descripcion?: string;
  area?: string;
  nivel?: string;
  nombreArchivo: string;
  tienePortada: boolean;
  publicado: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface BibliotecaRecomendacion {
  documento: BibliotecaDocumento;
  puntaje: number;
  motivo: string;
}

export interface BibliotecaDocumentoRequest {
  categoriaId: number | null;
  titulo: string;
  descripcion: string;
  area: string;
  nivel: string;
  publicado: boolean;
}

export interface BibliotecaFiltros {
  areas: string[];
  niveles: string[];
}

const url = (ruta: string) => `${API_BASE_URL}/biblioteca${ruta}`;
const jsonHeaders = () => ({ "Content-Type": "application/json", ...getAuthHeader() });

export const bibliotecaAPI = {
  async filtros(): Promise<BibliotecaFiltros> {
    return handleResponse(await fetch(url("/filtros"), { headers: getAuthHeader() }));
  },
  async categorias(): Promise<BibliotecaCategoria[]> {
    return handleResponse(await fetch(url("/categorias"), { headers: getAuthHeader() }));
  },
  async crearCategoria(nombre: string, descripcion: string): Promise<BibliotecaCategoria> {
    return handleResponse(await fetch(url("/categorias"), {
      method: "POST", headers: jsonHeaders(), body: JSON.stringify({ nombre, descripcion }),
    }));
  },
  async actualizarCategoria(id: number, nombre: string, descripcion: string): Promise<BibliotecaCategoria> {
    return handleResponse(await fetch(url(`/categorias/${id}`), {
      method: "PUT", headers: jsonHeaders(), body: JSON.stringify({ nombre, descripcion }),
    }));
  },
  async eliminarCategoria(id: number): Promise<void> {
    const res = await fetch(url(`/categorias/${id}`), { method: "DELETE", headers: getAuthHeader() });
    if (!res.ok) await handleResponse(res);
  },
  async documentos(filtros: { texto?: string; categoriaId?: string; area?: string; nivel?: string } = {}): Promise<BibliotecaDocumento[]> {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => { if (valor) params.set(clave, valor); });
    return handleResponse(await fetch(url(`/documentos?${params}`), { headers: getAuthHeader() }));
  },
  async documentosAdmin(): Promise<BibliotecaDocumento[]> {
    return handleResponse(await fetch(url("/admin/documentos"), { headers: getAuthHeader() }));
  },
  async guardarDocumento(datos: BibliotecaDocumentoRequest, archivo?: File, portada?: File, id?: number): Promise<BibliotecaDocumento> {
    const body = new FormData();
    body.append("datos", new Blob([JSON.stringify(datos)], { type: "application/json" }));
    if (archivo) body.append("archivo", archivo);
    if (portada) body.append("portada", portada);
    return handleResponse(await fetch(url(id ? `/admin/documentos/${id}` : "/admin/documentos"), {
      method: id ? "PUT" : "POST", headers: getAuthHeader(), body,
    }));
  },
  async eliminarDocumento(id: number): Promise<void> {
    const res = await fetch(url(`/admin/documentos/${id}`), { method: "DELETE", headers: getAuthHeader() });
    if (!res.ok) await handleResponse(res);
  },
  async recomendaciones(): Promise<BibliotecaRecomendacion[]> {
    return handleResponse(await fetch(url("/recomendaciones"), { headers: getAuthHeader() }));
  },
  async archivo(id: number, descargar = false): Promise<Blob> {
    const res = await fetch(url(`/documentos/${id}/archivo?descargar=${descargar}`), { headers: getAuthHeader() });
    if (!res.ok) await handleResponse(res);
    return res.blob();
  },
  async portada(id: number): Promise<Blob> {
    const res = await fetch(url(`/documentos/${id}/portada`), { headers: getAuthHeader() });
    if (!res.ok) await handleResponse(res);
    return res.blob();
  },
};
