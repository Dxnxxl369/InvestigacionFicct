package com.ficct.investigacion.dto;

import com.ficct.investigacion.model.EstadoInscripcion;
import com.ficct.investigacion.model.FeriaIntegrante;
import com.ficct.investigacion.model.FeriaPostulacion;
import java.util.List;

public record FeriaPostulacionDTO(
        Long id, Long participanteId, EstadoInscripcion estado, String responsable,
        String codigoEquipo, String jefeCorreo,
        String tema, String area, String categoria, String materia, String sigla,
        String grupoMateria, String docente, List<FeriaIntegranteDTO> integrantes
) {
    public FeriaPostulacionDTO(FeriaPostulacion postulacion) {
        this(postulacion.getId(), postulacion.getParticipante().getId(),
                postulacion.getEstadoInscripcion(),
                postulacion.getParticipante().getUsuario().getNombreCompleto(),
                postulacion.getCodigoEquipo(), postulacion.getParticipante().getUsuario().getEmail(),
                postulacion.getTema(), postulacion.getArea(), postulacion.getCategoria(),
                postulacion.getMateria(), postulacion.getSigla(), postulacion.getGrupoMateria(),
                postulacion.getDocente(), postulacion.getIntegrantes().stream().map(FeriaIntegranteDTO::new).toList());
    }

    public record FeriaIntegranteDTO(String registro, String nombre, String carrera,
                                    String celular, Integer semestre, Integer ferias, String correo) {
        public FeriaIntegranteDTO(FeriaIntegrante integrante) {
            this(integrante.getRegistro(), integrante.getNombre(), integrante.getCarrera(),
                    integrante.getCelular(), integrante.getSemestre(), integrante.getFerias(), integrante.getCorreo());
        }
    }
}
