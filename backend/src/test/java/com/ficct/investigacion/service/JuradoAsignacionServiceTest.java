package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.CrearJuradoRequest;
import com.ficct.investigacion.dto.JuradoAsignacionRequest;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JuradoAsignacionServiceTest {
    @Mock ConvocatoriaRepository convocatorias;
    @Mock ConvocatoriaParticipanteRepository participantes;
    @Mock UserRepository usuarios;
    @Mock FeriaPostulacionRepository postulaciones;
    @Mock GrupoRepository grupos;
    @Mock JuradoAsignacionRepository asignaciones;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks JuradoAsignacionService service;

    private Convocatoria convocatoria;
    private ConvocatoriaParticipante jurado;

    @BeforeEach
    void preparar() {
        User admin = new User("Admin", "FICCT", "admin@gmail.com", "hash", Rol.ADMIN, EstadoUsuario.ACTIVO);
        admin.setId(1L);
        User evaluador = new User("Ana", "Pérez", "ana@gmail.com", "hash", Rol.JURADO, EstadoUsuario.ACTIVO);
        evaluador.setId(2L);
        convocatoria = new Convocatoria("Feria", "Proyectos", TipoConvocatoria.FERIA,
                EstadoConvocatoria.PUBLICADA, null, null, null, admin);
        convocatoria.setId(10L);
        jurado = new ConvocatoriaParticipante(convocatoria, evaluador, Rol.JURADO,
                EstadoInscripcion.ACEPTADO, null, admin);
        jurado.setId(20L);
    }

    private void prepararGestor() {
        when(usuarios.findByEmail("admin@gmail.com")).thenReturn(Optional.of(convocatoria.getCreador()));
        when(convocatorias.findById(10L)).thenReturn(Optional.of(convocatoria));
    }

    @Test
    void juradoNuevoComienzaSinProyectos() {
        prepararGestor();
        when(participantes.findByConvocatoriaIdAndRolAndEstadoInscripcion(
                10L, Rol.JURADO, EstadoInscripcion.ACEPTADO)).thenReturn(List.of(jurado));

        var respuesta = service.listar(10L, "admin@gmail.com");

        assertEquals(1, respuesta.jurados().size());
        assertFalse(respuesta.jurados().get(0).todos());
        assertTrue(respuesta.jurados().get(0).proyectoIds().isEmpty());
    }

    @Test
    void crearJuradoRegistraCuentaYLoAnadeSinProyectos() {
        prepararGestor();
        when(passwordEncoder.encode("ClaveSegura.1")).thenReturn("hash-seguro");
        when(usuarios.save(any(User.class))).thenAnswer(invocation -> {
            User creado = invocation.getArgument(0);
            creado.setId(31L);
            return creado;
        });
        when(participantes.save(any(ConvocatoriaParticipante.class))).thenAnswer(invocation -> {
            ConvocatoriaParticipante creado = invocation.getArgument(0);
            creado.setId(41L);
            return creado;
        });

        var respuesta = service.crearYAnadir(10L,
                new CrearJuradoRequest(" Ana ", " Pérez ", " ANA@gmail.com ", "ClaveSegura.1"),
                "admin@gmail.com");

        ArgumentCaptor<User> usuario = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<ConvocatoriaParticipante> miembro = ArgumentCaptor.forClass(ConvocatoriaParticipante.class);
        verify(usuarios).save(usuario.capture());
        verify(participantes).save(miembro.capture());
        assertEquals("ana@gmail.com", usuario.getValue().getEmail());
        assertEquals("hash-seguro", usuario.getValue().getPassword());
        assertEquals(Rol.JURADO, usuario.getValue().getRol());
        assertEquals(Rol.JURADO, miembro.getValue().getRol());
        assertEquals(EstadoInscripcion.ACEPTADO, miembro.getValue().getEstadoInscripcion());
        assertEquals(41L, respuesta.participanteId());
        assertFalse(respuesta.todos());
        assertTrue(respuesta.proyectoIds().isEmpty());
    }

    @Test
    void correoExistenteNoCreaOtraCuenta() {
        prepararGestor();
        when(usuarios.existsByEmail("ana@gmail.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> service.crearYAnadir(10L,
                new CrearJuradoRequest("Ana", "Pérez", "ana@gmail.com", "ClaveSegura.1"),
                "admin@gmail.com"));

        verify(usuarios, never()).save(any(User.class));
        verify(participantes, never()).save(any(ConvocatoriaParticipante.class));
    }

    @Test
    void asignarTodosGuardaAlcanceDinamico() {
        prepararGestor();
        when(participantes.findById(20L)).thenReturn(Optional.of(jurado));

        service.guardar(10L, 20L, new JuradoAsignacionRequest(true, List.of()), "admin@gmail.com");

        ArgumentCaptor<List<JuradoAsignacion>> captor = ArgumentCaptor.forClass(List.class);
        verify(asignaciones).saveAll(captor.capture());
        assertEquals(1, captor.getValue().size());
        assertTrue(captor.getValue().get(0).isTodos());
        verify(asignaciones).deleteByJuradoId(20L);
    }

    @Test
    void asignaSoloLosProyectosSeleccionados() {
        prepararGestor();
        when(participantes.findById(20L)).thenReturn(Optional.of(jurado));
        for (long id : List.of(50L, 51L)) {
            FeriaPostulacion proyecto = mock(FeriaPostulacion.class);
            when(proyecto.getConvocatoria()).thenReturn(convocatoria);
            when(proyecto.getEstadoInscripcion()).thenReturn(EstadoInscripcion.ACEPTADO);
            when(postulaciones.findById(id)).thenReturn(Optional.of(proyecto));
        }

        service.guardar(10L, 20L, new JuradoAsignacionRequest(false, List.of(50L, 51L, 50L)),
                "admin@gmail.com");

        ArgumentCaptor<List<JuradoAsignacion>> captor = ArgumentCaptor.forClass(List.class);
        verify(asignaciones).saveAll(captor.capture());
        assertEquals(2, captor.getValue().size());
        assertTrue(captor.getValue().stream().noneMatch(JuradoAsignacion::isTodos));
        assertTrue(captor.getValue().stream().allMatch(a -> a.getFeriaPostulacion() != null));
    }

    @Test
    void rechazaProyectoDeOtraConvocatoriaSinBorrarAsignacionAnterior() {
        prepararGestor();
        when(participantes.findById(20L)).thenReturn(Optional.of(jurado));
        Convocatoria ajena = new Convocatoria();
        ajena.setId(99L);
        FeriaPostulacion proyectoAjeno = new FeriaPostulacion(ajena, jurado);
        when(postulaciones.findById(50L)).thenReturn(Optional.of(proyectoAjeno));

        assertThrows(IllegalArgumentException.class, () -> service.guardar(
                10L, 20L, new JuradoAsignacionRequest(false, List.of(50L)), "admin@gmail.com"));
        verify(asignaciones, never()).deleteByJuradoId(any());
    }

    @Test
    void estudianteNoPuedeGestionarJurados() {
        User estudiante = new User("Eva", "Uno", "eva@gmail.com", "hash", Rol.ESTUDIANTE, EstadoUsuario.ACTIVO);
        when(usuarios.findByEmail("eva@gmail.com")).thenReturn(Optional.of(estudiante));
        when(convocatorias.findById(10L)).thenReturn(Optional.of(convocatoria));

        assertThrows(AccessDeniedException.class, () -> service.listar(10L, "eva@gmail.com"));
    }

    @Test
    void soloPuedeRevisarEntregasDeProyectosAsignadosYVisibles() {
        Tarea tarea = new Tarea(convocatoria, "Documento final", "", null, null,
                null, true, ".pdf", 15, 100.0, convocatoria.getCreador());
        tarea.setVisibleJurados(true);
        FeriaPostulacion proyecto = new FeriaPostulacion(convocatoria, jurado);
        EntregaTarea entrega = new EntregaTarea(tarea, jurado.getUsuario(), null,
                "documento.pdf", "/archivo", null);
        entrega.setFeriaPostulacion(proyecto);
        when(participantes.findByConvocatoriaIdAndUsuarioId(10L, 2L)).thenReturn(Optional.of(jurado));

        assertFalse(service.puedeRevisar(jurado.getUsuario(), entrega));
        when(asignaciones.findByJuradoId(20L)).thenReturn(List.of(
                new JuradoAsignacion(convocatoria, jurado, true, null, null)));
        assertTrue(service.puedeRevisar(jurado.getUsuario(), entrega));
        tarea.setVisibleJurados(false);
        assertFalse(service.puedeRevisar(jurado.getUsuario(), entrega));
    }
}
