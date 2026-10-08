package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.AuthRequest;
import com.ficct.investigacion.dto.AuthResponse;
import com.ficct.investigacion.dto.PerfilUpdateRequest;
import com.ficct.investigacion.dto.RegisterRequest;
import com.ficct.investigacion.dto.UserDTO;
import com.ficct.investigacion.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * HU-01: Crear usuario / Registro de usuario
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    /**
     * HU-02: Autenticación de usuario (JWT)
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
        }
    }

    /**
     * Perfil del usuario autenticado
     */
    @GetMapping("/me")
    public ResponseEntity<?> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserDTO userDTO = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(userDTO);
    }

    /**
     * Actualizar perfil del usuario autenticado (fotoPerfil y descripcion unicamente)
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal UserDetails userDetails,
                                           @RequestBody PerfilUpdateRequest request) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserDTO userDTO = authService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(userDTO);
    }

    @PutMapping("/perfil")
    public ResponseEntity<?> updatePerfil(@AuthenticationPrincipal UserDetails userDetails,
                                          @RequestBody PerfilUpdateRequest request) {
        return updateProfile(userDetails, request);
    }

    /**
     * Ficha Académica / Perfil Público de un usuario (para consulta entre participantes de la facultad)
     */
    @GetMapping("/usuarios/{id}/perfil-publico")
    public ResponseEntity<?> getPerfilPublico(@PathVariable Long id,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String currentUserEmail = userDetails != null ? userDetails.getUsername() : null;
            Map<String, Object> perfil = authService.getPerfilPublico(id, currentUserEmail);
            return ResponseEntity.ok(perfil);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }
}
