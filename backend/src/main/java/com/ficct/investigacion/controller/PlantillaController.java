package com.ficct.investigacion.controller;

import com.ficct.investigacion.model.TipoConvocatoria;
import com.ficct.investigacion.service.PlantillaService;
import com.ficct.investigacion.service.PlantillaService.AsignacionDatos;
import com.ficct.investigacion.service.PlantillaService.PlantillaDatos;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/plantillas")
@PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
public class PlantillaController {
    private final PlantillaService service;

    public PlantillaController(PlantillaService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<?> listar() { return ResponseEntity.ok(service.listar()); }

    @GetMapping("/tipos")
    public ResponseEntity<?> tipos() { return ResponseEntity.ok(service.configuracionTipos()); }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody PlantillaDatos datos) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(datos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody PlantillaDatos datos) {
        return ResponseEntity.ok(service.actualizar(id, datos));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.ok(Map.of("message", "Plantilla eliminada."));
    }

    @PutMapping("/tipos/{tipo}")
    public ResponseEntity<?> configurarTipo(@PathVariable TipoConvocatoria tipo,
                                             @RequestBody AsignacionDatos datos) {
        return ResponseEntity.ok(service.configurarTipo(tipo, datos));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> error(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }
}
