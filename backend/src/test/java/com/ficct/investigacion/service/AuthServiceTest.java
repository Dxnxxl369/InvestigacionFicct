package com.ficct.investigacion.service;

import com.ficct.investigacion.config.JwtService;
import com.ficct.investigacion.dto.AuthRequest;
import com.ficct.investigacion.dto.AuthResponse;
import com.ficct.investigacion.dto.RegisterRequest;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User studentUser;

    @BeforeEach
    void setUp() {
        studentUser = new User(
                "Carlos",
                "Mendoza",
                "carlos.mendoza@uagrm.edu.bo",
                "encodedPassword123",
                Rol.ESTUDIANTE,
                EstadoUsuario.ACTIVO
        );
        studentUser.setId(10L);
    }

    @Test
    @DisplayName("HU-01 Criterio 1, 3, 4: Registro exitoso con BCrypt y rol ESTUDIANTE por defecto")
    void testRegisterSuccess() {
        RegisterRequest request = new RegisterRequest(
                "Carlos",
                "Mendoza",
                "carlos.mendoza@uagrm.edu.bo",
                "password123"
        );

        when(userRepository.existsByEmail("carlos.mendoza@uagrm.edu.bo")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword123");
        when(userRepository.save(any(User.class))).thenReturn(studentUser);
        when(jwtService.generateToken(any(User.class))).thenReturn("fake-jwt-token-xyz");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("fake-jwt-token-xyz", response.getToken());
        assertEquals("carlos.mendoza@uagrm.edu.bo", response.getEmail());
        assertEquals(Rol.ESTUDIANTE, response.getRol());
        assertEquals(EstadoUsuario.ACTIVO, response.getEstado());
        verify(passwordEncoder).encode("password123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("HU-01 Criterio 2: Rechazar registro cuando el correo ya existe en BD")
    void testRegisterDuplicateEmailThrowsException() {
        RegisterRequest request = new RegisterRequest(
                "Carlos",
                "Mendoza",
                "carlos.mendoza@uagrm.edu.bo",
                "password123"
        );

        when(userRepository.existsByEmail("carlos.mendoza@uagrm.edu.bo")).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            authService.register(request);
        });

        assertTrue(exception.getMessage().contains("Ya existe una cuenta"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("HU-02 Criterio 2, 3: Login exitoso genera token JWT válido")
    void testLoginSuccess() {
        AuthRequest request = new AuthRequest("carlos.mendoza@uagrm.edu.bo", "password123");

        when(userRepository.findByEmail("carlos.mendoza@uagrm.edu.bo")).thenReturn(Optional.of(studentUser));
        when(jwtService.generateToken(studentUser)).thenReturn("valid-jwt-token-abc");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("valid-jwt-token-abc", response.getToken());
        assertEquals("carlos.mendoza@uagrm.edu.bo", response.getEmail());
        assertEquals(Rol.ESTUDIANTE, response.getRol());
    }

    @Test
    @DisplayName("HU-02 Criterio 4: Login con credenciales incorrectas lanza BadCredentialsException")
    void testLoginBadCredentialsThrowsException() {
        AuthRequest request = new AuthRequest("desconocido@uagrm.edu.bo", "badpass");

        when(userRepository.findByEmail("desconocido@uagrm.edu.bo")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> {
            authService.login(request);
        });
    }

    @Test
    @DisplayName("HU-02: Usuario suspendido es bloqueado en login")
    void testLoginSuspendedUserThrowsException() {
        studentUser.setEstado(EstadoUsuario.SUSPENDIDO);
        AuthRequest request = new AuthRequest("carlos.mendoza@uagrm.edu.bo", "password123");

        when(userRepository.findByEmail("carlos.mendoza@uagrm.edu.bo")).thenReturn(Optional.of(studentUser));

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            authService.login(request);
        });

        assertTrue(exception.getMessage().contains("suspendida"));
    }
}
