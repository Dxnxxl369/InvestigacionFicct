package com.ficct.investigacion.service;

import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.ConvocatoriaParticipanteRepository;
import com.ficct.investigacion.repository.FeriaPostulacionRepository;
import com.ficct.investigacion.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeriaMembresiaServiceTest {
    @Mock FeriaPostulacionRepository postulaciones;
    @Mock ConvocatoriaParticipanteRepository participantes;
    @Mock UserRepository usuarios;
    @InjectMocks FeriaMembresiaService membresia;

    @Test
    void asignaEquipoAlJefeQueYaTeniaParticipacion() {
        User jefe = new User("Carlos", "Lobo", "carlos@gmail.com", "hash",
                Rol.ESTUDIANTE, EstadoUsuario.ACTIVO);
        jefe.setId(7L);
        Convocatoria convocatoria = mock(Convocatoria.class);
        when(convocatoria.getId()).thenReturn(1L);
        ConvocatoriaParticipante participacion = new ConvocatoriaParticipante(
                convocatoria, jefe, Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO, null, jefe);
        FeriaPostulacion proyecto = new FeriaPostulacion(convocatoria, participacion);
        proyecto.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
        proyecto.setCodigoEquipo("G001");

        when(usuarios.findByEmail(jefe.getEmail())).thenReturn(Optional.of(jefe));
        when(postulaciones.findByCorreoIntegrante(jefe.getEmail())).thenReturn(List.of(proyecto));
        when(participantes.findByConvocatoriaIdAndUsuarioId(1L, 7L))
                .thenReturn(Optional.of(participacion));

        membresia.asociarCorreo(jefe.getEmail());

        assertEquals("G001", participacion.getNombreEquipo());
        verify(participantes).save(participacion);
    }

    @Test
    void conservaTodosLosEquiposAceptadosDeLaMismaPersona() {
        User usuario = new User("Leonardo", "Serrate", "leonardo@gmail.com", "hash",
                Rol.ESTUDIANTE, EstadoUsuario.ACTIVO);
        usuario.setId(8L);
        Convocatoria convocatoria = mock(Convocatoria.class);
        when(convocatoria.getId()).thenReturn(1L);
        ConvocatoriaParticipante participacion = new ConvocatoriaParticipante(
                convocatoria, usuario, Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO, "G002", usuario);
        FeriaPostulacion segundo = new FeriaPostulacion(convocatoria, participacion);
        segundo.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
        segundo.setCodigoEquipo("G002");
        FeriaPostulacion primero = new FeriaPostulacion(convocatoria, participacion);
        primero.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
        primero.setCodigoEquipo("G001");

        when(usuarios.findByEmail(usuario.getEmail())).thenReturn(Optional.of(usuario));
        when(postulaciones.findByCorreoIntegrante(usuario.getEmail()))
                .thenReturn(List.of(segundo, primero));
        when(participantes.findByConvocatoriaIdAndUsuarioId(1L, 8L))
                .thenReturn(Optional.of(participacion));

        membresia.asociarCorreo(usuario.getEmail());

        assertEquals("G001, G002", participacion.getNombreEquipo());
        verify(participantes).save(participacion);
    }
}
