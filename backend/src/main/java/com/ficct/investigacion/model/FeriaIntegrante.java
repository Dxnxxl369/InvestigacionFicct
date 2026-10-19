package com.ficct.investigacion.model;

import jakarta.persistence.*;

@Embeddable
public class FeriaIntegrante {
    @Column(name = "registro", length = 30)
    private String registro;
    @Column(name = "nombre", nullable = false, length = 180)
    private String nombre;
    @Column(name = "carrera", nullable = false, length = 120)
    private String carrera;
    @Column(name = "celular", nullable = false, length = 30)
    private String celular;
    @Column(name = "semestre", nullable = false)
    private Integer semestre;
    @Column(name = "ferias", nullable = false)
    private Integer ferias;
    @Column(name = "correo", nullable = false, length = 120)
    private String correo;

    public FeriaIntegrante() {}

    public FeriaIntegrante(String registro, String nombre, String carrera, String celular,
                          Integer semestre, Integer ferias, String correo) {
        this.registro = registro;
        this.nombre = nombre;
        this.carrera = carrera;
        this.celular = celular;
        this.semestre = semestre;
        this.ferias = ferias;
        this.correo = correo;
    }

    public String getRegistro() { return registro; }
    public String getNombre() { return nombre; }
    public String getCarrera() { return carrera; }
    public String getCelular() { return celular; }
    public Integer getSemestre() { return semestre; }
    public Integer getFerias() { return ferias; }
    public String getCorreo() { return correo; }
}
