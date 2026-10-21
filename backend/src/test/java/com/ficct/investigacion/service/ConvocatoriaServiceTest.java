package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.dto.ConvocatoriaRequest;
import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.ConvocatoriaRepository;
import com.ficct.investigacion.repository.ConvocatoriaParticipanteRepository;
import com.ficct.investigacion.repository.UserRepository;
import com.ficct.investigacion.repository.ModuloRepository;
import com.ficct.investigacion.repository.TareaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
class ConvocatoriaServiceTest {

    @Mock
    private ConvocatoriaRepository convocatoriaRepository;

    @Mock
    private ConvocatoriaParticipanteRepository participanteRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ModuloRepository moduloRepository;

    @Mock
    private TareaRepository tareaRepository;

    @Mock
    private PlantillaService plantillaService;

    @InjectMocks
    private ConvocatoriaService convocatoriaService;

    private User docUser;
    private Convocatoria sampleConv;

    @BeforeEach
    void setUp() {
        docUser = new User("Rolando", "Martínez", "rmartinez@uagrm.edu.bo", "pass", Rol.DOCENTE, EstadoUsuario.ACTIVO);
        docUser.setId(2L);

        sampleConv = new Convocatoria(
                "Feria de Ingeniería 2026",
                "Exposición anual de proyectos de ingeniería",
                TipoConvocatoria.FERIA,
                EstadoConvocatoria.BORRADOR,
                LocalDate.of(2026, 10, 30),
                "Hasta 4 integrantes",
                "https://imagen.jpg",
                docUser
        );
        sampleConv.setId(100L);
    }

    @Test
    @DisplayName("HU-05 Criterio 1, 2, 4: Creación de convocatoria inicializa en estado BORRADOR")
    void testCrearConvocatoria() {
        ConvocatoriaRequest request = new ConvocatoriaRequest(
                "Hackathon FICCT 2026",
                "48 horas de programación",
                TipoConvocatoria.HACKATHON,
                LocalDate.of(2026, 11, 15),
                "De 2 a 4 integrantes",
                null,
                List.of("Estudiante FICCT", "Matrícula vigente")
        );
        request.setJuradoIds(List.of(999L));
        request.setArchivoInformacionUrl("/api/uploads/bases_hackathon.pdf");
        request.setArchivoInformacionNombre("Bases Hackathon.pdf");

        when(userRepository.findByEmail("rmartinez@uagrm.edu.bo")).thenReturn(Optional.of(docUser));
        when(convocatoriaRepository.save(any(Convocatoria.class))).thenAnswer(invocation -> {
            Convocatoria c = invocation.getArgument(0);
            c.setId(101L);
            return c;
        });

        ConvocatoriaDTO result = convocatoriaService.crearConvocatoria(request, "rmartinez@uagrm.edu.bo");

        assertNotNull(result);
        assertEquals(EstadoConvocatoria.BORRADOR, result.getEstado());
        assertEquals(TipoConvocatoria.HACKATHON, result.getTipo());
        assertEquals(ModalidadInscripcion.INDIVIDUAL, result.getModalidadInscripcion());
        assertNull(result.getTamanoEquipo());
        assertEquals("Hackathon FICCT 2026", result.getTitulo());
        assertEquals("/api/uploads/bases_hackathon.pdf", result.getArchivoInformacionUrl());
        assertEquals("Bases Hackathon.pdf", result.getArchivoInformacionNombre());
        assertEquals(2, result.getRequisitos().size());
        verify(convocatoriaRepository).save(any(Convocatoria.class));
        verify(participanteRepository).save(any(ConvocatoriaParticipante.class));
        verify(userRepository, never()).findById(999L);
    }

    @Test
    @DisplayName("Una convocatoria no Feria puede usar inscripción grupal")
    void testCrearHackathonGrupal() {
        ConvocatoriaRequest request = new ConvocatoriaRequest(
                "Hackathon por equipos", "Construcción de prototipos", TipoConvocatoria.HACKATHON,
                LocalDate.of(2026, 11, 15), "De 2 a 5 integrantes", null, List.of());
        request.setModalidadInscripcion(ModalidadInscripcion.GRUPAL);
        request.setMaxIntegrantesFeria(5);
        when(userRepository.findByEmail(docUser.getEmail())).thenReturn(Optional.of(docUser));
        when(convocatoriaRepository.save(any(Convocatoria.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ConvocatoriaDTO result = convocatoriaService.crearConvocatoria(request, docUser.getEmail());

        assertEquals(ModalidadInscripcion.GRUPAL, result.getModalidadInscripcion());
        assertEquals(5, result.getMaxIntegrantesFeria());
        verify(plantillaService).crearParaConvocatoria(argThat(c -> c.getTipo() == TipoConvocatoria.HACKATHON
                && c.getModalidadInscripcion() == ModalidadInscripcion.GRUPAL), eq(docUser));
    }

    @Test
    @DisplayName("Una Feria nueva solicita sus plantillas configuradas")
    void testCrearPlantillaFeria() {
        ConvocatoriaRequest request = new ConvocatoriaRequest(
                "Feria 2026", "Proyectos", TipoConvocatoria.FERIA,
                LocalDate.of(2026, 11, 15), "Hasta 5 integrantes", null, List.of());
        when(userRepository.findByEmail(docUser.getEmail())).thenReturn(Optional.of(docUser));
        when(convocatoriaRepository.save(any(Convocatoria.class))).thenAnswer(invocation -> {
            Convocatoria c = invocation.getArgument(0);
            c.setId(101L);
            return c;
        });
        convocatoriaService.crearConvocatoria(request, docUser.getEmail());

        verify(plantillaService).crearParaConvocatoria(argThat(c -> c.getTipo() == TipoConvocatoria.FERIA), eq(docUser));
    }

    @ParameterizedTest
    @EnumSource(value = TipoConvocatoria.class, names = {"HACKATHON", "CONCURSO", "INVESTIGACION"})
    @DisplayName("Hackathon, Concurso e Investigación usan sus plantillas configuradas")
    void testCrearPlantillaActividades(TipoConvocatoria tipo) {
        ConvocatoriaRequest request = new ConvocatoriaRequest(
                "Nueva convocatoria", "Descripción", tipo,
                LocalDate.of(2026, 11, 15), null, null, List.of());
        when(userRepository.findByEmail(docUser.getEmail())).thenReturn(Optional.of(docUser));
        when(convocatoriaRepository.save(any(Convocatoria.class))).thenAnswer(invocation -> invocation.getArgument(0));
        convocatoriaService.crearConvocatoria(request, docUser.getEmail());

        verify(plantillaService).crearParaConvocatoria(argThat(c -> c.getTipo() == tipo), eq(docUser));
    }

    @Test
    @DisplayName("HU-06 Criterio 1: Publicación de convocatoria cambia estado a PUBLICADA")
    void testPublicarConvocatoria() {
        when(convocatoriaRepository.findById(100L)).thenReturn(Optional.of(sampleConv));
        when(convocatoriaRepository.save(any(Convocatoria.class))).thenReturn(sampleConv);

        ConvocatoriaDTO result = convocatoriaService.publicarConvocatoria(100L, "rmartinez@uagrm.edu.bo");

        assertNotNull(result);
        assertEquals(EstadoConvocatoria.PUBLICADA, sampleConv.getEstado());
        verify(convocatoriaRepository).save(sampleConv);
    }

    @Test
    @DisplayName("Edición de Convocatoria: Actualiza título, descripción, tipo y requisitos")
    void testActualizarConvocatoria() {
        ConvocatoriaRequest editRequest = new ConvocatoriaRequest(
                "Feria de Ingeniería 2026 - Actualizada",
                "Nueva descripción ampliada",
                TipoConvocatoria.FERIA,
                LocalDate.of(2026, 11, 5),
                "De 2 a 5 integrantes",
                "https://nueva-imagen.jpg",
                List.of("Requisito 1", "Requisito 2", "Requisito 3")
        );
        editRequest.setArchivoInformacionUrl("/api/uploads/nuevas_bases.pdf");
        editRequest.setArchivoInformacionNombre("Nuevas bases.pdf");

        when(convocatoriaRepository.findById(100L)).thenReturn(Optional.of(sampleConv));
        when(convocatoriaRepository.save(any(Convocatoria.class))).thenReturn(sampleConv);

        ConvocatoriaDTO result = convocatoriaService.actualizarConvocatoria(100L, editRequest, "rmartinez@uagrm.edu.bo");

        assertNotNull(result);
        assertEquals("Feria de Ingeniería 2026 - Actualizada", sampleConv.getTitulo());
        assertEquals("Nueva descripción ampliada", sampleConv.getDescripcion());
        assertEquals("De 2 a 5 integrantes", sampleConv.getTamanoEquipo());
        assertEquals(3, sampleConv.getRequisitos().size());
        assertEquals("/api/uploads/nuevas_bases.pdf", result.getArchivoInformacionUrl());
        assertEquals("Nuevas bases.pdf", result.getArchivoInformacionNombre());
        verify(convocatoriaRepository).save(sampleConv);
    }

    @Test
    @DisplayName("Editar una convocatoria conserva los jurados asignados desde su sección")
    void testEditarNoSincronizaJurados() {
        User evaluador = new User("Ana", "Pérez", "ana@gmail.com", "hash", Rol.JURADO, EstadoUsuario.ACTIVO);
        evaluador.setId(20L);
        ConvocatoriaParticipante jurado = new ConvocatoriaParticipante(sampleConv, evaluador,
                Rol.JURADO, EstadoInscripcion.ACEPTADO, null, docUser);
        sampleConv.addParticipante(jurado);
        ConvocatoriaRequest request = new ConvocatoriaRequest("Feria editada", "Descripción",
                TipoConvocatoria.FERIA, LocalDate.of(2026, 11, 5), null, null, List.of());
        request.setJuradoIds(List.of());
        when(convocatoriaRepository.findById(100L)).thenReturn(Optional.of(sampleConv));
        when(convocatoriaRepository.save(any(Convocatoria.class))).thenReturn(sampleConv);

        convocatoriaService.actualizarConvocatoria(100L, request, docUser.getEmail());

        assertTrue(sampleConv.getParticipantes().contains(jurado));
        verify(participanteRepository, never()).delete(jurado);
    }

    @Test
    @DisplayName("HU-07 Criterio 4: Catálogo público solo lista convocatorias PUBLICADAS")
    void testListarPublicadas() {
        sampleConv.setEstado(EstadoConvocatoria.PUBLICADA);
        when(convocatoriaRepository.findByEstadoOrderByFechaCierreAsc(EstadoConvocatoria.PUBLICADA))
                .thenReturn(List.of(sampleConv));

        List<ConvocatoriaDTO> publicas = convocatoriaService.listarPublicadas(null, null);

        assertEquals(1, publicas.size());
        assertEquals(EstadoConvocatoria.PUBLICADA, publicas.get(0).getEstado());
        verify(convocatoriaRepository).findByEstadoOrderByFechaCierreAsc(EstadoConvocatoria.PUBLICADA);
    }
}
