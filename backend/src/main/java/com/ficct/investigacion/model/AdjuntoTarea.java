package com.ficct.investigacion.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class AdjuntoTarea {
    @Column(name = "nombre", nullable = false, length = 255)
    private String nombre;

    @Column(name = "ruta", nullable = false, length = 500)
    private String ruta;

    @Column(name = "tamano_bytes")
    private Long tamanoBytes;

    protected AdjuntoTarea() {}

    public AdjuntoTarea(String nombre, String ruta, Long tamanoBytes) {
        this.nombre = nombre;
        this.ruta = ruta;
        this.tamanoBytes = tamanoBytes;
    }

    public String getNombre() { return nombre; }
    public String getRuta() { return ruta; }
    public Long getTamanoBytes() { return tamanoBytes; }
}
