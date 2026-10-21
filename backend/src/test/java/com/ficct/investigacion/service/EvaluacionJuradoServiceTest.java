package com.ficct.investigacion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EvaluacionJuradoServiceTest {
    @Mock UserRepository usuarios;
    @Mock ConvocatoriaRepository convocatorias;
    @Mock ConvocatoriaParticipanteRepository participantes;
    @Mock FeriaPostulacionRepository postulaciones;
    @Mock GrupoRepository grupos;
    @Mock TareaRepository tareas;
    @Mock JuradoAsignacionRepository asignaciones;
    @Mock FormularioEvaluacionJuradoRepository formularios;
    @Mock EvaluacionJuradoRepository evaluaciones;
    @Spy ObjectMapper json = new ObjectMapper();
    @InjectMocks EvaluacionJuradoService service;

    private User jurado;
    private Convocatoria convocatoria;
    private ConvocatoriaParticipante participacion;
    private FeriaPostulacion proyecto;

    @BeforeEach
    void preparar() {
        jurado = new User("Ana", "Pérez", "ana@gmail.com", "hash", Rol.JURADO, EstadoUsuario.ACTIVO);
        ReflectionTestUtils.setField(jurado, "id", 7L);
        convocatoria = new Convocatoria("Feria", "Descripción", TipoConvocatoria.FERIA,
                EstadoConvocatoria.PUBLICADA, LocalDate.now().plusDays(10), null, null, jurado);
        ReflectionTestUtils.setField(convocatoria, "id", 3L);
        convocatoria.setModalidadInscripcion(ModalidadInscripcion.GRUPAL);
        participacion = new ConvocatoriaParticipante(convocatoria, jurado, Rol.JURADO,
                EstadoInscripcion.ACEPTADO, null, jurado);
        ReflectionTestUtils.setField(participacion, "id", 11L);
        proyecto = new FeriaPostulacion(convocatoria, participacion);
        ReflectionTestUtils.setField(proyecto, "id", 21L);
        proyecto.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
        proyecto.setCodigoEquipo("G001");
        proyecto.setTema("Proyecto de prueba");
        when(usuarios.findByEmail(jurado.getEmail())).thenReturn(Optional.of(jurado));
        when(convocatorias.findById(3L)).thenReturn(Optional.of(convocatoria));
        when(participantes.findByConvocatoriaIdAndUsuarioId(3L, 7L)).thenReturn(Optional.of(participacion));
    }

    @Test
    void soloElProyectoAsignadoPuedeEvaluarseYLaNotaSeGuardaPorJurado() {
        when(asignaciones.findByJuradoId(11L)).thenReturn(List.of(
                new JuradoAsignacion(convocatoria, participacion, false, proyecto, null)));
        when(postulaciones.findByConvocatoriaIdOrderByIdAsc(3L)).thenReturn(List.of(proyecto));
        when(evaluaciones.findByConvocatoriaIdAndJuradoUsuarioIdAndTipoProyectoAndProyectoId(
                3L, 7L, "FERIA", 21L)).thenReturn(Optional.empty());
        when(formularios.findByConvocatoriaId(3L)).thenReturn(Optional.empty());
        when(evaluaciones.save(any(EvaluacionJurado.class))).thenAnswer(call -> call.getArgument(0));

        var valores = EvaluacionJuradoService.formularioInicial().secciones().stream()
                .flatMap(s -> s.criterios().stream())
                .collect(Collectors.toMap(EvaluacionJuradoService.Criterio::id, c -> "E"));
        var resultado = service.enviar(3L, "FERIA", 21L,
                new EvaluacionJuradoService.Respuestas(0, valores, "Buen proyecto"), jurado.getEmail());

        assertEquals(100.0, resultado.notaFinal());
        assertEquals("Buen proyecto", resultado.comentarios());
        assertEquals("Ana Pérez", resultado.juradoNombre());
        verify(evaluaciones).save(any(EvaluacionJurado.class));
    }

    @Test
    void juradoSinAsignacionNoPuedeAbrirElGrupo() {
        when(asignaciones.findByJuradoId(11L)).thenReturn(List.of());
        when(postulaciones.findByConvocatoriaIdOrderByIdAsc(3L)).thenReturn(List.of(proyecto));
        assertThrows(AccessDeniedException.class,
                () -> service.detalle(3L, "FERIA", 21L, jurado.getEmail()));
        verifyNoInteractions(tareas, evaluaciones);
    }
}
