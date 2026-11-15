package com.ficct.investigacion.controller;

import com.ficct.investigacion.dto.ReporteGenerativoDTO.ConsultaRequest;
import com.ficct.investigacion.dto.ReporteGenerativoDTO.ConsultaResponse;
import com.ficct.investigacion.service.ReporteGenerativoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reportes-ia")
public class ReporteGenerativoController {

    private final ReporteGenerativoService reporteService;

    public ReporteGenerativoController(ReporteGenerativoService reporteService) {
        this.reporteService = reporteService;
    }

    @PostMapping("/consultar")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCENTE')")
    public ResponseEntity<ConsultaResponse> consultarReporte(@RequestBody ConsultaRequest request) {
        ConsultaResponse response = reporteService.generarReporte(request);
        return ResponseEntity.ok(response);
    }
}
