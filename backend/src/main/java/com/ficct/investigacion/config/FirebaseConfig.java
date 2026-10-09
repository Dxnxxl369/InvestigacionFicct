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

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

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
            // 1. Prioridad: Carga directa desde archivo Base64 empaquetado en el JAR (permite despliegue seguro en Render/CI sin bloqueo de Git Secret Scanning)
            Resource b64Resource = resourceLoader.getResource("classpath:firebase-credentials.b64");
            if (b64Resource.exists()) {
                try (InputStream is = b64Resource.getInputStream()) {
                    byte[] rawB64 = is.readAllBytes();
                    String strB64 = new String(rawB64, StandardCharsets.UTF_8).replaceAll("\\s+", "");
                    byte[] decoded = Base64.getDecoder().decode(strB64);
                    try (InputStream serviceAccount = new ByteArrayInputStream(decoded)) {
                        FirebaseOptions options = FirebaseOptions.builder()
                                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                                .build();
                        FirebaseApp app = FirebaseApp.initializeApp(options);
                        log.info(">>> [FirebaseConfig] Firebase Admin SDK inicializado exitosamente desde classpath:firebase-credentials.b64");
                        return app;
                    }
                }
            }

            // 2. Ruta estándar configurada (ej. classpath:firebase-service-account.json)
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
            }

            // 3. Búsqueda en disco local (desarrollo local)
            File[] posiblesArchivos = new File[]{
                    new File("firebase-service-account.json"),
                    new File("backend/src/main/resources/firebase-service-account.json"),
                    new File("src/main/resources/firebase-service-account.json"),
                    new File("firebase-credentials.b64"),
                    new File("backend/src/main/resources/firebase-credentials.b64")
            };

            for (File file : posiblesArchivos) {
                if (file.exists()) {
                    if (file.getName().endsWith(".b64")) {
                        byte[] rawBytes = java.nio.file.Files.readAllBytes(file.toPath());
                        String str = new String(rawBytes, StandardCharsets.UTF_8).replaceAll("\\s+", "");
                        byte[] decoded = Base64.getDecoder().decode(str);
                        try (InputStream serviceAccount = new ByteArrayInputStream(decoded)) {
                            FirebaseOptions options = FirebaseOptions.builder()
                                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                                    .build();
                            FirebaseApp app = FirebaseApp.initializeApp(options);
                            log.info(">>> [FirebaseConfig] Firebase Admin SDK inicializado exitosamente desde archivo B64: {}", file.getAbsolutePath());
                            return app;
                        }
                    } else {
                        try (InputStream serviceAccount = new FileInputStream(file)) {
                            FirebaseOptions options = FirebaseOptions.builder()
                                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                                    .build();
                            FirebaseApp app = FirebaseApp.initializeApp(options);
                            log.info(">>> [FirebaseConfig] Firebase Admin SDK inicializado exitosamente desde archivo JSON: {}", file.getAbsolutePath());
                            return app;
                        }
                    }
                }
            }

            // 4. Variable de entorno en producción (Render / Cloud / Docker)
            String envJson = System.getenv("FIREBASE_CREDENTIALS");
            if (envJson == null || envJson.isBlank()) {
                envJson = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
            }

            if (envJson != null && !envJson.isBlank()) {
                byte[] jsonBytes;
                String trimmed = envJson.trim();
                if (trimmed.startsWith("{")) {
                    jsonBytes = trimmed.getBytes(StandardCharsets.UTF_8);
                } else {
                    jsonBytes = Base64.getDecoder().decode(trimmed.replaceAll("\\s+", ""));
                }
                try (InputStream serviceAccount = new ByteArrayInputStream(jsonBytes)) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();
                    FirebaseApp app = FirebaseApp.initializeApp(options);
                    log.info(">>> [FirebaseConfig] Firebase Admin SDK inicializado exitosamente desde variable de entorno.");
                    return app;
                }
            }

            log.warn(">>> [FirebaseConfig] Credenciales no encontradas. Push notifications desactivadas.");
        } catch (Exception e) {
            log.error(">>> [FirebaseConfig] Error al inicializar Firebase Admin SDK: {}", e.getMessage(), e);
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
