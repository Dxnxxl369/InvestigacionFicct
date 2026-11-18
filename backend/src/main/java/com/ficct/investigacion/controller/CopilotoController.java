package com.ficct.investigacion.controller;

import com.ficct.investigacion.ai.harness.CopilotoConfirmacionService;
import com.ficct.investigacion.dto.CopilotoDTO;
import com.ficct.investigacion.service.CopilotoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/copiloto")
public class CopilotoController {

    private final CopilotoService copilotoService;
    private final CopilotoConfirmacionService confirmacionService;

    public CopilotoController(CopilotoService copilotoService,
                              CopilotoConfirmacionService confirmacionService) {
        this.copilotoService = copilotoService;
        this.confirmacionService = confirmacionService;
    }

    @PostMapping("/chat")
    public ResponseEntity<CopilotoDTO.CopilotoResponse> chat(
            @RequestBody CopilotoDTO.CopilotoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(copilotoService.procesarMensaje(request, userDetails.getUsername()));
    }

    @PostMapping("/confirmar")
    public ResponseEntity<CopilotoDTO.CopilotoResponse> confirmarAccion(
            @RequestBody CopilotoDTO.ConfirmarAccionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(confirmacionService.ejecutarConfirmacion(request, userDetails.getUsername()));
    }
}
