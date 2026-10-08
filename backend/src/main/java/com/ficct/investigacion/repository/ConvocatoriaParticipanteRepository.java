package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.ConvocatoriaParticipante;
import com.ficct.investigacion.model.EstadoInscripcion;
import com.ficct.investigacion.model.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConvocatoriaParticipanteRepository extends JpaRepository<ConvocatoriaParticipante, Long> {

    List<ConvocatoriaParticipante> findByConvocatoriaId(Long convocatoriaId);

    @Query("SELECT DISTINCT cp FROM ConvocatoriaParticipante cp LEFT JOIN FETCH cp.grupos WHERE cp.convocatoria.id = :convocatoriaId")
    List<ConvocatoriaParticipante> findByConvocatoriaIdConGrupos(@Param("convocatoriaId") Long convocatoriaId);

    List<ConvocatoriaParticipante> findByGrupoId(Long grupoId);

    @Query("SELECT DISTINCT cp FROM ConvocatoriaParticipante cp JOIN cp.grupos g WHERE g.id = :grupoId")
    List<ConvocatoriaParticipante> findMiembrosPorGrupoId(@Param("grupoId") Long grupoId);

    List<ConvocatoriaParticipante> findByConvocatoriaIdOrderByFechaAsignacionAsc(Long convocatoriaId);

    List<ConvocatoriaParticipante> findByConvocatoriaIdAndEstadoInscripcionOrderByFechaAsignacionAsc(
            Long convocatoriaId, EstadoInscripcion estadoInscripcion
    );

    List<ConvocatoriaParticipante> findByUsuarioId(Long usuarioId);

    List<ConvocatoriaParticipante> findByUsuarioIdAndEstadoInscripcion(Long usuarioId, EstadoInscripcion estadoInscripcion);

    Optional<ConvocatoriaParticipante> findByConvocatoriaIdAndUsuarioId(Long convocatoriaId, Long usuarioId);

    boolean existsByConvocatoriaIdAndUsuarioId(Long convocatoriaId, Long usuarioId);

    boolean existsByConvocatoriaIdAndUsuarioIdAndEstadoInscripcion(Long convocatoriaId, Long usuarioId, EstadoInscripcion estadoInscripcion);

    List<ConvocatoriaParticipante> findByConvocatoriaIdAndRol(Long convocatoriaId, Rol rol);

    List<ConvocatoriaParticipante> findByConvocatoriaIdAndRolAndEstadoInscripcion(Long convocatoriaId, Rol rol, EstadoInscripcion estadoInscripcion);

    boolean existsByConvocatoriaIdAndUsuarioIdAndRol(Long convocatoriaId, Long usuarioId, Rol rol);

    boolean existsByConvocatoriaIdAndUsuarioIdAndRolAndEstadoInscripcion(Long convocatoriaId, Long usuarioId, Rol rol, EstadoInscripcion estadoInscripcion);

    long countByConvocatoriaIdAndEstadoInscripcion(Long convocatoriaId, EstadoInscripcion estadoInscripcion);

    long countByConvocatoriaIdAndRolAndEstadoInscripcion(Long convocatoriaId, Rol rol, EstadoInscripcion estadoInscripcion);
}
