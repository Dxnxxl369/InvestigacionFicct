package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.RolPermisoDTO;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.RolPermiso;
import com.ficct.investigacion.repository.RolPermisoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RolPermisoServiceTest {

    @Mock
    private RolPermisoRepository rolPermisoRepository;

    @InjectMocks
    private RolPermisoService rolPermisoService;

    @Test
    @DisplayName("Admin siempre tiene permisos de ver y editar en cualquier módulo")
    void testAdminAlwaysHasPermissions() {
        assertTrue(rolPermisoService.puedeVer(Rol.ADMIN, "CONVOCATORIAS"));
        assertTrue(rolPermisoService.puedeEditar(Rol.ADMIN, "CONVOCATORIAS"));
        assertTrue(rolPermisoService.puedeVer(Rol.ADMIN, "USUARIOS"));
        assertTrue(rolPermisoService.puedeEditar(Rol.ADMIN, "USUARIOS"));
    }

    @Test
    @DisplayName("Docente con permiso VER pero sin EDITAR es evaluado correctamente")
    void testDocenteReadOnlyPermission() {
        RolPermiso rp = new RolPermiso(Rol.DOCENTE, "CONVOCATORIAS", true, false);
        when(rolPermisoRepository.findByRolAndModulo(Rol.DOCENTE, "CONVOCATORIAS"))
                .thenReturn(Optional.of(rp));

        assertTrue(rolPermisoService.puedeVer(Rol.DOCENTE, "CONVOCATORIAS"));
        assertFalse(rolPermisoService.puedeEditar(Rol.DOCENTE, "CONVOCATORIAS"));
    }

    @Test
    @DisplayName("Actualizar permisos dinámicamente para un rol y módulo")
    void testActualizarPermiso() {
        RolPermiso rp = new RolPermiso(Rol.DOCENTE, "CONVOCATORIAS", true, true);
        when(rolPermisoRepository.findByRolAndModulo(Rol.DOCENTE, "CONVOCATORIAS"))
                .thenReturn(Optional.of(rp));
        when(rolPermisoRepository.save(any(RolPermiso.class))).thenReturn(rp);

        RolPermisoDTO result = rolPermisoService.actualizarPermiso(Rol.DOCENTE, "CONVOCATORIAS", true, false);

        assertNotNull(result);
        assertTrue(result.isPuedeVer());
        assertFalse(result.isPuedeEditar());
        verify(rolPermisoRepository).save(rp);
    }
}
