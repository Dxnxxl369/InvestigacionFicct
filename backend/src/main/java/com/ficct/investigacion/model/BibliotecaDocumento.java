package com.ficct.investigacion.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "biblioteca_documentos")
public class BibliotecaDocumento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categoria_id")
    private BibliotecaCategoria categoria;
    @Column(nullable = false, length = 200)
    private String titulo;
    @Column(length = 1000)
    private String descripcion;
    @Column(length = 150)
    private String area;
    @Column(length = 30)
    private String nivel;
    @Column(name = "nombre_archivo", nullable = false, length = 255)
    private String nombreArchivo;
    @Column(name = "ruta_archivo", nullable = false, length = 500)
    private String rutaArchivo;
    @Column(name = "ruta_portada", length = 500)
    private String rutaPortada;
    @Column(name = "texto_extraido", columnDefinition = "TEXT")
    private String textoExtraido;
    @Column(nullable = false)
    private boolean publicado;
    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;
    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;

    @PrePersist void crearFechas() { creadoEn = LocalDateTime.now(); actualizadoEn = creadoEn; }
    @PreUpdate void actualizarFecha() { actualizadoEn = LocalDateTime.now(); }
    public Long getId() { return id; }
    public BibliotecaCategoria getCategoria() { return categoria; }
    public void setCategoria(BibliotecaCategoria categoria) { this.categoria = categoria; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }
    public String getNivel() { return nivel; }
    public void setNivel(String nivel) { this.nivel = nivel; }
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    public String getRutaArchivo() { return rutaArchivo; }
    public void setRutaArchivo(String rutaArchivo) { this.rutaArchivo = rutaArchivo; }
    public String getRutaPortada() { return rutaPortada; }
    public void setRutaPortada(String rutaPortada) { this.rutaPortada = rutaPortada; }
    public String getTextoExtraido() { return textoExtraido; }
    public void setTextoExtraido(String textoExtraido) { this.textoExtraido = textoExtraido; }
    public boolean isPublicado() { return publicado; }
    public void setPublicado(boolean publicado) { this.publicado = publicado; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
}
