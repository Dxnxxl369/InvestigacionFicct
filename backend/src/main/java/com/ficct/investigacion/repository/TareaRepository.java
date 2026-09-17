package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.Tarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TareaRepository extends JpaRepository<Tarea, Long> {

    List<Tarea> findByConvocatoriaOrderByCreatedAtDesc(Convocatoria convocatoria);

    List<Tarea> findByConvocatoriaIdOrderByCreatedAtDesc(Long convocatoriaId);

    List<Tarea> findByConvocatoriaAndHabilitadaTrueOrderByFechaEntregaAsc(Convocatoria convocatoria);

    List<Tarea> findByConvocatoriaIdAndHabilitadaTrueOrderByFechaEntregaAsc(Long convocatoriaId);
}
