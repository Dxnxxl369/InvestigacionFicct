package com.ficct.investigacion.service;

import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class BibliotecaService {
    private static final long MAX_PDF = 20L * 1024 * 1024;
    private static final long MAX_PORTADA = 5L * 1024 * 1024;
    private final BibliotecaCategoriaRepository categorias;
    private final BibliotecaDocumentoRepository documentos;
    private final BibliotecaLecturaRepository lecturas;
    private final ConvocatoriaParticipanteRepository participantes;
    private final FeriaPostulacionRepository postulaciones;
    private final UserRepository usuarios;
    private final RecomendadorBibliotecaService recomendador;
    private final Path uploadsRoot;
    private final Path directorio;
    private ModuloRepository modulos;
    private TareaRepository tareas;
    private EntregaTareaRepository entregas;

    public BibliotecaService(BibliotecaCategoriaRepository categorias, BibliotecaDocumentoRepository documentos,
                             BibliotecaLecturaRepository lecturas,
                             ConvocatoriaParticipanteRepository participantes, FeriaPostulacionRepository postulaciones,
                             UserRepository usuarios, RecomendadorBibliotecaService recomendador,
                             @Value("${app.upload.dir:uploads}") String uploads) {
        this.categorias = categorias;
        this.documentos = documentos;
        this.lecturas = lecturas;
        this.participantes = participantes;
        this.postulaciones = postulaciones;
        this.usuarios = usuarios;
        this.recomendador = recomendador;
        this.uploadsRoot = Paths.get(uploads).toAbsolutePath().normalize();
        this.directorio = this.uploadsRoot.resolve("biblioteca");
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setRepositoriosFinalizacion(ModuloRepository modulos, TareaRepository tareas, EntregaTareaRepository entregas) {
        this.modulos = modulos;
        this.tareas = tareas;
        this.entregas = entregas;
    }

    public record CategoriaDatos(Long id, String nombre, String descripcion) {}
    public record DocumentoDatos(Long id, Long categoriaId, String categoria, String titulo, String descripcion,
                                 String area, String nivel, String nombreArchivo, boolean tienePortada, boolean publicado,
                                 LocalDateTime creadoEn, LocalDateTime actualizadoEn) {}
    public record RecomendacionDatos(DocumentoDatos documento, double puntaje, String motivo) {}
    public record CategoriaRequest(String nombre, String descripcion) {}
    public record DocumentoRequest(Long categoriaId, String titulo, String descripcion, String area,
                                   String nivel, Boolean publicado) {}
    public record ArchivoDatos(Path ruta, String nombreArchivo) {}

    @Transactional(readOnly = true)
    public List<CategoriaDatos> listarCategorias() {
        return categorias.findAll().stream().sorted(Comparator.comparing(BibliotecaCategoria::getNombre,
                String.CASE_INSENSITIVE_ORDER)).map(this::categoriaDatos).toList();
    }

    @Transactional
    public CategoriaDatos crearCategoria(CategoriaRequest request) {
        String nombre = obligatorio(request == null ? null : request.nombre(), "nombre", 120);
        if (categorias.existsByNombreIgnoreCase(nombre)) throw new IllegalArgumentException("La categoría ya existe.");
        BibliotecaCategoria categoria = new BibliotecaCategoria();
        categoria.setNombre(nombre);
        categoria.setDescripcion(opcional(request.descripcion(), 500));
        return categoriaDatos(categorias.save(categoria));
    }

    @Transactional
    public CategoriaDatos actualizarCategoria(Long id, CategoriaRequest request) {
        BibliotecaCategoria categoria = buscarCategoria(id);
        String nombre = obligatorio(request == null ? null : request.nombre(), "nombre", 120);
        if (categorias.existsByNombreIgnoreCaseAndIdNot(nombre, id)) throw new IllegalArgumentException("La categoría ya existe.");
        categoria.setNombre(nombre);
        categoria.setDescripcion(opcional(request.descripcion(), 500));
        return categoriaDatos(categorias.save(categoria));
    }

    @Transactional
    public void eliminarCategoria(Long id) {
        BibliotecaCategoria categoria = buscarCategoria(id);
        if (documentos.existsByCategoriaId(id)) throw new IllegalArgumentException("Mueve o elimina los PDF de esta categoría antes de borrarla.");
        categorias.delete(categoria);
    }

    @Transactional(readOnly = true)
    public List<DocumentoDatos> listarAdministracion() {
        return documentos.findAllByOrderByCreadoEnDesc().stream().map(this::documentoDatos).toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentoDatos> buscar(String texto, Long categoriaId, String area, String nivel) {
        String consulta = normalizar(texto);
        List<BibliotecaDocumento> filtrados = documentos.findByPublicadoTrueOrderByCreadoEnDesc().stream()
                .filter(d -> categoriaId == null || (categoriaId == -1
                        ? d.getCategoria() == null
                        : d.getCategoria() != null && d.getCategoria().getId().equals(categoriaId)))
                .filter(d -> area == null || area.isBlank() || area.equalsIgnoreCase(d.getArea()))
                .filter(d -> nivel == null || nivel.isBlank() || nivel.equalsIgnoreCase(d.getNivel()))
                .toList();

        if (consulta.isBlank()) {
            return filtrados.stream().map(this::documentoDatos).toList();
        }

        // Búsqueda inteligente con TF-IDF + coincidencia literal como respaldo
        List<RecomendadorBibliotecaService.Resultado> mlResultados = recomendador.recomendar(
                filtrados, new RecomendadorBibliotecaService.Contexto(area, nivel, texto));
        List<BibliotecaDocumento> ordenados = new ArrayList<>();
        Set<Long> incluidos = new HashSet<>();
        for (RecomendadorBibliotecaService.Resultado res : mlResultados) {
            BibliotecaDocumento doc = res.documento();
            if (doc.getId() != null && incluidos.add(doc.getId())) {
                ordenados.add(doc);
            }
        }
        for (BibliotecaDocumento d : filtrados) {
            if (d.getId() != null && incluidos.contains(d.getId())) continue;
            String contenido = normalizar(String.join(" ",
                    Objects.toString(d.getTitulo(), ""),
                    Objects.toString(d.getDescripcion(), ""),
                    Objects.toString(d.getArea(), ""),
                    Objects.toString(d.getNivel(), ""),
                    d.getCategoria() != null ? Objects.toString(d.getCategoria().getNombre(), "") : "",
                    Objects.toString(d.getTextoExtraido(), "")));
            if (contenido.contains(consulta)) {
                if (d.getId() != null) incluidos.add(d.getId());
                ordenados.add(d);
            }
        }
        return ordenados.stream().map(this::documentoDatos).toList();
    }

    @Transactional
    public DocumentoDatos crearDocumento(DocumentoRequest request, MultipartFile archivo, MultipartFile portada) {
        if (request == null) throw new IllegalArgumentException("Completa los datos del documento.");
        BibliotecaDocumento documento = new BibliotecaDocumento();
        aplicarDatos(documento, request);
        guardarPdf(documento, archivo, true);
        try { guardarPortada(documento, portada, true); }
        catch (RuntimeException ex) { borrarSilencioso(documento.getRutaArchivo()); throw ex; }
        try { return documentoDatos(documentos.saveAndFlush(documento)); }
        catch (RuntimeException ex) { borrarSilencioso(documento.getRutaArchivo()); borrarSilencioso(documento.getRutaPortada()); throw ex; }
    }

    @Transactional
    public DocumentoDatos actualizarDocumento(Long id, DocumentoRequest request, MultipartFile archivo, MultipartFile portada) {
        if (request == null) throw new IllegalArgumentException("Completa los datos del documento.");
        BibliotecaDocumento documento = buscarDocumento(id);
        String anterior = documento.getRutaArchivo();
        String portadaAnterior = documento.getRutaPortada();
        aplicarDatos(documento, request);
        if (archivo != null && !archivo.isEmpty()) guardarPdf(documento, archivo, false);
        try { if (portada != null && !portada.isEmpty()) guardarPortada(documento, portada, false); }
        catch (RuntimeException ex) {
            if (!anterior.equals(documento.getRutaArchivo())) borrarSilencioso(documento.getRutaArchivo());
            throw ex;
        }
        try {
            DocumentoDatos resultado = documentoDatos(documentos.saveAndFlush(documento));
            if (!anterior.equals(documento.getRutaArchivo())) despuesDeConfirmar(() -> borrarSilencioso(anterior));
            if (!Objects.equals(portadaAnterior, documento.getRutaPortada())) despuesDeConfirmar(() -> borrarSilencioso(portadaAnterior));
            return resultado;
        } catch (RuntimeException ex) {
            if (!anterior.equals(documento.getRutaArchivo())) borrarSilencioso(documento.getRutaArchivo());
            if (!Objects.equals(portadaAnterior, documento.getRutaPortada())) borrarSilencioso(documento.getRutaPortada());
            throw ex;
        }
    }

    @Transactional
    public void eliminarDocumento(Long id) {
        BibliotecaDocumento documento = buscarDocumento(id);
        String ruta = documento.getRutaArchivo();
        String portada = documento.getRutaPortada();
        lecturas.deleteByDocumentoId(id);
        documentos.delete(documento);
        despuesDeConfirmar(() -> { borrarSilencioso(ruta); borrarSilencioso(portada); });
    }

    @Transactional(readOnly = true)
    public ArchivoDatos archivo(Long id, boolean admin) {
        BibliotecaDocumento documento = buscarDocumento(id);
        if (!admin && !documento.isPublicado()) throw new NoSuchElementException("Documento no disponible.");
        Path ruta = resolver(documento.getRutaArchivo());
        if (!Files.isRegularFile(ruta)) throw new NoSuchElementException("El PDF no está disponible.");
        return new ArchivoDatos(ruta, documento.getNombreArchivo());
    }

    @Transactional
    public void registrarAcceso(String email, Long documentoId, boolean descarga) {
        User usuario = usuarios.findByEmail(email).orElseThrow(() -> new NoSuchElementException("Usuario no encontrado."));
        if (usuario.getRol() != Rol.ESTUDIANTE) return;
        BibliotecaDocumento documento = buscarDocumento(documentoId);
        if (!documento.isPublicado()) return;
        BibliotecaLectura lectura = lecturas.findByUsuarioIdAndDocumentoId(usuario.getId(), documentoId)
                .orElseGet(() -> {
                    BibliotecaLectura nueva = new BibliotecaLectura();
                    nueva.setUsuarioId(usuario.getId());
                    nueva.setDocumentoId(documentoId);
                    return nueva;
                });
        lectura.registrarAcceso(descarga);
        lecturas.save(lectura);
    }

    @Transactional(readOnly = true)
    public ArchivoDatos portada(Long id, boolean admin) {
        BibliotecaDocumento documento = buscarDocumento(id);
        if (!admin && !documento.isPublicado()) throw new NoSuchElementException("Documento no disponible.");
        if (documento.getRutaPortada() == null) throw new NoSuchElementException("Portada no disponible.");
        Path ruta = resolver(documento.getRutaPortada());
        if (!Files.isRegularFile(ruta)) throw new NoSuchElementException("Portada no disponible.");
        return new ArchivoDatos(ruta, ruta.getFileName().toString());
    }

    @Transactional(readOnly = true)
    public List<RecomendacionDatos> recomendar(String email) {
        User usuario = usuarios.findByEmail(email).orElseThrow(() -> new NoSuchElementException("Usuario no encontrado."));
        if (usuario.getRol() != Rol.ESTUDIANTE) throw new IllegalArgumentException("La recomendación corresponde a estudiantes.");
        List<FeriaPostulacion> feria = new ArrayList<>();
        for (ConvocatoriaParticipante participante : participantes.findByUsuarioId(usuario.getId())) {
            feria.addAll(postulaciones.findByParticipanteId(participante.getId()));
        }
        feria.addAll(postulaciones.findByCorreoIntegrante(usuario.getEmail()));
        List<RecomendadorBibliotecaService.Contexto> contextos = feria.stream()
                .filter(p -> p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                .filter(p -> p.getConvocatoria().getTipo() == TipoConvocatoria.FERIA)
                .collect(java.util.stream.Collectors.toMap(FeriaPostulacion::getId, p -> p, (a, b) -> a))
                .values().stream()
                .sorted(Comparator.comparing(FeriaPostulacion::getId).reversed())
                .limit(5)
                .map(p -> new RecomendadorBibliotecaService.Contexto(p.getArea(), p.getCategoria(), p.getTema()))
                .toList();
        List<RecomendadorBibliotecaService.Lectura> historial = lecturas.findTop20ByUsuarioIdOrderByUltimoAccesoDesc(usuario.getId())
                .stream()
                .map(l -> new RecomendadorBibliotecaService.Lectura(l.getDocumentoId(), l.getAperturas(), l.getUltimoAcceso()))
                .toList();
        Map<Long, Long> popularidad = new HashMap<>();
        for (Object[] fila : lecturas.contarEstudiantesQueDescargaronPorDocumento())
            popularidad.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
        return recomendador.recomendar(documentos.findByPublicadoTrueOrderByCreadoEnDesc(), contextos, historial, popularidad).stream()
                .map(r -> new RecomendacionDatos(documentoDatos(r.documento()), r.puntaje(), r.motivo())).toList();
    }

    /**
     * Al finalizar una convocatoria o cerrar su evaluación, publica automáticamente en la Biblioteca Virtual
     * únicamente los proyectos cuya entrega corresponda a la ÚLTIMA tarea del ÚLTIMO módulo (presentación final).
     * Los participantes que solo entregaron en módulos previos (proyectos inconclusos) no se publican.
     */
    @Transactional
    public int publicarProyectosFinalizados(Convocatoria convocatoria) {
        if (convocatoria == null || modulos == null || tareas == null || entregas == null) return 0;

        List<Tarea> tareasBiblioteca = tareas.findByConvocatoriaOrderByCreatedAtDesc(convocatoria).stream()
                .filter(Tarea::isPublicarEnBiblioteca)
                .toList();
        if (tareasBiblioteca.isEmpty()) {
            Tarea tareaFinal = obtenerTareaFinal(convocatoria);
            if (tareaFinal != null) {
                tareasBiblioteca = List.of(tareaFinal);
            }
        }
        if (tareasBiblioteca.isEmpty()) return 0;

        BibliotecaCategoria categoriaConv = obtenerOCrearCategoriaConvocatoria(convocatoria.getTipo());
        Set<String> proyectosProcesados = new HashSet<>();
        int publicados = 0;

        for (Tarea tareaFinal : tareasBiblioteca) {
            List<EntregaTarea> entregasFinales = entregas.findByTareaOrderByFechaEntregaDesc(tareaFinal);
            if (entregasFinales.isEmpty()) continue;

            for (EntregaTarea entrega : entregasFinales) {
                if (entrega.getArchivoUrl() == null || entrega.getArchivoUrl().isBlank()) continue;

                String claveProyecto;
                String tituloBase;
                String autorInfo;

                if (entrega.getFeriaPostulacion() != null) {
                    claveProyecto = "FERIA:" + entrega.getFeriaPostulacion().getId();
                    String np = entrega.getFeriaPostulacion().getTema();
                    tituloBase = (np != null && !np.isBlank()) ? np.trim() : Objects.toString(entrega.getNombreEquipo(), "Proyecto de Feria");
                    autorInfo = "Equipo: " + Objects.toString(entrega.getNombreEquipo(), tituloBase);
                } else if (entrega.getGrupo() != null) {
                    claveProyecto = "GRUPO:" + entrega.getGrupo().getId();
                    String ng = entrega.getGrupo().getNombre();
                    tituloBase = (ng != null && !ng.isBlank()) ? ng.trim() + " — " + convocatoria.getTitulo() : convocatoria.getTitulo();
                    autorInfo = "Grupo: " + Objects.toString(ng, "Equipo");
                } else if (entrega.getEstudiante() != null) {
                    claveProyecto = "EST:" + entrega.getEstudiante().getId();
                    String nom = (Objects.toString(entrega.getEstudiante().getNombre(), "") + " " + Objects.toString(entrega.getEstudiante().getApellido(), "")).trim();
                    tituloBase = nom.isBlank() ? convocatoria.getTitulo() : nom + " — " + convocatoria.getTitulo();
                    autorInfo = "Autor: " + (nom.isBlank() ? entrega.getEstudiante().getEmail() : nom);
                } else {
                    continue;
                }

                if (!proyectosProcesados.add(tareaFinal.getId() + ":" + claveProyecto)) continue;

                Path origen = resolverArchivoEntrega(entrega.getArchivoUrl());
                if (origen == null || !Files.isRegularFile(origen)) continue;

                try {
                    byte[] bytes = Files.readAllBytes(origen);
                    boolean pdfValido = bytes.length >= 5 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D'
                            && bytes[3] == 'F' && bytes[4] == '-';

                    String tituloFinal = tituloBase.substring(0, Math.min(tituloBase.length(), 200));
                    String nombreArch = Objects.toString(entrega.getNombreArchivo(), origen.getFileName().toString());
                    if (nombreArch.length() > 255) nombreArch = nombreArch.substring(0, 255);

                    if (documentos.existsByTituloIgnoreCaseAndNombreArchivoIgnoreCase(tituloFinal, nombreArch)) {
                        continue;
                    }

                    String texto;
                    String ext = ".pdf";
                    if (pdfValido) {
                        try (PDDocument pdf = Loader.loadPDF(bytes)) {
                            texto = new PDFTextStripper().getText(pdf);
                        }
                    } else {
                        int dot = nombreArch.lastIndexOf('.');
                        ext = (dot >= 0 && dot < nombreArch.length() - 1) ? nombreArch.substring(dot).toLowerCase(Locale.ROOT) : "";
                        if (ext.equals(".txt") || ext.equals(".md") || ext.equals(".csv")) {
                            texto = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                        } else {
                            texto = String.join(" ",
                                    tituloFinal,
                                    autorInfo,
                                    convocatoria.getTitulo(),
                                    Objects.toString(convocatoria.getDescripcion(), ""),
                                    Objects.toString(tareaFinal.getTitulo(), ""),
                                    Objects.toString(entrega.getComentarioEstudiante(), ""));
                        }
                    }

                    Files.createDirectories(directorio);
                    String rutaDest = UUID.randomUUID() + ext;
                    Files.write(resolver(rutaDest), bytes, StandardOpenOption.CREATE_NEW);

                    BibliotecaDocumento doc = new BibliotecaDocumento();
                    doc.setTitulo(tituloFinal);
                    String desc = "Proyecto culminado en " + convocatoria.getTitulo()
                            + " (" + tareaFinal.getTitulo() + "). " + autorInfo + ".";
                    doc.setDescripcion(desc.substring(0, Math.min(desc.length(), 1000)));
                    doc.setCategoria(categoriaConv);
                    if (entrega.getFeriaPostulacion() != null) {
                        doc.setArea(coincideArea(entrega.getFeriaPostulacion().getArea()));
                        doc.setNivel(coincideNivel(entrega.getFeriaPostulacion().getCategoria()));
                    }
                    doc.setNombreArchivo(nombreArch);
                    doc.setRutaArchivo(rutaDest);
                    doc.setTextoExtraido(texto.substring(0, Math.min(texto.length(), 100_000)));
                    doc.setPublicado(true);
                    documentos.save(doc);
                    publicados++;
                } catch (Exception ignored) {
                }
            }
        }
        return publicados;
    }

    private BibliotecaCategoria obtenerOCrearCategoriaConvocatoria(TipoConvocatoria tipo) {
        String nombre = switch (tipo != null ? tipo : TipoConvocatoria.INVESTIGACION) {
            case FERIA -> "Feria";
            case HACKATHON -> "Hackathon";
            case CONCURSO -> "Concurso";
            case INVESTIGACION -> "Investigación";
        };
        return categorias.findAll().stream()
                .filter(c -> c.getNombre() != null && c.getNombre().equalsIgnoreCase(nombre))
                .findFirst()
                .orElseGet(() -> {
                    BibliotecaCategoria nueva = new BibliotecaCategoria();
                    nueva.setNombre(nombre);
                    nueva.setDescripcion("Proyectos publicados al finalizar actividades de tipo " + nombre + ".");
                    return categorias.save(nueva);
                });
    }

    private Tarea obtenerTareaFinal(Convocatoria convocatoria) {
        List<Modulo> listaModulos = modulos.findByConvocatoriaOrderByOrdenAscCreatedAtAsc(convocatoria);
        for (int i = listaModulos.size() - 1; i >= 0; i--) {
            List<Tarea> tareasMod = listaModulos.get(i).getTareas();
            if (tareasMod != null && !tareasMod.isEmpty()) {
                return tareasMod.stream()
                        .max(Comparator.comparing((Tarea t) -> t.getFechaEntrega() != null ? t.getFechaEntrega() : t.getCreatedAt())
                                .thenComparing(Tarea::getId))
                        .orElse(null);
            }
        }
        List<Tarea> sueltas = tareas.findByConvocatoriaOrderByCreatedAtDesc(convocatoria);
        return sueltas.isEmpty() ? null : sueltas.get(0);
    }

    private Path resolverArchivoEntrega(String archivoUrl) {
        String limpio = archivoUrl.trim();
        int idx = limpio.lastIndexOf("/api/uploads/");
        String nombre = idx >= 0 ? limpio.substring(idx + "/api/uploads/".length()) : limpio;
        nombre = nombre.replace("\\", "/");
        if (nombre.contains("/")) nombre = nombre.substring(nombre.lastIndexOf('/') + 1);
        if (nombre.isBlank() || nombre.contains("..")) return null;
        Path candidato = uploadsRoot.resolve(nombre).normalize();
        return candidato.startsWith(uploadsRoot) ? candidato : null;
    }

    private String coincideArea(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return BibliotecaValores.AREAS.stream().filter(a -> a.equalsIgnoreCase(valor.trim())).findFirst().orElse(null);
    }

    private String coincideNivel(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return BibliotecaValores.NIVELES.stream().filter(n -> n.equalsIgnoreCase(valor.trim())).findFirst().orElse(null);
    }

    private void aplicarDatos(BibliotecaDocumento documento, DocumentoRequest request) {
        documento.setCategoria(request.categoriaId() == null ? null : buscarCategoria(request.categoriaId()));
        documento.setTitulo(obligatorio(request.titulo(), "título", 200));
        documento.setDescripcion(opcional(request.descripcion(), 1000));
        documento.setArea(BibliotecaValores.area(request.area()));
        documento.setNivel(BibliotecaValores.nivel(request.nivel()));
        documento.setPublicado(Boolean.TRUE.equals(request.publicado()));
    }

    private void guardarPdf(BibliotecaDocumento documento, MultipartFile archivo, boolean obligatorio) {
        if (archivo == null || archivo.isEmpty()) {
            if (obligatorio) throw new IllegalArgumentException("Selecciona un PDF.");
            return;
        }
        if (archivo.getSize() > MAX_PDF) throw new IllegalArgumentException("El PDF no puede superar 20 MB.");
        String nombre = Objects.toString(archivo.getOriginalFilename(), "documento.pdf").replace('\\', '/');
        nombre = nombre.substring(nombre.lastIndexOf('/') + 1).replaceAll("[\\r\\n]", "_");
        if (!nombre.toLowerCase(Locale.ROOT).endsWith(".pdf")) throw new IllegalArgumentException("Solo se aceptan archivos PDF.");
        try {
            byte[] bytes = archivo.getBytes();
            if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D'
                    || bytes[3] != 'F' || bytes[4] != '-') throw new IllegalArgumentException("El archivo no es un PDF válido.");
            String texto;
            try (PDDocument pdf = Loader.loadPDF(bytes)) { texto = new PDFTextStripper().getText(pdf); }
            Files.createDirectories(directorio);
            String ruta = UUID.randomUUID() + ".pdf";
            Files.write(resolver(ruta), bytes, StandardOpenOption.CREATE_NEW);
            documento.setNombreArchivo(nombre.substring(0, Math.min(nombre.length(), 255)));
            documento.setRutaArchivo(ruta);
            documento.setTextoExtraido(texto.substring(0, Math.min(texto.length(), 100_000)));
            String nuevo = ruta;
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) borrarSilencioso(nuevo);
                    }
                });
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("No se pudo leer o guardar el PDF.", ex);
        }
    }

    private void guardarPortada(BibliotecaDocumento documento, MultipartFile portada, boolean obligatorio) {
        if (portada == null || portada.isEmpty()) {
            if (obligatorio) throw new IllegalArgumentException("Selecciona una imagen de portada.");
            return;
        }
        if (portada.getSize() > MAX_PORTADA) throw new IllegalArgumentException("La portada no puede superar 5 MB.");
        try {
            byte[] bytes = portada.getBytes();
            String extension;
            if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N'
                    && bytes[3] == 'G' && bytes[4] == 13 && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10) extension = "png";
            else if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                    && (bytes[2] & 0xff) == 0xff) extension = "jpg";
            else if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F'
                    && bytes[3] == 'F' && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') extension = "webp";
            else throw new IllegalArgumentException("La portada debe ser una imagen PNG, JPG o WebP válida.");
            Files.createDirectories(directorio);
            String ruta = UUID.randomUUID() + "." + extension;
            Files.write(resolver(ruta), bytes, StandardOpenOption.CREATE_NEW);
            documento.setRutaPortada(ruta);
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) borrarSilencioso(ruta);
                    }
                });
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("No se pudo guardar la portada.", ex);
        }
    }

    private BibliotecaCategoria buscarCategoria(Long id) {
        if (id == null) throw new IllegalArgumentException("Selecciona una categoría.");
        return categorias.findById(id).orElseThrow(() -> new NoSuchElementException("Categoría no encontrada."));
    }

    private BibliotecaDocumento buscarDocumento(Long id) {
        return documentos.findById(id).orElseThrow(() -> new NoSuchElementException("Documento no encontrado."));
    }

    private Path resolver(String ruta) {
        Path archivo = directorio.resolve(ruta).normalize();
        if (!archivo.startsWith(directorio) || !archivo.getParent().equals(directorio))
            throw new IllegalArgumentException("Ruta de PDF inválida.");
        return archivo;
    }

    private void borrarSilencioso(String ruta) {
        if (ruta == null) return;
        try { Files.deleteIfExists(resolver(ruta)); } catch (IOException ignored) { }
    }

    private void despuesDeConfirmar(Runnable accion) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) { accion.run(); return; }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { accion.run(); }
        });
    }

    private CategoriaDatos categoriaDatos(BibliotecaCategoria c) {
        return new CategoriaDatos(c.getId(), c.getNombre(), c.getDescripcion());
    }

    private DocumentoDatos documentoDatos(BibliotecaDocumento d) {
        return new DocumentoDatos(d.getId(), d.getCategoria() == null ? null : d.getCategoria().getId(),
                d.getCategoria() == null ? null : d.getCategoria().getNombre(), d.getTitulo(),
                d.getDescripcion(), d.getArea(), d.getNivel(), d.getNombreArchivo(), d.getRutaPortada() != null, d.isPublicado(),
                d.getCreadoEn(), d.getActualizadoEn());
    }

    private String obligatorio(String valor, String campo, int maximo) {
        if (valor == null || valor.isBlank()) throw new IllegalArgumentException("Falta " + campo + ".");
        String limpio = valor.trim();
        if (limpio.length() > maximo) throw new IllegalArgumentException("El campo " + campo + " es demasiado largo.");
        return limpio;
    }

    private String opcional(String valor, int maximo) {
        if (valor == null || valor.isBlank()) return null;
        String limpio = valor.trim();
        if (limpio.length() > maximo) throw new IllegalArgumentException("El texto es demasiado largo.");
        return limpio;
    }

    private String normalizar(String valor) {
        return valor == null ? "" : Normalizer.normalize(valor.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }
}
