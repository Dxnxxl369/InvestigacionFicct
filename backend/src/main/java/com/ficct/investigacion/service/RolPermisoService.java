package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.RolPermisoDTO;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.RolPermiso;
import com.ficct.investigacion.repository.RolPermisoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class RolPermisoService {

    private final RolPermisoRepository rolPermisoRepository;

    public RolPermisoService(RolPermisoRepository rolPermisoRepository) {
        this.rolPermisoRepository = rolPermisoRepository;
    }

    public List<RolPermisoDTO> listarTodos() {
        return rolPermisoRepository.findAll().stream()
                .map(RolPermisoDTO::new)
                .collect(Collectors.toList());
    }

    public List<RolPermisoDTO> listarPorRol(Rol rol) {
        return rolPermisoRepository.findByRol(rol).stream()
                .map(RolPermisoDTO::new)
                .collect(Collectors.toList());
    }

    public boolean puedeVer(Rol rol, String modulo) {
        if (rol == Rol.ADMIN) return true;
        return rolPermisoRepository.findByRolAndModulo(rol, modulo)
                .map(RolPermiso::isPuedeVer)
                .orElse(false);
    }

    public boolean puedeEditar(Rol rol, String modulo) {
        if (rol == Rol.ADMIN) return true;
        return rolPermisoRepository.findByRolAndModulo(rol, modulo)
                .map(RolPermiso::isPuedeEditar)
                .orElse(false);
    }

    @Transactional
    public RolPermisoDTO actualizarPermiso(Rol rol, String modulo, boolean puedeVer, boolean puedeEditar) {
        RolPermiso rp = rolPermisoRepository.findByRolAndModulo(rol, modulo)
                .orElseGet(() -> new RolPermiso(rol, modulo, puedeVer, puedeEditar));

        rp.setPuedeVer(puedeVer);
        rp.setPuedeEditar(puedeEditar);

        RolPermiso guardado = rolPermisoRepository.save(rp);
        return new RolPermisoDTO(guardado);
    }
}
