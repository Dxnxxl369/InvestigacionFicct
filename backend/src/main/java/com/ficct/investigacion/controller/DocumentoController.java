package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.ColaboradorRequest;
import com.ficct.investigacion.dto.DocumentoDTO;
import com.ficct.investigacion.dto.DocumentoRequest;
import com.ficct.investigacion.dto.DocumentoVersionDTO;
import com.ficct.investigacion.service.DocumentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documentos")
public class DocumentoController {

    private final DocumentoService documentoService;

    public DocumentoController(DocumentoService documentoService) {
        this.documentoService = documentoService;
    }

    @GetMapping
    public ResponseEntity<List<DocumentoDTO>> listar(@AuthenticationPrincipal UserDetails userDetails) {
        List<DocumentoDTO> lista = documentoService.listarAccesibles(userDetails.getUsername());
        return ResponseEntity.ok(lista);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerPorId(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            DocumentoDTO doc = documentoService.obtenerPorId(id, userDetails.getUsername());
            return ResponseEntity.ok(doc);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody DocumentoRequest request,
                                  @AuthenticationPrincipal UserDetails userDetails) {
        try {
            DocumentoDTO creado = documentoService.crear(request, userDetails.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED).body(creado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id,
                                       @Valid @RequestBody DocumentoRequest request,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        try {
            DocumentoDTO actualizado = documentoService.actualizar(id, request, userDetails.getUsername());
            return ResponseEntity.ok(actualizado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            documentoService.eliminar(id, userDetails.getUsername());
            return ResponseEntity.ok(Map.of("mensaje", "Documento eliminado con exito"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/colaboradores")
    public ResponseEntity<?> asignarColaborador(@PathVariable Long id,
                                               @Valid @RequestBody ColaboradorRequest request,
                                               @AuthenticationPrincipal UserDetails userDetails) {
        try {
            DocumentoDTO actualizado = documentoService.asignarColaborador(id, request, userDetails.getUsername());
            return ResponseEntity.ok(actualizado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/colaboradores/{colaboradorId}")
    public ResponseEntity<?> removerColaborador(@PathVariable Long id,
                                               @PathVariable Long colaboradorId,
                                               @AuthenticationPrincipal UserDetails userDetails) {
        try {
            DocumentoDTO actualizado = documentoService.removerColaborador(id, colaboradorId, userDetails.getUsername());
            return ResponseEntity.ok(actualizado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/versiones")
    public ResponseEntity<?> listarVersiones(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<DocumentoVersionDTO> versiones = documentoService.listarVersiones(id, userDetails.getUsername());
            return ResponseEntity.ok(versiones);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/versiones/{versionId}/restaurar")
    public ResponseEntity<?> restaurarVersion(@PathVariable Long id,
                                              @PathVariable Long versionId,
                                              @AuthenticationPrincipal UserDetails userDetails) {
        try {
            DocumentoDTO restaurado = documentoService.restaurarVersion(id, versionId, userDetails.getUsername());
            return ResponseEntity.ok(restaurado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage()));
        }
    }
}
