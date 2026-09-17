package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documentos")
public class Documento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(length = 60, nullable = false)
    private String categoria = "TESIS"; // TESIS, FERIA, HACKATHON, INVESTIGACION, OTRO

    @Column(columnDefinition = "TEXT")
    private String contenido = "";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoDocumento estado = EstadoDocumento.BORRADOR;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "autor_id", nullable = false)
    private User autor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convocatoria_id")
    private Convocatoria convocatoria;

    @OneToMany(mappedBy = "documento", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DocumentoColaborador> colaboradores = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Documento() {
    }

    public Documento(String titulo, String descripcion, String categoria, String contenido, User autor, Convocatoria convocatoria) {
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.categoria = categoria != null ? categoria : "TESIS";
        this.contenido = contenido != null ? contenido : "";
        this.autor = autor;
        this.convocatoria = convocatoria;
        this.estado = EstadoDocumento.BORRADOR;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.estado == null) this.estado = EstadoDocumento.BORRADOR;
        if (this.categoria == null) this.categoria = "TESIS";
        if (this.contenido == null) this.contenido = "";
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addColaborador(DocumentoColaborador colab) {
        this.colaboradores.add(colab);
        colab.setDocumento(this);
    }

    public void removeColaborador(DocumentoColaborador colab) {
        this.colaboradores.remove(colab);
        colab.setDocumento(null);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getContenido() {
        return contenido;
    }

    public void setContenido(String contenido) {
        this.contenido = contenido;
    }

    public EstadoDocumento getEstado() {
        return estado;
    }

    public void setEstado(EstadoDocumento estado) {
        this.estado = estado;
    }

    public User getAutor() {
        return autor;
    }

    public void setAutor(User autor) {
        this.autor = autor;
    }

    public Convocatoria getConvocatoria() {
        return convocatoria;
    }

    public void setConvocatoria(Convocatoria convocatoria) {
        this.convocatoria = convocatoria;
    }

    public List<DocumentoColaborador> getColaboradores() {
        return colaboradores;
    }

    public void setColaboradores(List<DocumentoColaborador> colaboradores) {
        this.colaboradores = colaboradores;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
