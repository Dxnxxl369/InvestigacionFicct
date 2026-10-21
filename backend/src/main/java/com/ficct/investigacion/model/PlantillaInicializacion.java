package com.ficct.investigacion.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "plantilla_inicializacion")
public class PlantillaInicializacion {
    @Id
    private Integer id;
    public PlantillaInicializacion() {}
    public PlantillaInicializacion(Integer id) { this.id = id; }
    public Integer getId() { return id; }
}
