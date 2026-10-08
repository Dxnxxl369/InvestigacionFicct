package com.ficct.investigacion.model;

import jakarta.persistence.*;

/**
 * Criterio de la rubrica de evaluacion de una tarea (con su puntaje maximo).
 */
@Entity
@Table(name = "tarea_rubrica_criterios")
public class RubricaCriterio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tarea_id", nullable = false)
    private Tarea tarea;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(length = 600)
    private String descripcion;

    @Column(name = "puntaje_maximo", nullable = false)
    private Double puntajeMaximo;

    @Column(nullable = false)
    private Integer orden = 0;

    public RubricaCriterio() {
    }

    public RubricaCriterio(Tarea tarea, String nombre, String descripcion, Double puntajeMaximo, Integer orden) {
        this.tarea = tarea;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.puntajeMaximo = puntajeMaximo;
        this.orden = orden;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Tarea getTarea() { return tarea; }
    public void setTarea(Tarea tarea) { this.tarea = tarea; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public Double getPuntajeMaximo() { return puntajeMaximo; }
    public void setPuntajeMaximo(Double puntajeMaximo) { this.puntajeMaximo = puntajeMaximo; }
    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
}
