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
}
