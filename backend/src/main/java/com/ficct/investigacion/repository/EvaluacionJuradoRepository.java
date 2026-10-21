package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.EvaluacionJurado;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EvaluacionJuradoRepository extends JpaRepository<EvaluacionJurado, Long> {
    Optional<EvaluacionJurado> findByConvocatoriaIdAndJuradoUsuarioIdAndTipoProyectoAndProyectoId(
            Long convocatoriaId, Long juradoUsuarioId, String tipoProyecto, Long proyectoId);
    List<EvaluacionJurado> findByConvocatoriaIdAndJuradoUsuarioId(Long convocatoriaId, Long juradoUsuarioId);
    List<EvaluacionJurado> findByConvocatoriaId(Long convocatoriaId);
    void deleteByConvocatoriaId(Long convocatoriaId);
}
