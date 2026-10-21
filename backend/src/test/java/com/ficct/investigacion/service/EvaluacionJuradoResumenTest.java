package com.ficct.investigacion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EvaluacionJuradoResumenTest {
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

    @Test
    void promedioAgrupaTodasLasNotasPorProyectoYConservaLosFormularios() throws Exception {
        User admin = new User("Admin", "", "admin@gmail.com", "hash", Rol.ADMIN, EstadoUsuario.ACTIVO);
        Convocatoria conv = new Convocatoria("Feria", "Descripción", TipoConvocatoria.FERIA,
                EstadoConvocatoria.PUBLICADA, LocalDate.now().plusDays(5), null, null, admin);
        ReflectionTestUtils.setField(conv, "id", 4L);
        conv.setModalidadInscripcion(ModalidadInscripcion.GRUPAL);
        ConvocatoriaParticipante jefe = new ConvocatoriaParticipante(conv, admin, Rol.ESTUDIANTE,
                EstadoInscripcion.ACEPTADO, null, admin);
        FeriaPostulacion p = new FeriaPostulacion(conv, jefe);
        ReflectionTestUtils.setField(p, "id", 15L);
        p.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
        p.setCodigoEquipo("G001");
        p.setTema("Proyecto");
        String form = json.writeValueAsString(EvaluacionJuradoService.formularioInicial());
        EvaluacionJurado e1 = mock(EvaluacionJurado.class);
        EvaluacionJurado e2 = mock(EvaluacionJurado.class);
        when(e1.getTipoProyecto()).thenReturn("FERIA"); when(e2.getTipoProyecto()).thenReturn("FERIA");
        when(e1.getProyectoId()).thenReturn(15L); when(e2.getProyectoId()).thenReturn(15L);
        when(e1.getNotaFinal()).thenReturn(60.0); when(e2.getNotaFinal()).thenReturn(90.0);
        when(e1.getFormularioJson()).thenReturn(form); when(e2.getFormularioJson()).thenReturn(form);
        when(e1.getRespuestasJson()).thenReturn("{}"); when(e2.getRespuestasJson()).thenReturn("{}");
        when(e1.getFechaEnvio()).thenReturn(LocalDateTime.now());
        when(e2.getFechaEnvio()).thenReturn(LocalDateTime.now());
        when(usuarios.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(convocatorias.findById(4L)).thenReturn(Optional.of(conv));
        when(evaluaciones.findByConvocatoriaId(4L)).thenReturn(List.of(e1, e2));
        when(postulaciones.findByConvocatoriaIdOrderByIdAsc(4L)).thenReturn(List.of(p));

        var resumen = service.calificaciones(4L, admin.getEmail());

        assertEquals(1, resumen.size());
        assertEquals("G001", resumen.get(0).codigo());
        assertEquals(2, resumen.get(0).cantidadEvaluaciones());
        assertEquals(75.0, resumen.get(0).promedio());
        assertEquals(2, resumen.get(0).evaluaciones().size());
    }
}
