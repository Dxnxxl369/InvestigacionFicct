package com.ficct.investigacion.service;

import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.springframework.context.event.EventListener;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class PlantillaService {
    private final PlantillaDefinicionRepository plantillas;
    private final PlantillaAsignacionRepository asignaciones;
    private final PlantillaInicializacionRepository inicializacion;
    private final ModuloRepository modulos;
    private final TareaRepository tareas;

    public PlantillaService(PlantillaDefinicionRepository plantillas,
                           PlantillaAsignacionRepository asignaciones,
                           PlantillaInicializacionRepository inicializacion,
                           ModuloRepository modulos, TareaRepository tareas) {
        this.plantillas = plantillas;
        this.asignaciones = asignaciones;
        this.inicializacion = inicializacion;
        this.modulos = modulos;
        this.tareas = tareas;
    }

    public record AdjuntoDatos(String nombre, String ruta, Long tamanoBytes) {}
    public record CriterioDatos(String nombre, String descripcion, Double puntajeMaximo) {}
    public record ActividadDatos(Long id, String titulo, String descripcion,
                                 String tiposArchivosPermitidos, Integer tamanoMaximoMb,
                                 Double puntajeMaximo, boolean visibleJurados, boolean entregaGrupal,
                                 List<AdjuntoDatos> adjuntos, List<CriterioDatos> rubrica) {}
    public record PlantillaDatos(Long id, String titulo, String descripcion,
                                 List<ActividadDatos> actividades) {}
    public record TipoDatos(TipoConvocatoria tipo, List<Long> plantillaIds) {}
    public record AsignacionDatos(List<Long> plantillaIds) {}

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void inicializar() {
        if (!inicializacion.existsById(1)) {
        EnumMap<PlantillaModulo, PlantillaDefinicion> creadas = new EnumMap<>(PlantillaModulo.class);
        for (PlantillaModulo base : PlantillaModulo.values()) {
            PlantillaDefinicion definicion = new PlantillaDefinicion();
            definicion.setTitulo(base.titulo());
            definicion.setDescripcion(base.descripcion());
            int orden = 0;
            for (PlantillaModulo.Actividad actividad : base.actividades()) {
                PlantillaActividad nueva = new PlantillaActividad();
                nueva.setPlantilla(definicion);
                nueva.setOrden(++orden);
                nueva.setTitulo(actividad.titulo());
                nueva.setDescripcion("Fecha de inicio y fecha de entrega por definir.");
                nueva.setTiposArchivosPermitidos(actividad.extensiones());
                nueva.setTamanoMaximoMb(15);
                nueva.setPuntajeMaximo(100.0);
                nueva.setVisibleJurados(actividad.visibleJurados());
                nueva.setEntregaGrupal(base != PlantillaModulo.ACTIVIDADES);
                definicion.getActividades().add(nueva);
            }
            creadas.put(base, plantillas.save(definicion));
        }
        asignaciones.save(new PlantillaAsignacion(TipoConvocatoria.FERIA, creadas.get(PlantillaModulo.PRIMER_AVANCE), 1));
        asignaciones.save(new PlantillaAsignacion(TipoConvocatoria.FERIA, creadas.get(PlantillaModulo.SEGUNDO_AVANCE), 2));
        asignaciones.save(new PlantillaAsignacion(TipoConvocatoria.FERIA, creadas.get(PlantillaModulo.PRESENTACION_FINAL), 3));
        for (TipoConvocatoria tipo : List.of(TipoConvocatoria.HACKATHON,
                TipoConvocatoria.CONCURSO, TipoConvocatoria.INVESTIGACION)) {
            asignaciones.save(new PlantillaAsignacion(tipo, creadas.get(PlantillaModulo.ACTIVIDADES), 1));
        }
        inicializacion.save(new PlantillaInicializacion(1));
        }
        // Migración única para plantillas creadas antes de configurar la entrega por tarea.
        if (!inicializacion.existsById(2)) {
            Set<Long> feriaIds = new HashSet<>();
            for (PlantillaAsignacion asignacion : asignaciones.findByTipoOrderByOrdenAsc(TipoConvocatoria.FERIA)) {
                feriaIds.add(asignacion.getPlantilla().getId());
            }
            for (PlantillaDefinicion plantilla : plantillas.findAll()) {
                for (PlantillaActividad actividad : plantilla.getActividades()) {
                    if (actividad.getEntregaGrupal() == null) {
                        actividad.setEntregaGrupal(feriaIds.contains(plantilla.getId()));
                    }
                }
            }
            inicializacion.save(new PlantillaInicializacion(2));
        }
    }

    @Transactional(readOnly = true)
    public List<PlantillaDatos> listar() {
        return plantillas.findAll().stream().sorted(Comparator.comparing(PlantillaDefinicion::getId))
                .map(this::toDatos).toList();
    }

    @Transactional(readOnly = true)
    public List<TipoDatos> configuracionTipos() {
        return Arrays.stream(TipoConvocatoria.values())
                .map(tipo -> new TipoDatos(tipo, asignaciones.findByTipoOrderByOrdenAsc(tipo)
                        .stream().map(a -> a.getPlantilla().getId()).toList())).toList();
    }

    @Transactional
    public PlantillaDatos crear(PlantillaDatos datos) {
        PlantillaDefinicion plantilla = new PlantillaDefinicion();
        aplicar(plantilla, datos);
        return toDatos(plantillas.save(plantilla));
    }

    @Transactional
    public PlantillaDatos actualizar(Long id, PlantillaDatos datos) {
        PlantillaDefinicion plantilla = obtener(id);
        aplicar(plantilla, datos);
        return toDatos(plantillas.save(plantilla));
    }

    @Transactional
    public void eliminar(Long id) {
        PlantillaDefinicion plantilla = obtener(id);
        asignaciones.deleteByPlantilla(plantilla);
        asignaciones.flush();
        plantillas.delete(plantilla);
    }

    @Transactional
    public TipoDatos configurarTipo(TipoConvocatoria tipo, AsignacionDatos datos) {
        List<Long> ids = datos.plantillaIds() == null ? List.of() : datos.plantillaIds();
        if (new HashSet<>(ids).size() != ids.size())
            throw new IllegalArgumentException("No se puede repetir una plantilla en el mismo tipo.");
        List<PlantillaDefinicion> seleccionadas = ids.stream().map(this::obtener).toList();
        asignaciones.deleteByTipo(tipo);
        asignaciones.flush();
        for (int i = 0; i < seleccionadas.size(); i++) {
            asignaciones.save(new PlantillaAsignacion(tipo, seleccionadas.get(i), i + 1));
        }
        return new TipoDatos(tipo, ids);
    }

    @Transactional
    public void crearParaConvocatoria(Convocatoria convocatoria, User creador) {
        for (PlantillaAsignacion asignacion : asignaciones.findByTipoOrderByOrdenAsc(convocatoria.getTipo())) {
            crearModulo(convocatoria, creador, asignacion.getPlantilla(), asignacion.getOrden());
        }
    }

    @Transactional
    public Modulo crearModulo(Convocatoria convocatoria, User creador, Long plantillaId, int orden) {
        return crearModulo(convocatoria, creador, obtener(plantillaId), orden);
    }

    private Modulo crearModulo(Convocatoria convocatoria, User creador,
                              PlantillaDefinicion plantilla, int orden) {
        Modulo modulo = modulos.save(new Modulo(convocatoria, plantilla.getTitulo(),
                plantilla.getDescripcion(), null, orden, true));
        for (PlantillaActividad actividad : plantilla.getActividades()) {
            Tarea tarea = new Tarea(convocatoria, actividad.getTitulo(), actividad.getDescripcion(),
                    null, null, null, false, actividad.getTiposArchivosPermitidos(),
                    actividad.getTamanoMaximoMb(), actividad.getPuntajeMaximo(), creador);
            tarea.setModulo(modulo);
            tarea.setPlantillaModulo(true);
            tarea.setVisibleJurados(actividad.isVisibleJurados());
            for (AdjuntoTarea adjunto : actividad.getAdjuntos()) {
                tarea.getAdjuntos().add(new AdjuntoTarea(adjunto.getNombre(), adjunto.getRuta(), adjunto.getTamanoBytes()));
            }
            for (int i = 0; i < actividad.getRubrica().size(); i++) {
                PlantillaCriterio criterio = actividad.getRubrica().get(i);
                tarea.getRubrica().add(new RubricaCriterio(tarea, criterio.getNombre(),
                        criterio.getDescripcion(), criterio.getPuntajeMaximo(), i));
            }
            if (Boolean.TRUE.equals(actividad.getEntregaGrupal())) {
                tarea.setPlantillaFeria(convocatoria.getTipo() == TipoConvocatoria.FERIA);
                tarea.setEsGrupal(true);
            }
            tareas.save(tarea);
        }
        return modulo;
    }

    private PlantillaDefinicion obtener(Long id) {
        if (id == null) throw new IllegalArgumentException("Debe seleccionar una plantilla.");
        return plantillas.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Plantilla no encontrada: " + id));
    }

    private void aplicar(PlantillaDefinicion plantilla, PlantillaDatos datos) {
        if (datos == null || datos.titulo() == null || datos.titulo().isBlank())
            throw new IllegalArgumentException("El nombre de la plantilla es obligatorio.");
        if (datos.titulo().trim().length() > 180)
            throw new IllegalArgumentException("El nombre de la plantilla es demasiado largo.");
        if (datos.actividades() == null || datos.actividades().isEmpty())
            throw new IllegalArgumentException("La plantilla debe incluir al menos una tarea.");
        plantilla.setTitulo(datos.titulo().trim());
        plantilla.setDescripcion(datos.descripcion() == null ? "" : datos.descripcion().trim());
        plantilla.getActividades().clear();
        int orden = 0;
        for (ActividadDatos datosActividad : datos.actividades()) {
            if (datosActividad == null || datosActividad.titulo() == null || datosActividad.titulo().isBlank())
                throw new IllegalArgumentException("Todas las tareas deben tener un nombre.");
            if (datosActividad.titulo().trim().length() > 180)
                throw new IllegalArgumentException("El nombre de una tarea es demasiado largo.");
            if (datosActividad.tiposArchivosPermitidos() != null
                    && datosActividad.tiposArchivosPermitidos().length() > 150)
                throw new IllegalArgumentException("La lista de formatos permitidos es demasiado larga.");
            if (datosActividad.tamanoMaximoMb() != null && datosActividad.tamanoMaximoMb() < 1)
                throw new IllegalArgumentException("El tamaño máximo debe ser mayor que cero.");
            if (datosActividad.puntajeMaximo() != null && datosActividad.puntajeMaximo() < 0)
                throw new IllegalArgumentException("El puntaje máximo no puede ser negativo.");
            PlantillaActividad actividad = new PlantillaActividad();
            actividad.setPlantilla(plantilla);
            actividad.setOrden(++orden);
            actividad.setTitulo(datosActividad.titulo().trim());
            actividad.setDescripcion(datosActividad.descripcion() == null ? "" : datosActividad.descripcion().trim());
            actividad.setTiposArchivosPermitidos(datosActividad.tiposArchivosPermitidos() == null
                    ? ".pdf, .docx" : datosActividad.tiposArchivosPermitidos().trim());
            actividad.setTamanoMaximoMb(datosActividad.tamanoMaximoMb() == null ? 15 : datosActividad.tamanoMaximoMb());
            actividad.setPuntajeMaximo(datosActividad.puntajeMaximo() == null ? 100.0 : datosActividad.puntajeMaximo());
            actividad.setVisibleJurados(datosActividad.visibleJurados());
            actividad.setEntregaGrupal(datosActividad.entregaGrupal());
            for (AdjuntoDatos adjunto : datosActividad.adjuntos() == null
                    ? List.<AdjuntoDatos>of() : datosActividad.adjuntos()) {
                if (adjunto == null || adjunto.nombre() == null || adjunto.nombre().isBlank()
                        || adjunto.ruta() == null || adjunto.ruta().isBlank())
                    throw new IllegalArgumentException("Los adjuntos deben tener nombre y archivo.");
                actividad.getAdjuntos().add(new AdjuntoTarea(adjunto.nombre(), adjunto.ruta(), adjunto.tamanoBytes()));
            }
            double sumaRubrica = 0;
            for (CriterioDatos criterio : datosActividad.rubrica() == null
                    ? List.<CriterioDatos>of() : datosActividad.rubrica()) {
                if (criterio == null || criterio.nombre() == null || criterio.nombre().isBlank()
                        || criterio.puntajeMaximo() == null || criterio.puntajeMaximo() < 0)
                    throw new IllegalArgumentException("Cada criterio requiere nombre y puntaje válido.");
                sumaRubrica += criterio.puntajeMaximo();
                actividad.getRubrica().add(new PlantillaCriterio(criterio.nombre().trim(),
                        criterio.descripcion() == null ? "" : criterio.descripcion().trim(),
                        criterio.puntajeMaximo()));
            }
            if (sumaRubrica > actividad.getPuntajeMaximo())
                throw new IllegalArgumentException("La suma de la rúbrica supera el puntaje máximo de la tarea.");
            plantilla.getActividades().add(actividad);
        }
    }

    private PlantillaDatos toDatos(PlantillaDefinicion plantilla) {
        return new PlantillaDatos(plantilla.getId(), plantilla.getTitulo(), plantilla.getDescripcion(),
                plantilla.getActividades().stream().map(a -> new ActividadDatos(a.getId(), a.getTitulo(),
                        a.getDescripcion(), a.getTiposArchivosPermitidos(), a.getTamanoMaximoMb(),
                        a.getPuntajeMaximo(), a.isVisibleJurados(), Boolean.TRUE.equals(a.getEntregaGrupal()),
                        a.getAdjuntos().stream().map(ad -> new AdjuntoDatos(ad.getNombre(), ad.getRuta(), ad.getTamanoBytes())).toList(),
                        a.getRubrica().stream().map(c -> new CriterioDatos(c.getNombre(), c.getDescripcion(), c.getPuntajeMaximo())).toList())).toList());
    }
}
