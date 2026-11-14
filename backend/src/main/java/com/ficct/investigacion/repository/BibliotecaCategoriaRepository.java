package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.BibliotecaCategoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BibliotecaCategoriaRepository extends JpaRepository<BibliotecaCategoria, Long> {
    boolean existsByNombreIgnoreCase(String nombre);
    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);
}
