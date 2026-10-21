package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.PlantillaAsignacion;
import com.ficct.investigacion.model.PlantillaDefinicion;
import com.ficct.investigacion.model.TipoConvocatoria;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlantillaAsignacionRepository extends JpaRepository<PlantillaAsignacion, Long> {
    List<PlantillaAsignacion> findByTipoOrderByOrdenAsc(TipoConvocatoria tipo);
    void deleteByTipo(TipoConvocatoria tipo);
    void deleteByPlantilla(PlantillaDefinicion plantilla);
}
