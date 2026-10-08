package com.ficct.investigacion.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    private final ResourceLoader resourceLoader;

    @Value("${app.firebase.config-path:classpath:firebase-service-account.json}")
    private String firebaseConfigPath;

    public FirebaseConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @Bean
    public FirebaseApp firebaseApp() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        try {
            Resource resource = resourceLoader.getResource(firebaseConfigPath);
            if (resource.exists()) {
                try (InputStream serviceAccount = resource.getInputStream()) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();
                    FirebaseApp app = FirebaseApp.initializeApp(options);
                    log.info(">>> [FirebaseConfig] Firebase Admin SDK inicializado exitosamente con: {}", firebaseConfigPath);
                    return app;
                }
            } else {
                // Alternativa: Variable de entorno en producción (Render / Cloud / Docker)
                String envJson = System.getenv("FIREBASE_CREDENTIALS");
                if (envJson == null || envJson.isBlank()) {
                    envJson = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
                }

                if (envJson != null && !envJson.isBlank()) {
                    try (InputStream serviceAccount = new java.io.ByteArrayInputStream(envJson.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
                        FirebaseOptions options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                                .build();
                        FirebaseApp app = FirebaseApp.initializeApp(options);
                        log.info(">>> [FirebaseConfig] Firebase Admin SDK inicializado exitosamente desde variable de entorno.");
                        return app;
                    }
                }

                log.warn(">>> [FirebaseConfig] Credenciales no encontradas en {} ni en variable de entorno FIREBASE_CREDENTIALS. Push notifications desactivadas.", firebaseConfigPath);
            }
        } catch (Exception e) {
            log.error(">>> [FirebaseConfig] Error al inicializar Firebase Admin SDK: {}", e.getMessage());
        }
        return null;
    }

    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseApp firebaseApp) {
        if (firebaseApp != null) {
            return FirebaseMessaging.getInstance(firebaseApp);
        }
        return null;
    }
}
