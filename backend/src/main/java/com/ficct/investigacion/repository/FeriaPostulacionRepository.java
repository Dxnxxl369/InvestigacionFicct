package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.FeriaPostulacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface FeriaPostulacionRepository extends JpaRepository<FeriaPostulacion, Long> {
    List<FeriaPostulacion> findByParticipanteId(Long participanteId);
    List<FeriaPostulacion> findByConvocatoriaIdOrderByIdAsc(Long convocatoriaId);
    boolean existsByConvocatoriaIdAndCodigoEquipoIgnoreCaseAndIdNot(Long convocatoriaId, String codigoEquipo, Long id);

    @Query("select distinct p from FeriaPostulacion p join p.integrantes i where lower(i.correo) = lower(?1)")
    List<FeriaPostulacion> findByCorreoIntegrante(String correo);
}
