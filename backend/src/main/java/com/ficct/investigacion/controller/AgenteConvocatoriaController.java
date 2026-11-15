package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.AgenteConvocatoriaDTO.ChatRequest;
import com.ficct.investigacion.dto.AgenteConvocatoriaDTO.ChatResponse;
import com.ficct.investigacion.service.AgenteConvocatoriaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agente/convocatorias")
public class AgenteConvocatoriaController {

    private final AgenteConvocatoriaService agenteService;

    public AgenteConvocatoriaController(AgenteConvocatoriaService agenteService) {
        this.agenteService = agenteService;
    }

    @PostMapping("/chat")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<ChatResponse> procesarChat(@RequestBody ChatRequest request) {
        if (request == null || request.getMensaje() == null || request.getMensaje().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        ChatResponse response = agenteService.procesarMensajeAgente(request);
        return ResponseEntity.ok(response);
    }
}
