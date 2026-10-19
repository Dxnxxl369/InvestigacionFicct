package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.JuradoAsignacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JuradoAsignacionRepository extends JpaRepository<JuradoAsignacion, Long> {
    List<JuradoAsignacion> findByConvocatoriaId(Long convocatoriaId);
    List<JuradoAsignacion> findByJuradoId(Long juradoId);
    void deleteByConvocatoriaId(Long convocatoriaId);
    void deleteByJuradoId(Long juradoId);
    void deleteByGrupoId(Long grupoId);
    void deleteByFeriaPostulacionId(Long feriaPostulacionId);
}
