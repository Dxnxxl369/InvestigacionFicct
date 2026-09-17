package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.ConvocatoriaDTO;
import com.ficct.investigacion.model.TipoConvocatoria;
import com.ficct.investigacion.service.ConvocatoriaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/convocatorias")
public class PublicConvocatoriaController {

    private final ConvocatoriaService convocatoriaService;

    public PublicConvocatoriaController(ConvocatoriaService convocatoriaService) {
        this.convocatoriaService = convocatoriaService;
    }

    /**
     * HU-07: Catálogo público y buscador reactivo de eventos abiertos
     */
    @GetMapping
    public ResponseEntity<List<ConvocatoriaDTO>> listarPublicas(
            @RequestParam(required = false) TipoConvocatoria tipo,
            @RequestParam(required = false) String query
    ) {
        List<ConvocatoriaDTO> list = convocatoriaService.listarPublicadas(tipo, query);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPublicById(@PathVariable Long id) {
        try {
            ConvocatoriaDTO c = convocatoriaService.getById(id);
            return ResponseEntity.ok(c);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
