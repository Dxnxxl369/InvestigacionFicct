package com.ficct.investigacion.controller;

import com.ficct.investigacion.service.EvaluacionJuradoService;
import com.ficct.investigacion.service.EvaluacionJuradoService.Formulario;
import com.ficct.investigacion.service.EvaluacionJuradoService.Respuestas;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class EvaluacionJuradoController {
    private final EvaluacionJuradoService service;

    public EvaluacionJuradoController(EvaluacionJuradoService service) { this.service = service; }

    @GetMapping("/convocatorias/{convocatoriaId}/jurados/formulario")
    public Formulario formulario(@PathVariable Long convocatoriaId, @AuthenticationPrincipal UserDetails usuario) {
        return service.obtenerFormulario(convocatoriaId, usuario.getUsername());
    }

    @PutMapping("/convocatorias/{convocatoriaId}/jurados/formulario")
    public Formulario guardarFormulario(@PathVariable Long convocatoriaId, @RequestBody Formulario datos,
                                        @AuthenticationPrincipal UserDetails usuario) {
        return service.guardarFormulario(convocatoriaId, datos, usuario.getUsername());
    }

    @GetMapping("/convocatorias/{convocatoriaId}/jurados/calificaciones")
    public Object calificaciones(@PathVariable Long convocatoriaId, @AuthenticationPrincipal UserDetails usuario) {
        return service.calificaciones(convocatoriaId, usuario.getUsername());
    }

    @GetMapping("/jurado/grupos")
    public Object misGrupos(@AuthenticationPrincipal UserDetails usuario) {
        return service.misGrupos(usuario.getUsername());
    }

    @GetMapping("/jurado/convocatorias/{convocatoriaId}/grupos/{tipo}/{proyectoId}")
    public Object detalle(@PathVariable Long convocatoriaId, @PathVariable String tipo,
                          @PathVariable Long proyectoId, @AuthenticationPrincipal UserDetails usuario) {
        return service.detalle(convocatoriaId, tipo, proyectoId, usuario.getUsername());
    }

    @PostMapping("/jurado/convocatorias/{convocatoriaId}/grupos/{tipo}/{proyectoId}/evaluacion")
    public ResponseEntity<?> evaluar(@PathVariable Long convocatoriaId, @PathVariable String tipo,
                                     @PathVariable Long proyectoId, @RequestBody Respuestas respuestas,
                                     @AuthenticationPrincipal UserDetails usuario) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.enviar(convocatoriaId, tipo, proyectoId, respuestas, usuario.getUsername()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalido(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> denegado(AccessDeniedException error) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", error.getMessage()));
    }
}
