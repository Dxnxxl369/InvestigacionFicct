package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Convocatoria;
import com.ficct.investigacion.model.Modulo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModuloRepository extends JpaRepository<Modulo, Long> {

    List<Modulo> findByConvocatoriaOrderByOrdenAscCreatedAtAsc(Convocatoria convocatoria);

    List<Modulo> findByConvocatoriaIdOrderByOrdenAscCreatedAtAsc(Long convocatoriaId);
}
