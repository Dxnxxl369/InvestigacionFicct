package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.ConvocatoriaParticipante;
import com.ficct.investigacion.model.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConvocatoriaParticipanteRepository extends JpaRepository<ConvocatoriaParticipante, Long> {

    List<ConvocatoriaParticipante> findByConvocatoriaIdOrderByFechaAsignacionAsc(Long convocatoriaId);

    List<ConvocatoriaParticipante> findByUsuarioId(Long usuarioId);

    Optional<ConvocatoriaParticipante> findByConvocatoriaIdAndUsuarioId(Long convocatoriaId, Long usuarioId);

    boolean existsByConvocatoriaIdAndUsuarioId(Long convocatoriaId, Long usuarioId);

    List<ConvocatoriaParticipante> findByConvocatoriaIdAndRol(Long convocatoriaId, Rol rol);

    boolean existsByConvocatoriaIdAndUsuarioIdAndRol(Long convocatoriaId, Long usuarioId, Rol rol);
}
