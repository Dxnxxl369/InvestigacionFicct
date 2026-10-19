package com.ficct.investigacion.service;

import com.ficct.investigacion.model.*;
import com.ficct.investigacion.repository.ConvocatoriaParticipanteRepository;
import com.ficct.investigacion.repository.FeriaPostulacionRepository;
import com.ficct.investigacion.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class FeriaMembresiaService {
    private final FeriaPostulacionRepository postulaciones;
    private final ConvocatoriaParticipanteRepository participantes;
    private final UserRepository usuarios;

    public FeriaMembresiaService(FeriaPostulacionRepository postulaciones,
                                 ConvocatoriaParticipanteRepository participantes,
                                 UserRepository usuarios) {
        this.postulaciones = postulaciones;
        this.participantes = participantes;
        this.usuarios = usuarios;
    }

    @Transactional
    public void asociarCorreo(String correo) {
        usuarios.findByEmail(correo).ifPresent(usuario -> {
            if (usuario.getRol() != Rol.ESTUDIANTE) return;
            Map<Long, List<FeriaPostulacion>> equiposPorConvocatoria = postulaciones.findByCorreoIntegrante(correo)
                    .stream()
                    .filter(p -> p.getEstadoInscripcion() == EstadoInscripcion.ACEPTADO)
                    .collect(Collectors.groupingBy(p -> p.getConvocatoria().getId()));
            for (List<FeriaPostulacion> equipos : equiposPorConvocatoria.values()) {
                FeriaPostulacion postulacion = equipos.get(0);
                Long convocatoriaId = postulacion.getConvocatoria().getId();
                String nombresEquipos = equipos.stream()
                        .map(FeriaPostulacion::getCodigoEquipo)
                        .filter(codigo -> codigo != null && !codigo.isBlank())
                        .distinct()
                        .sorted(String.CASE_INSENSITIVE_ORDER)
                        .collect(Collectors.joining(", "));
                var existente = participantes.findByConvocatoriaIdAndUsuarioId(convocatoriaId, usuario.getId());
                if (existente.isPresent()) {
                    ConvocatoriaParticipante participante = existente.get();
                    boolean cambio = false;
                    if (participante.getEstadoInscripcion() != EstadoInscripcion.ACEPTADO) {
                        participante.setEstadoInscripcion(EstadoInscripcion.ACEPTADO);
                        cambio = true;
                    }
                    if (!Objects.equals(participante.getNombreEquipo(), nombresEquipos)) {
                        participante.setNombreEquipo(nombresEquipos);
                        cambio = true;
                    }
                    if (cambio) participantes.save(participante);
                    continue;
                }
                participantes.save(new ConvocatoriaParticipante(postulacion.getConvocatoria(), usuario,
                        Rol.ESTUDIANTE, EstadoInscripcion.ACEPTADO,
                        nombresEquipos, postulacion.getParticipante().getUsuario()));
            }
        });
    }
}
