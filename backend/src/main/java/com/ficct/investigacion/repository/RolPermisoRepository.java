package com.ficct.investigacion.repository;

import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.RolPermiso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RolPermisoRepository extends JpaRepository<RolPermiso, Long> {
    List<RolPermiso> findByRol(Rol rol);
    Optional<RolPermiso> findByRolAndModulo(Rol rol, String modulo);
    boolean existsByRolAndModulo(Rol rol, String modulo);
}
