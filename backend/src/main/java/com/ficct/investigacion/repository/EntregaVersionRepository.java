package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.EntregaTarea;
import com.ficct.investigacion.model.EntregaVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntregaVersionRepository extends JpaRepository<EntregaVersion, Long> {

    List<EntregaVersion> findByEntregaOrderByIntentoDesc(EntregaTarea entrega);

    long countByEntrega(EntregaTarea entrega);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM EntregaVersion v WHERE v.entrega = :entrega")
    void deleteByEntrega(@org.springframework.data.repository.query.Param("entrega") EntregaTarea entrega);
}
