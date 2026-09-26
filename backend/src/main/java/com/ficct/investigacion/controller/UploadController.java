package com.ficct.investigacion.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final Path uploadLocation;

    public UploadController(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.uploadLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            if (!Files.exists(this.uploadLocation)) {
                Files.createDirectories(this.uploadLocation);
            }
        } catch (IOException e) {
            throw new RuntimeException("No se pudo inicializar la carpeta de subidas de archivos", e);
        }
    }

    /**
     * Subir imagen para convocatorias, áreas o perfil
     */
    @PostMapping("/imagen")
    public ResponseEntity<?> subirImagen(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Debe proporcionar un archivo de imagen válido.");
            return ResponseEntity.badRequest().body(error);
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "imagen.jpg"));
        String extension = "";
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx > 0) {
            extension = originalFilename.substring(dotIdx).toLowerCase();
        }

        List<String> extensionesValidas = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif");
        if (!extensionesValidas.contains(extension)) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Formato no permitido. Solo se aceptan imágenes JPG, PNG, WEBP o GIF.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            // Nombre de archivo sanitizado y con identificador único
            String baseName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
            String uniqueName = UUID.randomUUID().toString().substring(0, 8) + "_" + baseName;
            Path targetPath = this.uploadLocation.resolve(uniqueName).normalize();

            // Verificar path traversal
            if (!targetPath.startsWith(this.uploadLocation)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Ruta de archivo no válida.");
                return ResponseEntity.badRequest().body(error);
            }

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/uploads/")
                    .path(uniqueName)
                    .toUriString();

            Map<String, Object> response = new HashMap<>();
            response.put("url", fileDownloadUri);
            response.put("relativePath", "/api/uploads/" + uniqueName);
            response.put("filename", uniqueName);
            response.put("size", file.getSize());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Error al guardar el archivo: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Subir archivo o documento para entregas académicas, proyectos e investigaciones
     */
    @PostMapping("/documento")
    public ResponseEntity<?> subirDocumento(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Debe proporcionar un archivo válido.");
            return ResponseEntity.badRequest().body(error);
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "entrega_documento.pdf"));
        String extension = "";
        int dotIdx = originalFilename.lastIndexOf('.');
        if (dotIdx > 0) {
            extension = originalFilename.substring(dotIdx).toLowerCase();
        }

        // Restringir ejecutables o scripts maliciosos por seguridad
        List<String> extensionesPeligrosas = Arrays.asList(
                ".exe", ".bat", ".cmd", ".sh", ".com", ".msi", ".vbs", ".js", ".jar", ".scr", ".pif"
        );
        if (extensionesPeligrosas.contains(extension)) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Tipo de archivo peligroso no permitido (.exe, .bat, scripts).");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            String baseName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
            String uniqueName = UUID.randomUUID().toString().substring(0, 8) + "_" + baseName;
            Path targetPath = this.uploadLocation.resolve(uniqueName).normalize();

            // Prevenir path traversal
            if (!targetPath.startsWith(this.uploadLocation)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Ruta de archivo no válida.");
                return ResponseEntity.badRequest().body(error);
            }

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/uploads/")
                    .path(uniqueName)
                    .toUriString();

            Map<String, Object> response = new HashMap<>();
            response.put("url", fileDownloadUri);
            response.put("relativePath", "/api/uploads/" + uniqueName);
            response.put("filename", uniqueName);
            response.put("originalFilename", originalFilename);
            response.put("size", file.getSize());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Error al guardar el archivo: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Servir la imagen o archivo subido públicamente
     */
    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> obtenerArchivo(@PathVariable String filename) {
        try {
            Path filePath = this.uploadLocation.resolve(filename).normalize();
            if (!filePath.startsWith(this.uploadLocation)) {
                return ResponseEntity.badRequest().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
