package com.ficct.investigacion.service;

import com.ficct.investigacion.dto.UserDTO;
import com.ficct.investigacion.model.EstadoUsuario;
import com.ficct.investigacion.model.Rol;
import com.ficct.investigacion.model.User;
import com.ficct.investigacion.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User sampleUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User(
                "Brandon",
                "Vásquez",
                "brandon.vasquez@uagrm.edu.bo",
                "encodedPass",
                Rol.ESTUDIANTE,
                EstadoUsuario.ACTIVO
        );
        sampleUser.setId(5L);

        adminUser = new User(
                "Administrador",
                "FICCT",
                "admin@uagrm.edu.bo",
                "encodedAdminPass",
                Rol.ADMIN,
                EstadoUsuario.ACTIVO
        );
        adminUser.setId(1L);
    }

    @Test
    @DisplayName("HU-03 Criterio 1: Listar usuarios con buscador")
    void testGetAllUsers() {
        when(userRepository.searchUsers("brandon")).thenReturn(List.of(sampleUser));

        List<UserDTO> result = userService.getAllUsers("brandon");

        assertEquals(1, result.size());
        assertEquals("Brandon", result.get(0).getNombre());
        verify(userRepository).searchUsers("brandon");
    }

    @Test
    @DisplayName("HU-03 Criterio 2: Alternar estado de usuario entre ACTIVO y SUSPENDIDO")
    void testUpdateStatus() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);

        UserDTO updated = userService.updateStatus(5L, EstadoUsuario.SUSPENDIDO, "admin@uagrm.edu.bo");

        assertNotNull(updated);
        assertEquals(EstadoUsuario.SUSPENDIDO, sampleUser.getEstado());
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("HU-03 Regla: Administrador no puede suspender su propia cuenta")
    void testAdminCannotSuspendOwnAccount() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            userService.updateStatus(1L, EstadoUsuario.SUSPENDIDO, "admin@uagrm.edu.bo");
        });

        assertTrue(ex.getMessage().contains("No puedes suspender tu propia cuenta"));
        verify(userRepository, never()).save(adminUser);
    }

    @Test
    @DisplayName("HU-03 Criterio 3: Modificar rol de usuario (Asignar rol DOCENTE)")
    void testUpdateRole() {
        when(userRepository.findById(5L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);

        UserDTO updated = userService.updateRole(5L, Rol.DOCENTE, "admin@uagrm.edu.bo");

        assertNotNull(updated);
        assertEquals(Rol.DOCENTE, sampleUser.getRol());
        verify(userRepository).save(sampleUser);
    }
}
