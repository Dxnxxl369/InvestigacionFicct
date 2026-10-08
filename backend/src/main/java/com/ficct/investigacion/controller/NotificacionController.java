package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.MejorasDTOs;
import com.ficct.investigacion.service.NotificacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {

    private final NotificacionService notificacionService;

    public NotificacionController(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @GetMapping
    public ResponseEntity<?> listar(
            @RequestParam(defaultValue = "50") int limite,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            List<MejorasDTOs.NotificacionDTO> lista = notificacionService.listar(userDetails.getUsername(), limite);
            return ResponseEntity.ok(lista);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/no-leidas")
    public ResponseEntity<?> contarNoLeidas(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            Map<String, Long> res = notificacionService.contarNoLeidas(userDetails.getUsername());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/leer")
    public ResponseEntity<?> marcarLeida(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        try {
            notificacionService.marcarLeida(id, userDetails.getUsername());
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/leer-todas")
    public ResponseEntity<?> marcarTodasLeidas(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            Map<String, Object> res = notificacionService.marcarTodasLeidas(userDetails.getUsername());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
