package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Grupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrupoRepository extends JpaRepository<Grupo, Long> {

    List<Grupo> findByConvocatoriaIdOrderByNombreAsc(Long convocatoriaId);

    List<Grupo> findByConvocatoriaIdAndActividadGrupoIdOrderByNombreAsc(Long convocatoriaId, Long actividadGrupoId);

    long countByConvocatoriaId(Long convocatoriaId);
}
