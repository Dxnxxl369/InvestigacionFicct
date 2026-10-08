package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.EntregaPuntajeCriterio;
import com.ficct.investigacion.model.EntregaTarea;
import com.ficct.investigacion.model.RubricaCriterio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntregaPuntajeCriterioRepository extends JpaRepository<EntregaPuntajeCriterio, Long> {

    List<EntregaPuntajeCriterio> findByEntrega(EntregaTarea entrega);

    @Modifying
    @Query("DELETE FROM EntregaPuntajeCriterio p WHERE p.entrega = :entrega")
    void deleteByEntrega(@Param("entrega") EntregaTarea entrega);

    @Modifying
    @Query("DELETE FROM EntregaPuntajeCriterio p WHERE p.criterio = :criterio")
    void deleteByCriterio(@Param("criterio") RubricaCriterio criterio);
}
