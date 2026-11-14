package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.BibliotecaDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BibliotecaDocumentoRepository extends JpaRepository<BibliotecaDocumento, Long> {
    List<BibliotecaDocumento> findByPublicadoTrueOrderByCreadoEnDesc();
    List<BibliotecaDocumento> findAllByOrderByCreadoEnDesc();
    boolean existsByCategoriaId(Long categoriaId);
}
