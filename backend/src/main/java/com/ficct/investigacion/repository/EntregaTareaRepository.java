package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.EntregaTarea;
import com.ficct.investigacion.model.Tarea;
import com.ficct.investigacion.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntregaTareaRepository extends JpaRepository<EntregaTarea, Long> {

    List<EntregaTarea> findByTareaOrderByFechaEntregaDesc(Tarea tarea);

    Optional<EntregaTarea> findByTareaAndEstudiante(Tarea tarea, User estudiante);

    List<EntregaTarea> findByEstudianteOrderByFechaEntregaDesc(User estudiante);

    boolean existsByTareaAndEstudiante(Tarea tarea, User estudiante);
}
