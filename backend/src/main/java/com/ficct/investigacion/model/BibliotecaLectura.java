package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "biblioteca_lecturas", uniqueConstraints =
        @UniqueConstraint(columnNames = {"usuario_id", "documento_id"}))
public class BibliotecaLectura {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;
    @Column(name = "documento_id", nullable = false)
    private Long documentoId;
    @Column(nullable = false)
    private int aperturas;
    @Column(name = "descargas")
    private Integer descargas = 0;
    @Column(name = "ultimo_acceso", nullable = false)
    private LocalDateTime ultimoAcceso;

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public Long getDocumentoId() { return documentoId; }
    public void setDocumentoId(Long documentoId) { this.documentoId = documentoId; }
    public int getAperturas() { return aperturas; }
    public int getDescargas() { return descargas == null ? 0 : descargas; }
    public void registrarAcceso(boolean descarga) {
        aperturas = Math.min(aperturas + 1, 20);
        if (descarga) descargas = Math.min(getDescargas() + 1, 20);
        ultimoAcceso = LocalDateTime.now();
    }
    public LocalDateTime getUltimoAcceso() { return ultimoAcceso; }
}
