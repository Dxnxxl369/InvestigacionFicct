package com.ficct.investigacion.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class EvaluacionJuradoService {
    public record Criterio(String id, String texto) {}
    public record Seccion(String id, String titulo, int peso, String indicacion, List<Criterio> criterios) {}
    public record Formulario(String titulo, String subtitulo, List<Seccion> secciones) {}
    public record Respuestas(int formularioRevision, Map<String, String> valores, String comentarios) {}
    public record EvaluacionDatos(Long id, Formulario formulario, Map<String, String> valores,
                                  String comentarios, double notaFinal, LocalDateTime fechaEnvio,
                                  String juradoNombre) {}
    public record GrupoAsignado(Long convocatoriaId, String convocatoriaTitulo, String tipo,
                                 Long proyectoId, String codigo, String nombre, boolean evaluado) {}
    public record EntregaVisible(Long id, String estudiante, String nombreArchivo, String archivoUrl,
                                  String comentario, LocalDateTime fechaEntrega) {}
    public record TareaVisible(Long id, String titulo, String descripcion, List<EntregaVisible> entregas) {}
    public record DetalleGrupo(GrupoAsignado grupo, String materia, String docente,
                               List<TareaVisible> tareas, Formulario formulario, int formularioRevision,
                               EvaluacionDatos evaluacion) {}
    public record CalificacionGrupo(String tipo, Long proyectoId, String codigo, String nombre,
                                    int cantidadEvaluaciones, Double promedio, List<EvaluacionDatos> evaluaciones) {}

    private final UserRepository usuarios;
    private final ConvocatoriaRepository convocatorias;
    private final ConvocatoriaParticipanteRepository participantes;
    private final FeriaPostulacionRepository postulaciones;
    private final GrupoRepository grupos;
    private final TareaRepository tareas;
    private final JuradoAsignacionRepository asignaciones;
    private final FormularioEvaluacionJuradoRepository formularios;
    private final EvaluacionJuradoRepository evaluaciones;
    private final ObjectMapper json;

    public EvaluacionJuradoService(UserRepository usuarios, ConvocatoriaRepository convocatorias,
                                   ConvocatoriaParticipanteRepository participantes,
                                   FeriaPostulacionRepository postulaciones, GrupoRepository grupos,
                                   TareaRepository tareas, JuradoAsignacionRepository asignaciones,
                                   FormularioEvaluacionJuradoRepository formularios,
                                   EvaluacionJuradoRepository evaluaciones, ObjectMapper json) {
        this.usuarios = usuarios;
        this.convocatorias = convocatorias;
        this.participantes = participantes;
        this.postulaciones = postulaciones;
        this.grupos = grupos;
        this.tareas = tareas;
        this.asignaciones = asignaciones;
        this.formularios = formularios;
        this.evaluaciones = evaluaciones;
        this.json = json;
    }

    public static Formulario formularioInicial() {
        return new Formulario("FORMULARIO DE EVALUACIÓN DE PROYECTOS - FICCT", "Gestión Académica",
                List.of(
                    new Seccion("estructura", "ESTRUCTURA/ESTILO DEL DOCUMENTO", 20,
                        "Se evalúan las competencias de organización del documento de investigación.", List.of(
                        new Criterio("indice", "Índice(s) de contenido (índice automático)"),
                        new Criterio("bibliografia", "Bibliografía (estilo APA u otro) y referencias"),
                        new Criterio("organizacion", "Documento organizado por acápites y/o capítulos"),
                        new Criterio("paginas", "Números de páginas, pie de página y/o encabezados"),
                        new Criterio("redaccion", "Redacción y ortografía"))),
                    new Seccion("contenido", "CONTENIDO", 60,
                        "Se evalúan las competencias de escritura y desarrollo estructurado de la propuesta.", List.of(
                        new Criterio("contexto", "Claridad del contexto/antecedentes del problema"),
                        new Criterio("planteamiento", "Claridad de la descripción/planteamiento del problema"),
                        new Criterio("objetivos", "Formulación de objetivos (general y específicos)"),
                        new Criterio("propuesta", "Desarrollo de la propuesta/solución"),
                        new Criterio("marco", "Marco teórico/metodológico"),
                        new Criterio("conclusiones", "Coherencia en las conclusiones y recomendaciones"))),
                    new Seccion("exposicion", "EXPOSICIÓN", 20,
                        "Se evalúan las habilidades de exposición y comunicación del equipo.", List.of(
                        new Criterio("vestuario", "Imagen de vestuario uniforme de expositores"),
                        new Criterio("organizacion_exposicion", "Organización en el desarrollo de la exposición"),
                        new Criterio("argumentos", "Exposición con fundamentos/argumentaciones"),
                        new Criterio("dominio", "Dominio del tema de todos los expositores"),
                        new Criterio("medios", "Uso de medios de exposición (diapositivas, videos, trípticos, banners, libros, revistas y otros recursos)")))
                ));
    }

    private User usuario(String correo) {
        return usuarios.findByEmail(correo).orElseThrow(() -> new AccessDeniedException("Usuario no encontrado."));
    }

    private Convocatoria convocatoria(Long id) {
        return convocatorias.findById(id).orElseThrow(() -> new IllegalArgumentException("Convocatoria no encontrada."));
    }

    private void gestor(Convocatoria convocatoria, User usuario) {
        boolean docente = usuario.getRol() == Rol.DOCENTE && (
                convocatoria.getCreador() != null && usuario.getId().equals(convocatoria.getCreador().getId())
                || participantes.existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(
                    convocatoria.getId(), usuario.getId(), Rol.DOCENTE, EstadoInscripcion.ACEPTADO));
        if (usuario.getRol() != Rol.ADMIN && !docente)
            throw new AccessDeniedException("Solo administradores y docentes de la convocatoria pueden editar el formulario.");
    }

    private String serializar(Object valor) {
        try { return json.writeValueAsString(valor); }
        catch (JsonProcessingException e) { throw new IllegalStateException("No se pudo guardar el formulario.", e); }
    }

    private Formulario leerFormulario(String contenido) {
        try { return json.readValue(contenido, Formulario.class); }
        catch (JsonProcessingException e) { throw new IllegalStateException("El formulario guardado no es válido.", e); }
    }

    private Map<String, String> leerRespuestas(String contenido) {
        try {
            return json.readValue(contenido, new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException e) { throw new IllegalStateException("Las respuestas guardadas no son válidas.", e); }
    }

    private Formulario formulario(Long convocatoriaId) {
        return formularios.findByConvocatoriaId(convocatoriaId)
                .map(f -> leerFormulario(f.getContenidoJson())).orElseGet(EvaluacionJuradoService::formularioInicial);
    }

    @Transactional(readOnly = true)
    public Formulario obtenerFormulario(Long convocatoriaId, String correo) {
        gestor(convocatoria(convocatoriaId), usuario(correo));
        return formulario(convocatoriaId);
    }

    @Transactional
    public Formulario guardarFormulario(Long convocatoriaId, Formulario nuevo, String correo) {
        Convocatoria conv = convocatoria(convocatoriaId);
        gestor(conv, usuario(correo));
        validarFormulario(nuevo);
        FormularioEvaluacionJurado actual = formularios.findByConvocatoriaId(convocatoriaId)
                .orElseGet(() -> new FormularioEvaluacionJurado(conv, ""));
        actual.setContenidoJson(serializar(nuevo));
        actual.incrementarRevision();
        formularios.save(actual);
        return nuevo;
    }

    private void validarFormulario(Formulario form) {
        if (form == null || form.titulo() == null || form.titulo().isBlank() || form.titulo().length() > 250
                || form.secciones() == null || form.secciones().isEmpty() || form.secciones().size() > 12)
            throw new IllegalArgumentException("El formulario requiere título y entre 1 y 12 secciones.");
        Set<String> ids = new HashSet<>();
        int suma = 0;
        for (Seccion s : form.secciones()) {
            if (s == null || s.id() == null || s.id().isBlank() || s.titulo() == null || s.titulo().isBlank()
                    || s.titulo().length() > 180 || s.peso() < 1 || s.peso() > 100
                    || s.indicacion() != null && s.indicacion().length() > 500 || !ids.add(s.id())
                    || s.criterios() == null || s.criterios().isEmpty() || s.criterios().size() > 40)
                throw new IllegalArgumentException("Cada sección requiere título, peso y entre 1 y 40 criterios únicos.");
            suma += s.peso();
            for (Criterio c : s.criterios()) {
                if (c == null || c.id() == null || c.id().isBlank() || !ids.add(c.id())
                        || c.texto() == null || c.texto().isBlank() || c.texto().length() > 500)
                    throw new IllegalArgumentException("Cada criterio requiere un texto e identificador único.");
            }
        }
        if (suma != 100) throw new IllegalArgumentException("Los porcentajes de las secciones deben sumar 100%.");
    }

    private boolean esFeriaGrupal(Convocatoria conv) {
        return conv.getTipo() == TipoConvocatoria.FERIA && conv.getModalidadInscripcion() == ModalidadInscripcion.GRUPAL;
    }

    private String tipo(Convocatoria conv) { return esFeriaGrupal(conv) ? "FERIA" : "GRUPO"; }

    @Transactional(readOnly = true)
    public List<CalificacionGrupo> calificaciones(Long convocatoriaId, String correo) {
        Convocatoria conv = convocatoria(convocatoriaId);
        gestor(conv, usuario(correo));
        Map<String, List<EvaluacionJurado>> porGrupo = new HashMap<>();
        for (EvaluacionJurado evaluacion : evaluaciones.findByConvocatoriaId(convocatoriaId)) {
            // La clave incluye el tipo para no mezclar identificadores de tablas distintas.
            String clave = evaluacion.getTipoProyecto() + ":" + evaluacion.getProyectoId();
            porGrupo.computeIfAbsent(clave, ignored -> new ArrayList<>()).add(evaluacion);
        }
        List<CalificacionGrupo> resultado = new ArrayList<>();
        if (esFeriaGrupal(conv)) {
            for (FeriaPostulacion p : postulaciones.findByConvocatoriaIdOrderByIdAsc(convocatoriaId)) {
                if (p.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) continue;
                resultado.add(calificacionGrupo("FERIA", p.getId(), p.getCodigoEquipo(), p.getTema(), porGrupo));
            }
        } else {
            for (Grupo g : grupos.findByConvocatoriaIdOrderByNombreAsc(convocatoriaId)) {
                resultado.add(calificacionGrupo("GRUPO", g.getId(), g.getNombre(),
                        g.getDescripcion() == null || g.getDescripcion().isBlank() ? g.getNombre() : g.getDescripcion(),
                        porGrupo));
            }
        }
        return resultado;
    }

    private CalificacionGrupo calificacionGrupo(String tipo, Long id, String codigo, String nombre,
                                                Map<String, List<EvaluacionJurado>> porGrupo) {
        List<EvaluacionJurado> encontradas = porGrupo.getOrDefault(tipo + ":" + id, List.of());
        Double promedio = encontradas.isEmpty() ? null : Math.round(
                encontradas.stream().mapToDouble(EvaluacionJurado::getNotaFinal).average().orElse(0) * 100.0) / 100.0;
        return new CalificacionGrupo(tipo, id, codigo, nombre, encontradas.size(), promedio,
                encontradas.stream().map(this::datosEvaluacion).toList());
    }

    private List<GrupoAsignado> proyectos(Convocatoria conv, ConvocatoriaParticipante jurado) {
        List<JuradoAsignacion> filas = asignaciones.findByJuradoId(jurado.getId());
        boolean todos = filas.stream().anyMatch(JuradoAsignacion::isTodos);
        Set<Long> permitidos = new HashSet<>();
        if (esFeriaGrupal(conv)) {
            filas.stream().map(JuradoAsignacion::getFeriaPostulacion).filter(Objects::nonNull)
                    .forEach(p -> permitidos.add(p.getId()));
            return postulaciones.findByConvocatoriaIdOrderByIdAsc(conv.getId()).stream()
                    .filter(p -> p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO
                            && (todos || permitidos.contains(p.getId())))
                    .map(p -> new GrupoAsignado(conv.getId(), conv.getTitulo(), "FERIA", p.getId(),
                            p.getCodigoEquipo(), p.getTema(), evaluado(conv, jurado, "FERIA", p.getId())))
                    .toList();
        }
        filas.stream().map(JuradoAsignacion::getGrupo).filter(Objects::nonNull)
                .forEach(g -> permitidos.add(g.getId()));
        return grupos.findByConvocatoriaIdOrderByNombreAsc(conv.getId()).stream()
                .filter(g -> todos || permitidos.contains(g.getId()))
                .map(g -> new GrupoAsignado(conv.getId(), conv.getTitulo(), "GRUPO", g.getId(),
                        g.getNombre(), g.getDescripcion() == null || g.getDescripcion().isBlank()
                            ? g.getNombre() : g.getDescripcion(), evaluado(conv, jurado, "GRUPO", g.getId())))
                .toList();
    }

    private boolean evaluado(Convocatoria conv, ConvocatoriaParticipante jurado, String tipo, Long id) {
        return evaluaciones.findByConvocatoriaIdAndJuradoUsuarioIdAndTipoProyectoAndProyectoId(
                conv.getId(), jurado.getUsuario().getId(), tipo, id).isPresent();
    }

    private ConvocatoriaParticipante verificarJurado(Convocatoria conv, User usuario) {
        if (usuario.getRol() != Rol.JURADO) throw new AccessDeniedException("Esta vista es exclusiva para jurados.");
        ConvocatoriaParticipante jurado = participantes.findByConvocatoriaIdAndUsuarioId(conv.getId(), usuario.getId())
                .orElseThrow(() -> new AccessDeniedException("No eres jurado de esta convocatoria."));
        if (jurado.getRol() != Rol.JURADO || jurado.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO)
            throw new AccessDeniedException("No eres jurado aceptado de esta convocatoria.");
        return jurado;
    }

    @Transactional(readOnly = true)
    public List<GrupoAsignado> misGrupos(String correo) {
        User user = usuario(correo);
        if (user.getRol() != Rol.JURADO) throw new AccessDeniedException("Esta vista es exclusiva para jurados.");
        List<GrupoAsignado> resultado = new ArrayList<>();
        for (ConvocatoriaParticipante part : participantes.findByUsuarioIdAndEstadoInscripcion(
                user.getId(), EstadoInscripcion.ACEPTADO)) {
            if (part.getRol() == Rol.JURADO) resultado.addAll(proyectos(part.getConvocatoria(), part));
        }
        return resultado;
    }

    private GrupoAsignado verificarProyecto(Convocatoria conv, ConvocatoriaParticipante jurado,
                                             String tipo, Long id) {
        if (!tipo(conv).equals(tipo)) throw new AccessDeniedException("Tipo de grupo inválido.");
        return proyectos(conv, jurado).stream().filter(p -> p.proyectoId().equals(id)).findFirst()
                .orElseThrow(() -> new AccessDeniedException("Este grupo no está asignado al jurado."));
    }

    private EvaluacionDatos datosEvaluacion(EvaluacionJurado e) {
        return new EvaluacionDatos(e.getId(), leerFormulario(e.getFormularioJson()),
                leerRespuestas(e.getRespuestasJson()), e.getComentarios(), e.getNotaFinal(),
                e.getFechaEnvio(), e.getJuradoNombre());
    }

    @Transactional(readOnly = true)
    public DetalleGrupo detalle(Long convocatoriaId, String tipo, Long proyectoId, String correo) {
        Convocatoria conv = convocatoria(convocatoriaId);
        User user = usuario(correo);
        ConvocatoriaParticipante jurado = verificarJurado(conv, user);
        GrupoAsignado grupo = verificarProyecto(conv, jurado, tipo, proyectoId);
        String materia = "";
        String docente = "";
        Set<Long> miembros = new HashSet<>();
        Set<String> correos = new HashSet<>();
        Long postulacionGrupoId = null;
        if ("FERIA".equals(tipo)) {
            FeriaPostulacion p = postulaciones.findById(proyectoId).orElseThrow();
            materia = p.getMateria();
            docente = p.getDocente();
            p.getIntegrantes().forEach(i -> correos.add(i.getCorreo().toLowerCase(Locale.ROOT)));
        } else {
            participantes.findMiembrosPorGrupoId(proyectoId).forEach(p -> miembros.add(p.getUsuario().getId()));
            if (conv.getModalidadInscripcion() == ModalidadInscripcion.GRUPAL) {
                postulacionGrupoId = postulaciones.findByConvocatoriaIdOrderByIdAsc(convocatoriaId).stream()
                        .filter(p -> p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO
                                && p.getCodigoEquipo() != null && p.getCodigoEquipo().equalsIgnoreCase(grupo.codigo()))
                        .map(FeriaPostulacion::getId).findFirst().orElse(null);
            }
        }
        final Long postulacionId = postulacionGrupoId;
        List<TareaVisible> visibles = new ArrayList<>();
        for (Tarea t : tareas.findByConvocatoriaOrderByCreatedAtDesc(conv)) {
            if (!t.isVisibleJurados()) continue;
            List<EntregaVisible> entregas = t.getEntregas().stream()
                    .filter(e -> "FERIA".equals(tipo)
                            ? e.getFeriaPostulacion() != null
                                ? proyectoId.equals(e.getFeriaPostulacion().getId())
                                : correos.contains(e.getEstudiante().getEmail().toLowerCase(Locale.ROOT))
                            : e.getGrupo() != null
                                ? proyectoId.equals(e.getGrupo().getId())
                                : e.getFeriaPostulacion() != null
                                    ? postulacionId != null && postulacionId.equals(e.getFeriaPostulacion().getId())
                                : miembros.contains(e.getEstudiante().getId()))
                    .map(e -> new EntregaVisible(e.getId(), e.getEstudiante().getNombreCompleto(),
                            e.getNombreArchivo(), e.getArchivoUrl(), e.getComentarioEstudiante(), e.getFechaEntrega()))
                    .toList();
            visibles.add(new TareaVisible(t.getId(), t.getTitulo(), t.getDescripcion(), entregas));
        }
        EvaluacionDatos evaluacion = evaluaciones.findByConvocatoriaIdAndJuradoUsuarioIdAndTipoProyectoAndProyectoId(
                convocatoriaId, user.getId(), tipo, proyectoId).map(this::datosEvaluacion).orElse(null);
        return new DetalleGrupo(grupo, materia, docente, visibles, formulario(convocatoriaId),
                revisionFormulario(convocatoriaId), evaluacion);
    }

    private int revisionFormulario(Long convocatoriaId) {
        return formularios.findByConvocatoriaId(convocatoriaId)
                .map(FormularioEvaluacionJurado::getRevision).orElse(0);
    }

    @Transactional
    public EvaluacionDatos enviar(Long convocatoriaId, String tipo, Long proyectoId,
                                   Respuestas respuestas, String correo) {
        Convocatoria conv = convocatoria(convocatoriaId);
        User user = usuario(correo);
        ConvocatoriaParticipante jurado = verificarJurado(conv, user);
        verificarProyecto(conv, jurado, tipo, proyectoId);
        if (evaluaciones.findByConvocatoriaIdAndJuradoUsuarioIdAndTipoProyectoAndProyectoId(
                convocatoriaId, user.getId(), tipo, proyectoId).isPresent())
            throw new IllegalArgumentException("Este grupo ya fue evaluado. La evaluación enviada es de solo lectura.");
        Formulario form = formulario(convocatoriaId);
        if (respuestas == null || respuestas.valores() == null)
            throw new IllegalArgumentException("Debes completar la evaluación.");
        if (respuestas.formularioRevision() != revisionFormulario(convocatoriaId))
            throw new IllegalArgumentException("El formulario cambió. Recarga la página antes de evaluar.");
        Set<String> claves = new HashSet<>();
        double nota = 0;
        for (Seccion seccion : form.secciones()) {
            double suma = 0;
            int aplicables = 0;
            for (Criterio criterio : seccion.criterios()) {
                claves.add(criterio.id());
                String valor = respuestas.valores().get(criterio.id());
                if (valor == null || !Set.of("R", "B", "E", "NA").contains(valor))
                    throw new IllegalArgumentException("Debes marcar R, B, E o NA en todos los criterios.");
                if (!"NA".equals(valor)) {
                    aplicables++;
                    suma += switch (valor) { case "R" -> 1.0; case "B" -> 2.0; default -> 3.0; };
                }
            }
            if (aplicables > 0) nota += seccion.peso() * suma / (3.0 * aplicables);
        }
        if (!claves.equals(respuestas.valores().keySet()))
            throw new IllegalArgumentException("El formulario cambió. Recarga la página antes de evaluar.");
        String comentarios = respuestas.comentarios() == null ? "" : respuestas.comentarios().trim();
        if (comentarios.length() > 5000) throw new IllegalArgumentException("Los comentarios son demasiado largos.");
        EvaluacionJurado guardada = evaluaciones.save(new EvaluacionJurado(conv, user, tipo, proyectoId,
                serializar(form), serializar(respuestas.valores()), comentarios,
                Math.round(nota * 100.0) / 100.0));
        return datosEvaluacion(guardada);
    }
}
