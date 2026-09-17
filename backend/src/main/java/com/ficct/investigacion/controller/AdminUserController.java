package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.UserDTO;
import com.ficct.investigacion.dto.UserRoleUpdateDTO;
import com.ficct.investigacion.dto.UserStatusUpdateDTO;
import com.ficct.investigacion.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * HU-03: Listar usuarios con buscador opcional
     */
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(@RequestParam(required = false) String query) {
        List<UserDTO> users = userService.getAllUsers(query);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        try {
            UserDTO user = userService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * HU-03: Asignar nuevo rol a un usuario
     */
    @PutMapping("/{id}/role")
    public ResponseEntity<?> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UserRoleUpdateDTO roleUpdate,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            UserDTO updated = userService.updateRole(id, roleUpdate.getRol(), userDetails.getUsername());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * HU-03: Activar o suspender cuenta de usuario
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserStatusUpdateDTO statusUpdate,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            UserDTO updated = userService.updateStatus(id, statusUpdate.getEstado(), userDetails.getUsername());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
