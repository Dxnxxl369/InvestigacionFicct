package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.EstadoConvocatoria;
import com.ficct.investigacion.model.TipoConvocatoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConvocatoriaRepository extends JpaRepository<Convocatoria, Long> {

    List<Convocatoria> findByEstadoOrderByFechaCierreAsc(EstadoConvocatoria estado);

    List<Convocatoria> findByTipoAndEstado(TipoConvocatoria tipo, EstadoConvocatoria estado);

    List<Convocatoria> findAllByOrderByCreatedAtDesc();

    @Query("SELECT c FROM Convocatoria c WHERE c.estado = :estado AND (" +
           "LOWER(c.titulo) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.descripcion) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Convocatoria> searchPublicas(@Param("estado") EstadoConvocatoria estado, @Param("query") String query);
}
