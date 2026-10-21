package com.ficct.investigacion.service;

import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlantillaServiceTest {
    @Mock PlantillaDefinicionRepository plantillas;
    @Mock PlantillaAsignacionRepository asignaciones;
    @Mock PlantillaInicializacionRepository inicializacion;
    @Mock ModuloRepository modulos;
    @Mock TareaRepository tareas;
    @InjectMocks PlantillaService service;

    @Test
    void crearConvocatoriaCopiaPlantillasConfiguradasSinCompartirTareas() {
        PlantillaDefinicion definicion = new PlantillaDefinicion();
        definicion.setTitulo("Entrega personalizada");
        definicion.setDescripcion("Material del proyecto");
        PlantillaActividad actividad = new PlantillaActividad();
        actividad.setPlantilla(definicion);
        actividad.setTitulo("Informe");
        actividad.setDescripcion("Indicaciones para el informe");
        actividad.setTiposArchivosPermitidos(".pdf");
        actividad.setTamanoMaximoMb(20);
        actividad.setPuntajeMaximo(75.0);
        actividad.setVisibleJurados(true);
        actividad.setEntregaGrupal(true);
        actividad.getAdjuntos().add(new AdjuntoTarea("guia.pdf", "/api/uploads/guia.pdf", 123L));
        actividad.getRubrica().add(new PlantillaCriterio("Claridad", "Contenido claro", 25.0));
        definicion.getActividades().add(actividad);
        when(asignaciones.findByTipoOrderByOrdenAsc(TipoConvocatoria.FERIA))
                .thenReturn(List.of(new PlantillaAsignacion(TipoConvocatoria.FERIA, definicion, 1)));
        when(modulos.save(any(Modulo.class))).thenAnswer(call -> call.getArgument(0));
        when(tareas.save(any(Tarea.class))).thenAnswer(call -> call.getArgument(0));
        User creador = new User("Docente", "Prueba", "docente@uagrm.edu.bo", "hash",
                Rol.DOCENTE, EstadoUsuario.ACTIVO);
        Convocatoria convocatoria = new Convocatoria("Feria", "Descripción", TipoConvocatoria.FERIA,
                EstadoConvocatoria.BORRADOR, LocalDate.now().plusDays(10), null, null, creador);
        convocatoria.setModalidadInscripcion(ModalidadInscripcion.GRUPAL);

        service.crearParaConvocatoria(convocatoria, creador);

        ArgumentCaptor<Modulo> modulo = ArgumentCaptor.forClass(Modulo.class);
        ArgumentCaptor<Tarea> tarea = ArgumentCaptor.forClass(Tarea.class);
        verify(modulos).save(modulo.capture());
        verify(tareas).save(tarea.capture());
        assertEquals("Entrega personalizada", modulo.getValue().getTitulo());
        assertEquals("Informe", tarea.getValue().getTitulo());
        assertEquals("Indicaciones para el informe", tarea.getValue().getDescripcion());
        assertEquals(20, tarea.getValue().getTamanoMaximoMb());
        assertEquals(75.0, tarea.getValue().getPuntajeMaximo());
        assertTrue(tarea.getValue().isVisibleJurados());
        assertEquals("guia.pdf", tarea.getValue().getAdjuntos().get(0).getNombre());
        assertEquals("Claridad", tarea.getValue().getRubrica().get(0).getNombre());
        assertTrue(tarea.getValue().isEsGrupal());
        assertFalse(tarea.getValue().isHabilitada());
        assertNull(tarea.getValue().getFechaHabilitacion());
        assertNull(tarea.getValue().getFechaEntrega());

        // Una elección explícita en la plantilla prevalece sobre la inscripción grupal.
        clearInvocations(modulos, tareas);
        actividad.setEntregaGrupal(false);
        service.crearParaConvocatoria(convocatoria, creador);
        ArgumentCaptor<Tarea> individual = ArgumentCaptor.forClass(Tarea.class);
        verify(tareas).save(individual.capture());
        assertFalse(individual.getValue().isEsGrupal());

        clearInvocations(modulos, tareas);
        actividad.setEntregaGrupal(true);
        convocatoria.setModalidadInscripcion(ModalidadInscripcion.INDIVIDUAL);
        service.crearParaConvocatoria(convocatoria, creador);
        ArgumentCaptor<Tarea> grupal = ArgumentCaptor.forClass(Tarea.class);
        verify(tareas).save(grupal.capture());
        assertTrue(grupal.getValue().isEsGrupal());
    }

    @Test
    void eliminarPlantillaRetiraAsignacionesSinBorrarModulosDeConvocatorias() {
        PlantillaDefinicion definicion = new PlantillaDefinicion();
        when(plantillas.findById(7L)).thenReturn(Optional.of(definicion));

        service.eliminar(7L);

        var orden = inOrder(asignaciones, plantillas);
        orden.verify(asignaciones).deleteByPlantilla(definicion);
        orden.verify(asignaciones).flush();
        orden.verify(plantillas).delete(definicion);
        verifyNoInteractions(modulos, tareas);
    }

    @Test
    void cambiarTipoAceptaDejarloSinPlantillas() {
        var resultado = service.configurarTipo(TipoConvocatoria.CONCURSO,
                new PlantillaService.AsignacionDatos(List.of()));
        assertTrue(resultado.plantillaIds().isEmpty());
        verify(asignaciones).deleteByTipo(TipoConvocatoria.CONCURSO);
        verify(asignaciones).flush();
        verify(asignaciones, never()).save(any());
    }
}
