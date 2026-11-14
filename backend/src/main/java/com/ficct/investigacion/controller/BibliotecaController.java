package com.ficct.investigacion.controller;

import com.ficct.investigacion.service.BibliotecaService;
import com.ficct.investigacion.service.BibliotecaService.*;
import com.ficct.investigacion.service.BibliotecaValores;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/biblioteca")
@PreAuthorize("hasAnyRole('ADMIN','ESTUDIANTE')")
public class BibliotecaController {
    private final BibliotecaService service;

    public BibliotecaController(BibliotecaService service) { this.service = service; }

    @GetMapping("/filtros")
    public Map<String, Object> filtros() {
        return Map.of("areas", BibliotecaValores.AREAS, "niveles", BibliotecaValores.NIVELES);
    }

    @GetMapping("/categorias")
    public List<CategoriaDatos> categorias() { return service.listarCategorias(); }

    @PostMapping("/categorias")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoriaDatos> crearCategoria(@RequestBody CategoriaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crearCategoria(request));
    }

    @PutMapping("/categorias/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoriaDatos actualizarCategoria(@PathVariable Long id, @RequestBody CategoriaRequest request) {
        return service.actualizarCategoria(id, request);
    }

    @DeleteMapping("/categorias/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> eliminarCategoria(@PathVariable Long id) {
        service.eliminarCategoria(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/documentos")
    public List<DocumentoDatos> buscar(@RequestParam(required = false) String texto,
                                       @RequestParam(required = false) Long categoriaId,
                                       @RequestParam(required = false) String area,
                                       @RequestParam(required = false) String nivel) {
        return service.buscar(texto, categoriaId, area, nivel);
    }

    @GetMapping("/admin/documentos")
    @PreAuthorize("hasRole('ADMIN')")
    public List<DocumentoDatos> listarAdministracion() { return service.listarAdministracion(); }

    @PostMapping(value = "/admin/documentos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DocumentoDatos> crearDocumento(@RequestPart("datos") DocumentoRequest datos,
                                                          @RequestPart("archivo") MultipartFile archivo,
                                                          @RequestPart("portada") MultipartFile portada) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crearDocumento(datos, archivo, portada));
    }

    @PutMapping(value = "/admin/documentos/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public DocumentoDatos actualizarDocumento(@PathVariable Long id, @RequestPart("datos") DocumentoRequest datos,
                                               @RequestPart(value = "archivo", required = false) MultipartFile archivo,
                                               @RequestPart(value = "portada", required = false) MultipartFile portada) {
        return service.actualizarDocumento(id, datos, archivo, portada);
    }

    @DeleteMapping("/admin/documentos/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> eliminarDocumento(@PathVariable Long id) {
        service.eliminarDocumento(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/recomendaciones")
    @PreAuthorize("hasRole('ESTUDIANTE')")
    public List<RecomendacionDatos> recomendaciones(@AuthenticationPrincipal UserDetails usuario) {
        return service.recomendar(usuario.getUsername());
    }

    @GetMapping("/documentos/{id}/archivo")
    public ResponseEntity<Resource> archivo(@PathVariable Long id,
                                            @RequestParam(defaultValue = "false") boolean descargar,
                                            @AuthenticationPrincipal UserDetails usuario) throws MalformedURLException {
        boolean admin = usuario.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        ArchivoDatos datos = service.archivo(id, admin);
        if (!admin) service.registrarAcceso(usuario.getUsername(), id, descargar);
        Resource pdf = new UrlResource(datos.ruta().toUri());
        ContentDisposition disposition = (descargar ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(datos.nombreArchivo(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString()).body(pdf);
    }

    @GetMapping("/documentos/{id}/portada")
    public ResponseEntity<Resource> portada(@PathVariable Long id,
                                            @AuthenticationPrincipal UserDetails usuario) throws MalformedURLException {
        boolean admin = usuario.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        ArchivoDatos datos = service.portada(id, admin);
        Resource imagen = new UrlResource(datos.ruta().toUri());
        String nombre = datos.nombreArchivo();
        MediaType tipo = nombre.endsWith(".png") ? MediaType.IMAGE_PNG
                : nombre.endsWith(".webp") ? MediaType.parseMediaType("image/webp") : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().contentType(tipo).cacheControl(CacheControl.noCache()).body(imagen);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> datosInvalidos(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> noEncontrado(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
    }
}
