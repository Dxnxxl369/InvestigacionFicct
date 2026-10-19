package com.ficct.investigacion.controller;

import com.ficct.investigacion.service.FCMService;
import com.google.firebase.FirebaseApp;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
public class RootController {

    private final FCMService fcmService;

    public RootController(FCMService fcmService) {
        this.fcmService = fcmService;
    }

    @GetMapping({"/", "/health", "/api"})
    public ResponseEntity<?> index() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "FICCT Taller de Grado - API Backend",
                "version", "1.0.0",
                "timestamp", LocalDateTime.now().toString(),
                "fcmDisponible", fcmService.isDisponible()
        ));
    }

    @GetMapping("/api/public/fcm-status")
    public ResponseEntity<?> fcmStatus() {
        boolean appsInitialized = !FirebaseApp.getApps().isEmpty();
        boolean disponible = fcmService.isDisponible();
        return ResponseEntity.ok(Map.of(
                "fcmDisponible", disponible,
                "firebaseAppsInicializadas", appsInitialized,
                "totalApps", FirebaseApp.getApps().size(),
                "mensaje", disponible ? "Firebase Cloud Messaging activo y listo para Push." : "Firebase no inicializado."
        ));
    }
}
