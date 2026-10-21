package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.FormularioEvaluacionJurado;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FormularioEvaluacionJuradoRepository extends JpaRepository<FormularioEvaluacionJurado, Long> {
    Optional<FormularioEvaluacionJurado> findByConvocatoriaId(Long convocatoriaId);
    void deleteByConvocatoriaId(Long convocatoriaId);
}
