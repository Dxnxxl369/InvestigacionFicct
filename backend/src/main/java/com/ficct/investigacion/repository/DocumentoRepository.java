package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Documento;
import com.ficct.investigacion.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentoRepository extends JpaRepository<Documento, Long> {

    List<Documento> findByAutorOrderByUpdatedAtDesc(User autor);

    @Query("SELECT DISTINCT d FROM Documento d " +
           "LEFT JOIN d.colaboradores c " +
           "WHERE d.autor = :user OR c.usuario = :user " +
           "ORDER BY d.updatedAt DESC")
    List<Documento> findAccessibleByUser(@Param("user") User user);

    List<Documento> findByConvocatoriaIdOrderByUpdatedAtDesc(Long convocatoriaId);
}
