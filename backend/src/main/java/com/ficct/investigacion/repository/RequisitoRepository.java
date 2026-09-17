package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Requisito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequisitoRepository extends JpaRepository<Requisito, Long> {
    List<Requisito> findByConvocatoriaId(Long convocatoriaId);
}
