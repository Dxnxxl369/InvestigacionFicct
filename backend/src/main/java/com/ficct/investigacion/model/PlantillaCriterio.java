package com.ficct.investigacion.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class PlantillaCriterio {
    @Column(name = "nombre", nullable = false, length = 180)
    private String nombre;
    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;
    @Column(name = "puntaje_maximo", nullable = false)
    private Double puntajeMaximo;

    protected PlantillaCriterio() {}
    public PlantillaCriterio(String nombre, String descripcion, Double puntajeMaximo) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.puntajeMaximo = puntajeMaximo;
    }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
    public Double getPuntajeMaximo() { return puntajeMaximo; }
}
