package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.RubricaCriterio;
import com.ficct.investigacion.model.Tarea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RubricaCriterioRepository extends JpaRepository<RubricaCriterio, Long> {

    List<RubricaCriterio> findByTareaOrderByOrdenAsc(Tarea tarea);

    @Modifying
    @Query("DELETE FROM RubricaCriterio r WHERE r.tarea = :tarea")
    void deleteByTarea(@Param("tarea") Tarea tarea);
}
