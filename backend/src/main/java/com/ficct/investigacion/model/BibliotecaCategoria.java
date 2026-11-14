package com.ficct.investigacion.model;

import jakarta.persistence.*;

@Entity
@Table(name = "biblioteca_categorias", uniqueConstraints = @UniqueConstraint(columnNames = "nombre"))
public class BibliotecaCategoria {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String nombre;
    @Column(length = 500)
    private String descripcion;

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}
