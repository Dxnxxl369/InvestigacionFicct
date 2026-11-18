package com.ficct.investigacion.controller;

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

    public CopilotoController(CopilotoService copilotoService) {
        this.copilotoService = copilotoService;
    }

    @PostMapping("/chat")
    public ResponseEntity<CopilotoDTO.CopilotoResponse> chat(
            @RequestBody CopilotoDTO.CopilotoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(copilotoService.procesarMensaje(request, userDetails.getUsername()));
    }
}
