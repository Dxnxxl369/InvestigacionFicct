package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documento_versiones")
public class DocumentoVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "documento_id", nullable = false)
    private Documento documento;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private User usuario;

    @Column(nullable = false, length = 180)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String contenido;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public DocumentoVersion() {
    }

    public DocumentoVersion(Documento documento, User usuario, String titulo, String contenido) {
        this.documento = documento;
        this.usuario = usuario;
        this.titulo = titulo;
        this.contenido = contenido;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Documento getDocumento() {
        return documento;
    }

    public User getUsuario() {
        return usuario;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getContenido() {
        return contenido;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
