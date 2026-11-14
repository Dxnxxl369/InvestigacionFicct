package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.BibliotecaLectura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface BibliotecaLecturaRepository extends JpaRepository<BibliotecaLectura, Long> {
    List<BibliotecaLectura> findTop20ByUsuarioIdOrderByUltimoAccesoDesc(Long usuarioId);
    Optional<BibliotecaLectura> findByUsuarioIdAndDocumentoId(Long usuarioId, Long documentoId);
    void deleteByDocumentoId(Long documentoId);
    @Query("select l.documentoId, count(l) from BibliotecaLectura l where l.descargas > 0 group by l.documentoId")
    List<Object[]> contarEstudiantesQueDescargaronPorDocumento();
}
