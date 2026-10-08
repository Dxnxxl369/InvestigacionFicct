package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Documento;
import com.ficct.investigacion.model.DocumentoVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentoVersionRepository extends JpaRepository<DocumentoVersion, Long> {
    List<DocumentoVersion> findTop30ByDocumentoOrderByCreatedAtDesc(Documento documento);
    Optional<DocumentoVersion> findFirstByDocumentoOrderByCreatedAtDesc(Documento documento);
}
