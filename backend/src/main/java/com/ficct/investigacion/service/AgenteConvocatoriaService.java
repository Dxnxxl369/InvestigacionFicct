package com.ficct.investigacion.service;

import com.ficct.investigacion.ai.convocatoria.harness.ConvocatoriaAgentHarness;
import com.ficct.investigacion.dto.AgenteConvocatoriaDTO.*;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AgenteConvocatoriaService {

    private final UserRepository userRepository;
    private final ConvocatoriaAgentHarness convocatoriaAgentHarness;

    public AgenteConvocatoriaService(UserRepository userRepository,
                                     ConvocatoriaAgentHarness convocatoriaAgentHarness) {
        this.userRepository = userRepository;
        this.convocatoriaAgentHarness = convocatoriaAgentHarness;
    }

    public ChatResponse procesarMensajeAgente(ChatRequest request) {
        List<User> docentesActivos = userRepository.findAll().stream()
                .filter(u -> u.getRol() == Rol.DOCENTE && u.getEstado() == EstadoUsuario.ACTIVO)
                .toList();

        List<DocenteOpcionDTO> opcionesDocentes = docentesActivos.stream()
                .map(d -> new DocenteOpcionDTO(d.getId(), d.getNombreCompleto(), d.getEmail()))
                .collect(Collectors.toList());

        ConvocatoriaBorradorDTO borrador = clonarBorrador(request.getEstadoActual());
        String mensajeAgente = convocatoriaAgentHarness.ejecutar(request, borrador, docentesActivos);

        return construirRespuesta(mensajeAgente, borrador, opcionesDocentes);
    }

    private ConvocatoriaBorradorDTO clonarBorrador(ConvocatoriaBorradorDTO origen) {
        ConvocatoriaBorradorDTO b = new ConvocatoriaBorradorDTO();
        if (origen == null) {
            b.setRequisitos(new ArrayList<>());
            b.setSelectedDocenteIds(new ArrayList<>());
            return b;
        }
        b.setTipo(origen.getTipo());
        b.setModalidadInscripcion(origen.getModalidadInscripcion());
        b.setTitulo(origen.getTitulo());
        b.setDescripcion(origen.getDescripcion());
        b.setFechaFinInscripcion(origen.getFechaFinInscripcion());
        b.setCuposMinEquipo(origen.getCuposMinEquipo());
        b.setCuposMaxEquipo(origen.getCuposMaxEquipo());
        b.setRequisitos(origen.getRequisitos() != null ? new ArrayList<>(origen.getRequisitos()) : new ArrayList<>());
        b.setSelectedDocenteIds(origen.getSelectedDocenteIds() != null ? new ArrayList<>(origen.getSelectedDocenteIds()) : new ArrayList<>());
        return b;
    }

    private ChatResponse construirRespuesta(String mensajeAgente, ConvocatoriaBorradorDTO actualizado,
                                            List<DocenteOpcionDTO> opcionesDocentes) {
        List<String> faltantes = new ArrayList<>();
        int puntos = 0;

        if (actualizado.getTitulo() != null && !actualizado.getTitulo().isBlank()) puntos += 20;
        else faltantes.add("Título de la convocatoria");

        if (actualizado.getDescripcion() != null && !actualizado.getDescripcion().isBlank()) puntos += 20;
        else faltantes.add("Descripción de objetivos");

        if (actualizado.getTipo() != null && !actualizado.getTipo().isBlank()) puntos += 15;
        if (actualizado.getFechaFinInscripcion() != null && !actualizado.getFechaFinInscripcion().isBlank()) puntos += 20;
        else faltantes.add("Fecha límite de inscripción");

        if (actualizado.getRequisitos() != null && !actualizado.getRequisitos().isEmpty()) puntos += 10;
        else faltantes.add("Requisitos de participación");

        if (actualizado.getSelectedDocenteIds() != null && !actualizado.getSelectedDocenteIds().isEmpty()) puntos += 15;
        else faltantes.add("Docente encargado asignado");

        ChatResponse response = new ChatResponse();
        response.setMensajeAgente(mensajeAgente);
        response.setBorradorActualizado(actualizado);
        response.setCamposFaltantes(faltantes);
        response.setDocentesDisponibles(opcionesDocentes);
        response.setPorcentajeProgreso(Math.min(100, puntos));
        return response;
    }
}
