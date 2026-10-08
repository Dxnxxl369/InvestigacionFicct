package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.ActividadGrupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActividadGrupoRepository extends JpaRepository<ActividadGrupo, Long> {

    List<ActividadGrupo> findByConvocatoriaIdOrderByFechaCreacionDesc(Long convocatoriaId);

    List<ActividadGrupo> findByModuloId(Long moduloId);
}
