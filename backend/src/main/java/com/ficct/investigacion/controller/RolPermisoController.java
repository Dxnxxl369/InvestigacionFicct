package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.RolPermisoDTO;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import com.ficct.investigacion.service.RolPermisoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/permisos")
public class RolPermisoController {

    private final RolPermisoService rolPermisoService;
    private final UserRepository userRepository;

    public RolPermisoController(RolPermisoService rolPermisoService, UserRepository userRepository) {
        this.rolPermisoService = rolPermisoService;
        this.userRepository = userRepository;
    }

    /**
     * Listar todos los permisos (matriz global)
     */
    @GetMapping
    public ResponseEntity<List<RolPermisoDTO>> listarTodos() {
        return ResponseEntity.ok(rolPermisoService.listarTodos());
    }

    /**
     * Obtener permisos del usuario autenticado actual
     */
    @GetMapping("/mi-rol")
    public ResponseEntity<List<RolPermisoDTO>> getPermisosMiRol(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(rolPermisoService.listarPorRol(user.getRol()));
    }

    /**
     * Obtener permisos para un rol específico
     */
    @GetMapping("/rol/{rol}")
    public ResponseEntity<List<RolPermisoDTO>> getPermisosPorRol(@PathVariable Rol rol) {
        return ResponseEntity.ok(rolPermisoService.listarPorRol(rol));
    }

    /**
     * Actualizar permisos para un rol y módulo (Solo ADMIN)
     */
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RolPermisoDTO> actualizarPermiso(@RequestBody RolPermisoDTO dto) {
        RolPermisoDTO updated = rolPermisoService.actualizarPermiso(
                dto.getRol(),
                dto.getModulo(),
                dto.isPuedeVer(),
                dto.isPuedeEditar()
        );
        return ResponseEntity.ok(updated);
    }
}
