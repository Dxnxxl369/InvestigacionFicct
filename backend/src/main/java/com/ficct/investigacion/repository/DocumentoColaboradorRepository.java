package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Documento;
import com.ficct.investigacion.model.DocumentoColaborador;
import com.ficct.investigacion.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentoColaboradorRepository extends JpaRepository<DocumentoColaborador, Long> {

    List<DocumentoColaborador> findByDocumento(Documento documento);

    Optional<DocumentoColaborador> findByDocumentoAndUsuario(Documento documento, User usuario);

    List<DocumentoColaborador> findByUsuario(User usuario);

    boolean existsByDocumentoAndUsuario(Documento documento, User usuario);

    void deleteByDocumentoAndUsuario(Documento documento, User usuario);
}
